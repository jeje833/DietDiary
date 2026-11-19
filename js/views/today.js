// 오늘 탭: 주간 날짜, 달성률, 시간대별 루틴, 체중·물·운동·식단·한 줄 일기
import {
  S, update, routinesForDate, dayStats, statusOf, setStatus, mealTotals, calorieGoal,
  workoutFor, workoutStats, latestWeight, currentStreak, slotTotals,
} from '../store.js';
import { SLOTS, colorOf, MEAL_SLOTS, MOODS } from '../data/templates.js';
import { ctx } from '../ctx.js';
import { esc, fmtDate, todayKey, num, hexA, vibrate, debounce } from '../utils.js';
import { ICON, toast } from '../ui.js';
import { dateStrip, rateClass } from '../components/datestrip.js';
import { ring, meter } from '../components/charts.js';
import { openRoutineEditor, openRoutineMenu, openTemplatePicker, routineMeta, playRoutines } from './routine-sheets.js';
import { waterCard, waterActions, weightCard, weightActions } from './shared.js';

function titleFor(key) {
  const today = todayKey();
  const name = S().profile.name;
  if (key === today) return name ? `${esc(name)}님의 오늘` : '오늘의 루틴';
  return key < today ? '지난 기록' : '예정된 루틴';
}

function message(st, key) {
  const today = todayKey();
  const streak = currentStreak();
  if (st.total === 0) return '루틴을 추가하고 하루를 설계해 보세요';
  if (key > today) return '미리 확인하고 준비해요';
  if (st.rate === 1) return '🎉 모든 루틴 완료! 멋져요';
  if (key === today && streak > 1) return `🔥 ${streak}일 연속 실천 중`;
  if (st.done === 0) return key === today ? '첫 번째 루틴부터 가볍게 시작해요' : '이 날은 기록이 없어요';
  return `${st.total - st.skip - st.done}개 남았어요. 조금만 더!`;
}

function routineItem(r, key) {
  const st = statusOf(key, r.id);
  const c = colorOf(r.color);
  return `<div class="routine ${st || ''}" style="--c:${c};--c-soft:${hexA(c, 0.15)}">
    <button type="button" class="r-main" data-action="routineMenu" data-id="${r.id}">
      <span class="r-emoji">${esc(r.emoji)}</span>
      <span class="r-text"><b>${esc(r.title)}</b><small>${esc(routineMeta(r, st))}</small></span>
    </button>
    <button type="button" class="check" data-action="toggleRoutine" data-id="${r.id}" aria-label="${esc(r.title)} 완료" aria-pressed="${st === 'done'}">${ICON.check}</button>
  </div>`;
}

function routineGroups(key) {
  const list = routinesForDate(key);
  const today = todayKey();
  if (!S().routines.some((r) => !r.endKey)) {
    return `<section class="card empty">
      <div class="empty-emoji">🌱</div>
      <h3>아직 루틴이 없어요</h3>
      <p>매일 반복할 다이어트 습관을 만들어 보세요.</p>
      <div class="btn-row">
        <button type="button" class="btn secondary" data-action="templates">추천 루틴 보기</button>
        <button type="button" class="btn" data-action="addRoutine">직접 만들기</button>
      </div></section>`;
  }
  if (!list.length) {
    return `<section class="card empty sm"><p>이 날은 예정된 루틴이 없어요 😌</p>
      <button type="button" class="btn ghost" data-action="addRoutine">${ICON.plus} 루틴 추가</button></section>`;
  }
  return SLOTS.map((slot) => {
    const items = list.filter((r) => r.slot === slot.id);
    if (!items.length) return '';
    const done = items.filter((r) => statusOf(key, r.id) === 'done').length;
    const remaining = items.filter((r) => !statusOf(key, r.id));
    const canPlay = key <= today && remaining.length > 0;
    return `<section class="r-group">
      <div class="rg-head">
        <span class="rg-title">${slot.emoji} ${slot.label}</span>
        <span class="rg-count">${done}/${items.length}</span>
        ${canPlay ? `<button type="button" class="play-chip" data-action="playSlot" data-slot="${slot.id}">${ICON.play}<span>루틴 시작</span></button>` : ''}
      </div>
      <div class="r-list">${items.map((r) => routineItem(r, key)).join('')}</div>
    </section>`;
  }).join('');
}

function workoutCard(key) {
  const { src, w } = workoutFor(key);
  if (src === 'none') {
    return `<button type="button" class="card qc wide link" data-action="go" data-tab="workout">
      <div class="qc-head"><span>🏋️ 운동</span><span class="chev">${ICON.right}</span></div>
      <b class="qc-title">휴식일 😌</b><small class="qc-sub">운동 탭에서 주간 계획을 세워보세요</small></button>`;
  }
  const st = workoutStats(w, latestWeight(key));
  return `<button type="button" class="card qc wide link" data-action="go" data-tab="workout">
    <div class="qc-head"><span>🏋️ 운동</span><span class="chev">${ICON.right}</span></div>
    <b class="qc-title">${esc(w.title || '오늘의 운동')}</b>
    <small class="qc-sub">${st.done}/${st.total}세트 · ${st.done ? `${num(st.kcal)}kcal 소모` : `예상 ${st.planMinutes}분`}</small>
    ${meter(st.done, st.total, { color: 'var(--exercise)' })}
  </button>`;
}

function mealCard(key) {
  const t = mealTotals(key);
  const goal = calorieGoal();
  return `<button type="button" class="card qc wide link" data-action="go" data-tab="meals">
    <div class="qc-head"><span>🍽️ 식단</span><span class="chev">${ICON.right}</span></div>
    <div class="meal-mini">${MEAL_SLOTS.map((m) => {
      const k = slotTotals(key, m.id).kcal;
      return `<div><span>${m.emoji}</span><small>${m.label}</small><b>${k ? num(k) : '—'}</b></div>`;
    }).join('')}</div>
    ${meter(t.kcal, goal, { color: 'var(--primary)' })}
    <small class="qc-sub">${num(t.kcal)} / ${num(goal)} kcal</small>
  </button>`;
}

function diaryCard(key) {
  const d = S().diary[key] || {};
  return `<div class="card qc wide">
    <div class="qc-head"><span>📝 오늘의 한 줄</span></div>
    <div class="moods">${MOODS.map((m) => `<button type="button" class="mood ${d.mood === m.v ? 'on' : ''}" data-action="setMood" data-v="${m.v}" aria-label="${m.label}"><span>${m.emoji}</span><small>${m.label}</small></button>`).join('')}</div>
    <textarea class="input" rows="2" maxlength="500" placeholder="오늘 식단과 운동은 어땠나요?" data-input="diaryText" data-change="diaryFlush">${esc(d.text || '')}</textarea>
  </div>`;
}

export function render() {
  const key = ctx.date;
  const st = dayStats(key);
  const t = mealTotals(key);
  const goal = calorieGoal();
  const water = S().water[key] || 0;
  const { w } = workoutFor(key);
  const burn = w ? workoutStats(w, latestWeight(key)).kcal : 0;
  const pct = Math.round((st.rate ?? 0) * 100);
  const today = todayKey();
  return `
  <header class="page-head">
    <div><p class="eyebrow">${fmtDate(key)}</p><h1>${titleFor(key)}</h1></div>
    <button type="button" class="icon-btn primary" data-action="addRoutine" aria-label="루틴 추가">${ICON.plus}</button>
  </header>
  ${dateStrip(key, (k) => {
    if (k > today) return null;
    const s = dayStats(k);
    if (s.rate == null || (k === today && s.done === 0)) return null;
    return { cls: rateClass(s.rate) };
  })}
  <section class="card summary">
    ${ring(st.rate ?? 0, { size: 96, stroke: 10, inner: `<b>${pct}<i>%</i></b><small>달성</small>`, label: `루틴 달성률 ${pct}%` })}
    <div class="sum-right">
      <p class="sum-line"><b>${st.done}</b> / ${st.total - st.skip}개 루틴 완료${st.skip ? ` <small>· 쉼 ${st.skip}</small>` : ''}</p>
      <p class="sum-sub">${message(st, key)}</p>
      <div class="sum-chips">
        <button type="button" class="mini" data-action="go" data-tab="meals">🍽️ <b>${num(t.kcal)}</b><small>/${num(goal)}</small></button>
        <button type="button" class="mini" data-action="go" data-tab="workout">🔥 <b>${num(burn)}</b><small>kcal</small></button>
        <span class="mini">💧 <b>${water}</b><small>/${S().profile.waterGoal}잔</small></span>
      </div>
    </div>
  </section>
  ${routineGroups(key)}
  <h2 class="section-title">오늘의 기록</h2>
  <div class="grid2">${weightCard(key)}${waterCard(key)}</div>
  ${mealCard(key)}
  ${workoutCard(key)}
  ${diaryCard(key)}`;
}

function writeDiary(key, text) {
  update(
    (s) => {
      s.diary[key] = { ...(s.diary[key] || {}), text };
      if (!s.diary[key].text && !s.diary[key].mood) delete s.diary[key];
    },
    { silent: true },
  );
}
const saveDiary = debounce(writeDiary, 300);

export const actions = {
  ...waterActions,
  ...weightActions,
  addRoutine: () => openRoutineEditor(),
  templates: () => openTemplatePicker(),
  routineMenu: (b) => openRoutineMenu(b.dataset.id, ctx.date),
  toggleRoutine: (b) => {
    const key = ctx.date;
    if (key > todayKey()) {
      toast('아직 오지 않은 날이에요');
      return;
    }
    const id = b.dataset.id;
    const st = statusOf(key, id);
    const next = st === 'done' ? null : 'done';
    update((s) => setStatus(key, id, next));
    if (next) {
      vibrate(30);
      const ds = dayStats(key);
      if (ds.rate === 1) toast('🎉 오늘의 루틴을 모두 완료했어요!');
    }
  },
  playSlot: (b) => {
    const key = ctx.date;
    const slot = SLOTS.find((x) => x.id === b.dataset.slot);
    const list = routinesForDate(key).filter((r) => r.slot === slot.id && !statusOf(key, r.id));
    playRoutines(list, `${slot.label} 루틴`, key);
  },
  go: (b) => ctx.go(b.dataset.tab),
  setMood: (b) => {
    const key = ctx.date;
    const v = Number(b.dataset.v);
    update((s) => {
      const d = (s.diary[key] ||= {});
      d.mood = d.mood === v ? 0 : v;
      if (!d.text && !d.mood) delete s.diary[key];
    });
  },
  diaryText: (i) => saveDiary(ctx.date, i.value),
  diaryFlush: (i) => writeDiary(ctx.date, i.value),
};
