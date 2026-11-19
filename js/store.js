// 앱 상태 저장소 (localStorage) + 계산 로직
import { todayKey, uid, weekdayOf, clone, addDays } from './utils.js';
import { SLOT_ORDER, SAMPLE_PLAN, ROUTINE_TEMPLATES } from './data/templates.js';
import { findExercise, EXERCISES } from './data/exercises.js';

export const STORAGE_KEY = 'dietdiary:v1';

const emptyPlan = () => {
  const p = {};
  for (let i = 0; i < 7; i++) p[i] = { title: '', exercises: [] };
  return p;
};

export function defaultState() {
  return {
    version: 1,
    onboarded: false,
    profile: {
      name: '',
      sex: 'f',
      age: 30,
      height: 163,
      startWeight: 60,
      goalWeight: 55,
      activity: 1.375,
      pace: 0.5,
      calorieGoal: 0, // 0 = 자동 계산
      waterGoal: 8,
      startDate: todayKey(),
    },
    routines: [],
    checks: {}, // { 'YYYY-MM-DD': { routineId: 'done' | 'skip' } }
    meals: {}, // { date: { breakfast: [item], lunch: [], dinner: [], snack: [] } }
    mealPhotos: {}, // { date: { slot: true } } — 사진 본체는 IndexedDB
    water: {}, // { date: 잔 수 }
    weights: {}, // { date: kg }
    plan: emptyPlan(), // 요일별 운동 계획 (0=일)
    workouts: {}, // { date: { title, exercises, note } }
    diary: {}, // { date: { mood, text } }
    customFoods: [],
    recentFoods: [],
    settings: { theme: 'system', notify: false, restSec: 60, weekStart: 1 },
  };
}

function migrate(s) {
  const d = defaultState();
  const out = { ...d, ...s };
  out.profile = { ...d.profile, ...(s.profile || {}) };
  out.settings = { ...d.settings, ...(s.settings || {}) };
  out.plan = { ...emptyPlan(), ...(s.plan || {}) };
  for (const k of ['routines', 'customFoods', 'recentFoods']) if (!Array.isArray(out[k])) out[k] = [];
  return out;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

let state = load();
const listeners = new Set();
let saveErrorHandler = null;

export const getState = () => state;
export const S = () => state;

export function onSaveError(fn) {
  saveErrorHandler = fn;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    saveErrorHandler?.(e);
  }
}

/** 상태 변경. silent=true 이면 화면을 다시 그리지 않음 (입력 중 포커스 유지용) */
export function update(fn, { silent = false } = {}) {
  fn(state);
  save();
  if (!silent) emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  listeners.forEach((fn) => fn(state));
}

export function replaceState(next) {
  state = migrate(next);
  save();
  emit();
}

export function resetState() {
  state = defaultState();
  save();
  emit();
}

// 다른 탭에서 데이터가 바뀌면 동기화
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      state = migrate(JSON.parse(e.newValue));
      emit();
    } catch {
      /* 무시 */
    }
  }
});

/* ───────────── 루틴 ───────────── */

export function makeRoutine(data = {}) {
  return {
    id: uid(),
    title: '',
    emoji: '✅',
    color: 'green',
    cat: 'life',
    slot: 'morning',
    days: [0, 1, 2, 3, 4, 5, 6],
    time: '',
    duration: 0,
    memo: '',
    startKey: todayKey(),
    endKey: '',
    order: Date.now(),
    ...data,
  };
}

export const routinesFromTemplates = (idxs) =>
  idxs.map((i, n) => {
    const t = ROUTINE_TEMPLATES[i];
    return makeRoutine({ ...t, order: Date.now() + n });
  });

export function routineActiveOn(r, key) {
  if (r.startKey && key < r.startKey) return false;
  if (r.endKey && key >= r.endKey) return false;
  return r.days.includes(weekdayOf(key));
}

const timeSort = (t) => t || '99:99';

export function routinesForDate(key) {
  return state.routines
    .filter((r) => routineActiveOn(r, key))
    .sort(
      (a, b) =>
        SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] ||
        timeSort(a.time).localeCompare(timeSort(b.time)) ||
        a.order - b.order,
    );
}

export const activeRoutines = () => state.routines.filter((r) => !r.endKey);

export const statusOf = (key, rid) => state.checks[key]?.[rid] || null;

export function setStatus(key, rid, status) {
  state.checks[key] ||= {};
  if (status) state.checks[key][rid] = status;
  else delete state.checks[key][rid];
  if (!Object.keys(state.checks[key]).length) delete state.checks[key];
}

/** rate: 완료/(전체-쉼). 루틴이 없거나 모두 쉼이면 null */
export function dayStats(key) {
  const list = routinesForDate(key);
  let done = 0;
  let skip = 0;
  for (const r of list) {
    const st = statusOf(key, r.id);
    if (st === 'done') done++;
    else if (st === 'skip') skip++;
  }
  const total = list.length;
  const denom = total - skip;
  return { total, done, skip, rate: denom > 0 ? done / denom : null };
}

export function deleteRoutine(id) {
  const hasHistory = Object.values(state.checks).some((day) => day[id]);
  if (hasHistory) {
    const r = state.routines.find((x) => x.id === id);
    if (r) r.endKey = todayKey();
  } else {
    state.routines = state.routines.filter((x) => x.id !== id);
  }
}

/** 오늘까지 연속으로 루틴을 1개 이상 완료한 날 수 */
export function currentStreak(today = todayKey()) {
  let streak = 0;
  let k = today;
  const done = (key) => Object.values(state.checks[key] || {}).includes('done');
  if (!done(k)) k = addDays(k, -1); // 오늘 아직 안 했으면 어제부터 셈
  for (let i = 0; i < 3650 && done(k); i++) {
    streak++;
    k = addDays(k, -1);
  }
  return streak;
}

/* ───────────── 몸 / 칼로리 ───────────── */

export function latestWeight(upto = todayKey()) {
  const keys = Object.keys(state.weights).filter((k) => k <= upto).sort();
  return keys.length ? state.weights[keys[keys.length - 1]] : state.profile.startWeight;
}

/** Mifflin-St Jeor 공식으로 기초대사량/활동대사량/권장 섭취량 계산 (순수 함수) */
export function energyFor(p, w) {
  const base = 10 * w + 6.25 * p.height - 5 * p.age;
  const bmrV = p.sex === 'm' ? base + 5 : base - 161;
  const tdeeV = bmrV * p.activity;
  const min = p.sex === 'm' ? 1500 : 1200;
  const goal = tdeeV - p.pace * 1100; // 지방 1kg ≈ 7,700kcal → 주 1kg 감량 = 하루 1,100kcal 적자
  return { bmr: bmrV, tdee: tdeeV, goal: Math.round(Math.max(goal, min) / 10) * 10, floor: goal < min };
}

export const bmr = (w = latestWeight()) => energyFor(state.profile, w).bmr;
export const tdee = (w = latestWeight()) => energyFor(state.profile, w).tdee;
export const autoCalorieGoal = (w = latestWeight()) => energyFor(state.profile, w).goal;

export const calorieGoal = () =>
  state.profile.calorieGoal > 0 ? state.profile.calorieGoal : autoCalorieGoal();

export function macroTargets(goal = calorieGoal()) {
  return {
    c: Math.round((goal * 0.45) / 4),
    p: Math.round((goal * 0.3) / 4),
    f: Math.round((goal * 0.25) / 9),
  };
}

export const bmi = (w, h) => w / (h / 100) ** 2;

export function bmiLabel(b) {
  if (b < 18.5) return { label: '저체중', tone: 'warn' };
  if (b < 23) return { label: '정상', tone: 'good' };
  if (b < 25) return { label: '비만 전단계', tone: 'warn' };
  if (b < 30) return { label: '1단계 비만', tone: 'bad' };
  if (b < 35) return { label: '2단계 비만', tone: 'bad' };
  return { label: '3단계 비만', tone: 'bad' };
}

/* ───────────── 식단 ───────────── */

export function dayMeals(key, create = false) {
  if (!state.meals[key] && create) state.meals[key] = { breakfast: [], lunch: [], dinner: [], snack: [] };
  return state.meals[key] || { breakfast: [], lunch: [], dinner: [], snack: [] };
}

const sumItems = (items) =>
  items.reduce(
    (t, it) => {
      const q = Number(it.qty) || 0;
      t.kcal += (Number(it.kcal) || 0) * q;
      t.c += (Number(it.c) || 0) * q;
      t.p += (Number(it.p) || 0) * q;
      t.f += (Number(it.f) || 0) * q;
      t.count++;
      return t;
    },
    { kcal: 0, c: 0, p: 0, f: 0, count: 0 },
  );

export const slotTotals = (key, slot) => sumItems(dayMeals(key)[slot] || []);

export function mealTotals(key) {
  const d = dayMeals(key);
  return sumItems([...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || []), ...(d.snack || [])]);
}

export function pushRecentFood(food) {
  const id = food.id;
  state.recentFoods = [id, ...state.recentFoods.filter((x) => x !== id)].slice(0, 30);
}

/* ───────────── 운동 ───────────── */

export function makeExercise(def, override = {}) {
  const dd = { ...(def.def || {}), ...override };
  const n = dd.sets || 3;
  const sets = Array.from({ length: n }, () => {
    if (def.kind === 'time') return { min: dd.min ?? 10, done: false };
    if (def.kind === 'weight') return { kg: dd.kg ?? 0, reps: dd.reps ?? 10, done: false };
    return { reps: dd.reps ?? 10, done: false };
  });
  return { id: uid(), name: def.name, emoji: def.emoji, cat: def.cat, kind: def.kind, met: def.met, sets };
}

export function samplePlan() {
  const plan = emptyPlan();
  for (const [wd, p] of Object.entries(SAMPLE_PLAN)) {
    plan[wd] = {
      title: p.title,
      exercises: p.items
        .map(([name, ov]) => {
          const def = findExercise(name);
          return def ? makeExercise(def, ov) : null;
        })
        .filter(Boolean),
    };
  }
  return plan;
}

export function workoutFor(key) {
  if (state.workouts[key]) return { src: 'log', w: state.workouts[key] };
  const p = state.plan[weekdayOf(key)];
  if (p && p.exercises.length) return { src: 'plan', w: p };
  return { src: 'none', w: null };
}

/** 해당 날짜의 운동 기록을 (없으면 주간 계획에서 복사해) 만들어 반환 — update() 안에서 호출 */
export function ensureWorkout(key) {
  if (!state.workouts[key]) {
    const p = state.plan[weekdayOf(key)] || { title: '', exercises: [] };
    state.workouts[key] = {
      title: p.title || '',
      // id 는 계획과 동일하게 유지 (화면의 입력칸이 계획 기준 id 를 들고 있을 수 있음)
      exercises: clone(p.exercises).map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: false })) })),
      note: '',
    };
  }
  return state.workouts[key];
}

export const SET_MIN_ESTIMATE = 2; // 근력 1세트 ≈ 휴식 포함 2분

export function workoutStats(w, weight = latestWeight()) {
  const out = { total: 0, done: 0, minutes: 0, planMinutes: 0, kcal: 0, planKcal: 0 };
  if (!w) return out;
  for (const ex of w.exercises) {
    for (const s of ex.sets) {
      const m = ex.kind === 'time' ? Number(s.min) || 0 : SET_MIN_ESTIMATE;
      const kcal = ((ex.met || 4) * weight * m) / 60;
      out.total++;
      out.planMinutes += m;
      out.planKcal += kcal;
      if (s.done) {
        out.done++;
        out.minutes += m;
        out.kcal += kcal;
      }
    }
  }
  out.minutes = Math.round(out.minutes);
  out.planMinutes = Math.round(out.planMinutes);
  out.kcal = Math.round(out.kcal);
  out.planKcal = Math.round(out.planKcal);
  return out;
}

export function burnedOn(key) {
  const w = state.workouts[key];
  return w ? workoutStats(w, latestWeight(key)).kcal : 0;
}

export const exerciseLibrary = () => EXERCISES;
