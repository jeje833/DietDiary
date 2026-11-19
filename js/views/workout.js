// 운동 탭: 요일별 주간 계획 + 날짜별 실행(세트 체크, 휴식 타이머, 시간 운동 타이머)
import { S, update, workoutFor, ensureWorkout, workoutStats, latestWeight, makeExercise, samplePlan } from '../store.js';
import { EXERCISES, EX_CATS, KIND_LABEL, KIND_MET } from '../data/exercises.js';
import { ctx } from '../ctx.js';
import { esc, fmtDate, num, r1, WD, weekdayOf, todayKey, vibrate, uid, matchKo, clone } from '../utils.js';
import { ICON, openSheet, toast, confirmBox } from '../ui.js';
import { dateStrip } from '../components/datestrip.js';
import { meter } from '../components/charts.js';
import { startRest } from '../resttimer.js';
import { startPlayer } from '../player.js';
import { weekOrder } from './routine-sheets.js';

/* ───────── 운동 카드 (실행/편집 공용) ───────── */

function setRow(ex, s, i, mode) {
  const run = mode === 'run';
  const field = (k, unit, step, w = '') =>
    `<label class="set-field ${w}"><input type="number" inputmode="decimal" step="${step}" min="0" value="${esc(s[k] ?? '')}" data-change="setVal" data-ex="${ex.id}" data-i="${i}" data-k="${k}" aria-label="${unit}"><span>${unit}</span></label>`;
  let fields = '';
  if (ex.kind === 'weight') fields = field('kg', 'kg', '0.5') + '<span class="x">×</span>' + field('reps', '회', '1');
  else if (ex.kind === 'reps') fields = field('reps', '회', '1', 'wide');
  else fields = field('min', '분', '0.5', 'wide');
  return `<div class="set-row ${run && s.done ? 'done' : ''}">
    <span class="set-no">${i + 1}</span>
    ${fields}
    ${run && ex.kind === 'time' && !s.done ? `<button type="button" class="icon-btn sm soft" data-action="timeSet" data-ex="${ex.id}" data-i="${i}" aria-label="타이머 시작">${ICON.play}</button>` : ''}
    ${run ? `<button type="button" class="check" data-action="toggleSet" data-ex="${ex.id}" data-i="${i}" aria-label="${i + 1}세트 완료" aria-pressed="${!!s.done}">${ICON.check}</button>` : `<button type="button" class="icon-btn sm ghost" data-action="delSet" data-ex="${ex.id}" data-i="${i}" aria-label="세트 삭제">${ICON.minus}</button>`}
  </div>`;
}

export function exerciseCard(ex, mode = 'run') {
  const done = ex.sets.filter((s) => s.done).length;
  const allDone = mode === 'run' && ex.sets.length > 0 && done === ex.sets.length;
  return `<article class="card ex ${allDone ? 'all-done' : ''}">
    <div class="ex-head">
      <span class="ex-emoji">${esc(ex.emoji || '🏋️')}</span>
      <div class="ex-title"><b>${esc(ex.name)}</b><small>${esc(ex.cat || '')} · ${KIND_LABEL[ex.kind]}${mode === 'run' ? ` · ${done}/${ex.sets.length}세트` : ` · ${ex.sets.length}세트`}</small></div>
      <button type="button" class="icon-btn sm ghost" data-action="exMenu" data-ex="${ex.id}" aria-label="운동 메뉴">${ICON.more}</button>
    </div>
    <div class="sets">${ex.sets.map((s, i) => setRow(ex, s, i, mode)).join('')}</div>
    <button type="button" class="add-set" data-action="addSet" data-ex="${ex.id}">${ICON.plus} 세트 추가</button>
  </article>`;
}

/* ───────── 화면 ───────── */

function weekPlanStrip() {
  const plan = S().plan;
  const sel = weekdayOf(ctx.date);
  return `<div class="week-plan hscroll">${weekOrder()
    .map((d) => {
      const p = plan[d];
      const rest = !p.exercises.length;
      return `<button type="button" class="wp-day ${d === sel ? 'sel' : ''} ${rest ? 'rest' : ''}" data-action="editPlan" data-wd="${d}">
        <span class="wp-wd">${WD[d]}</span><span class="wp-t">${rest ? '휴식' : esc(p.title || `${p.exercises.length}개 운동`)}</span></button>`;
    })
    .join('')}</div>`;
}

export function render() {
  const key = ctx.date;
  const { src, w } = workoutFor(key);
  const weight = latestWeight(key);
  const st = workoutStats(w, weight);
  const wd = weekdayOf(key);
  const head = `
  <header class="page-head">
    <div><p class="eyebrow">${fmtDate(key)}</p><h1>운동</h1></div>
    <button type="button" class="icon-btn" data-action="editPlan" data-wd="${wd}" aria-label="주간 계획 편집">${ICON.calendar}</button>
  </header>
  ${dateStrip(key, (k) => {
    const r = workoutFor(k);
    if (r.src === 'none') return null;
    if (r.src === 'log') {
      const s = workoutStats(r.w);
      if (s.done > 0) return { cls: s.done === s.total ? 'done' : 'part' };
    }
    return { cls: 'plan' };
  })}
  <div class="section-row"><h2 class="section-title">주간 운동 계획</h2><button type="button" class="link-btn" data-action="editPlan" data-wd="${wd}">편집</button></div>
  ${weekPlanStrip()}`;

  if (src === 'none') {
    return `${head}
    <section class="card empty">
      <div class="empty-emoji">😌</div>
      <h3>${WD[wd]}요일은 휴식일이에요</h3>
      <p>충분한 휴식도 다이어트의 일부예요.<br>운동하고 싶다면 바로 추가할 수 있어요.</p>
      <div class="btn-row">
        <button type="button" class="btn secondary" data-action="editPlan" data-wd="${wd}">주간 계획 짜기</button>
        <button type="button" class="btn" data-action="addEx">${ICON.plus} 오늘 운동 추가</button>
      </div>
    </section>`;
  }

  const pct = st.total ? st.done / st.total : 0;
  return `${head}
  <section class="card workout-sum">
    <div class="ws-top">
      <div><small>${src === 'plan' ? `${WD[wd]}요일 계획` : '오늘의 운동'}</small>
        <input class="title-input" value="${esc(w.title || '')}" placeholder="운동 이름 (예: 하체 데이)" maxlength="24" data-change="title" aria-label="운동 제목"></div>
      ${key <= todayKey() && st.done < st.total ? `<button type="button" class="play-chip lg" data-action="runAll">${ICON.play}<span>운동 시작</span></button>` : ''}
    </div>
    <div class="ws-stats">
      <div><b>${st.done}<small>/${st.total}</small></b><span>세트</span></div>
      <div><b>${st.done ? st.minutes : st.planMinutes}<small>분</small></b><span>${st.done ? '운동 시간' : '예상 시간'}</span></div>
      <div><b>${num(st.done ? st.kcal : st.planKcal)}<small>kcal</small></b><span>${st.done ? '소모(추정)' : '예상 소모'}</span></div>
    </div>
    ${meter(st.done, st.total, { color: 'var(--exercise)' })}
    ${pct === 1 ? '<p class="ws-done">🎉 오늘 운동 완료! 수고했어요</p>' : ''}
  </section>
  ${w.exercises.map((ex) => exerciseCard(ex, 'run')).join('')}
  <button type="button" class="btn ghost block dashed" data-action="addEx">${ICON.plus} 운동 추가</button>
  <div class="card">
    <p class="label first">운동 메모</p>
    <textarea class="input" rows="2" maxlength="500" placeholder="컨디션, 무게 변화, 느낀 점을 남겨보세요" data-change="note">${esc(src === 'log' ? w.note || '' : '')}</textarea>
  </div>
  ${src === 'log' && S().plan[wd].exercises.length ? `<button type="button" class="link-btn center" data-action="resetDay">${WD[wd]}요일 계획으로 되돌리기</button>` : ''}
  <p class="footnote">소모 칼로리는 운동 강도(MET)와 체중 ${r1(weight)}kg 기준 추정치예요. 근력 운동은 세트당 약 2분으로 계산해요.</p>`;
}

/* ───────── 운동 수정 공통 로직 (날짜 기록 or 주간 계획) ───────── */

// target: { type: 'day', key } | { type: 'plan', wd }
function withTarget(target, fn, opts) {
  update((s) => {
    const w = target.type === 'day' ? ensureWorkout(target.key) : s.plan[target.wd];
    fn(w, s);
  }, opts);
}
const findEx = (w, id) => w.exercises.find((e) => e.id === id);

function exerciseActions(target, refresh = () => {}) {
  const get = () => (target.type === 'day' ? workoutFor(target.key).w : S().plan[target.wd]);
  return {
    setVal: (i) => {
      const v = Math.max(0, Number(i.value) || 0);
      withTarget(target, (w) => {
        const ex = findEx(w, i.dataset.ex);
        if (ex) ex.sets[Number(i.dataset.i)][i.dataset.k] = v;
      }, { silent: true }); // 입력 포커스 유지를 위해 다시 그리지 않음
    },
    addSet: (b) => {
      withTarget(target, (w) => {
        const ex = findEx(w, b.dataset.ex);
        if (!ex) return;
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push(last ? { ...last, done: false } : ex.kind === 'time' ? { min: 10, done: false } : { reps: 10, kg: 0, done: false });
      });
      refresh();
    },
    delSet: (b) => {
      withTarget(target, (w) => {
        const ex = findEx(w, b.dataset.ex);
        if (ex && ex.sets.length > 1) ex.sets.splice(Number(b.dataset.i), 1);
      });
      refresh();
    },
    exMenu: (b) => {
      const ex = findEx(get(), b.dataset.ex);
      if (!ex) return;
      const idx = get().exercises.indexOf(ex);
      const m = openSheet({
        title: ex.name,
        className: 'sheet-menu',
        render: () => `<div class="menu-list">
          ${idx > 0 ? `<button type="button" class="menu-item" data-action="up">${ICON.left}<span>위로 이동</span></button>` : ''}
          ${idx < get().exercises.length - 1 ? `<button type="button" class="menu-item" data-action="down">${ICON.right}<span>아래로 이동</span></button>` : ''}
          <button type="button" class="menu-item danger" data-action="del">${ICON.trash}<span>운동 삭제</span></button></div>`,
        actions: {
          up: () => move(-1),
          down: () => move(1),
          del: () => {
            withTarget(target, (w) => {
              w.exercises = w.exercises.filter((e) => e.id !== ex.id);
            });
            m.close();
            refresh();
          },
        },
      });
      const move = (d) => {
        withTarget(target, (w) => {
          const i = w.exercises.findIndex((e) => e.id === ex.id);
          const j = i + d;
          if (i < 0 || j < 0 || j >= w.exercises.length) return;
          [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]];
        });
        m.close();
        refresh();
      };
    },
  };
}

/* ───────── 운동 선택 시트 ───────── */

export function openExercisePicker(onPick) {
  const st = { q: '', cat: '하체', custom: false, name: '', kind: 'weight' };
  const results = () => {
    const list = st.q ? EXERCISES.filter((e) => matchKo(e.name, st.q)) : EXERCISES.filter((e) => e.cat === st.cat);
    if (!list.length) return `<div class="no-result">'${esc(st.q)}' 운동이 목록에 없어요<button type="button" class="btn secondary sm" data-action="custom">${ICON.edit} 직접 추가하기</button></div>`;
    return list
      .map((e) => {
        const d = e.def;
        const desc = e.kind === 'time' ? `${d.sets > 1 ? `${d.sets}세트 × ` : ''}${d.min}분` : `${d.sets}세트 × ${d.reps}회${e.kind === 'weight' ? ` · ${d.kg}kg` : ''}`;
        return `<button type="button" class="food-pick" data-action="pick" data-name="${esc(e.name)}">
          <span class="ex-emoji sm">${e.emoji}</span>
          <span class="fp-name">${esc(e.name)}<small>${desc}</small></span><span class="fp-add">${ICON.plus}</span></button>`;
      })
      .join('');
  };
  const sheet = openSheet({
    title: '운동 추가',
    className: 'sheet-tall',
    render: () => {
      if (st.custom) {
        return `<button type="button" class="back-link" data-action="back">${ICON.left} 목록으로</button>
          <p class="label">운동 이름</p>
          <input class="input" maxlength="24" placeholder="예: 케틀벨 스윙" value="${esc(st.name)}" data-input="name">
          <p class="label">기록 방식</p>
          <div class="chips">${Object.entries(KIND_LABEL).map(([k, v]) => `<button type="button" class="chip ${st.kind === k ? 'on' : ''}" data-action="kind" data-v="${k}">${v}</button>`).join('')}</div>
          <p class="label">분류</p>
          <div class="chips">${EX_CATS.map((c) => `<button type="button" class="chip sm ${st.cat === c.id ? 'on' : ''}" data-action="ccat" data-v="${c.id}">${c.emoji} ${c.id}</button>`).join('')}</div>`;
      }
      return `<div class="search-box">${ICON.search}<input class="input" type="search" placeholder="운동 검색" value="${esc(st.q)}" data-input="q"></div>
        <div class="hscroll chips cat-chips">${EX_CATS.map((c) => `<button type="button" class="chip sm ${!st.q && st.cat === c.id ? 'on' : ''}" data-action="cat" data-v="${c.id}">${c.emoji} ${c.id}</button>`).join('')}</div>
        <div class="food-results">${results()}</div>
        <button type="button" class="btn ghost block" data-action="custom">${ICON.edit} 나만의 운동 직접 추가</button>`;
    },
    footer: () => (st.custom ? '<button class="btn block" type="button" data-action="addCustom">운동 추가</button>' : ''),
    actions: {
      q: (i) => {
        st.q = i.value;
        sheet.body.querySelector('.food-results').innerHTML = results();
        sheet.body.querySelectorAll('.cat-chips .chip').forEach((c) => c.classList.toggle('on', !st.q && c.dataset.v === st.cat));
      },
      cat: (b) => {
        st.cat = b.dataset.v;
        st.q = '';
        sheet.refresh({ keepScroll: false });
      },
      pick: (b) => {
        const def = EXERCISES.find((e) => e.name === b.dataset.name);
        if (!def) return;
        onPick(makeExercise(def));
        toast(`'${def.name}' 추가했어요`);
        sheet.close();
      },
      custom: () => {
        st.custom = true;
        st.name = st.name || st.q;
        sheet.refresh({ keepScroll: false });
      },
      back: () => {
        st.custom = false;
        sheet.refresh({ keepScroll: false });
      },
      name: (i) => (st.name = i.value),
      kind: (b) => {
        st.kind = b.dataset.v;
        sheet.refresh();
      },
      ccat: (b) => {
        st.cat = b.dataset.v;
        sheet.refresh();
      },
      addCustom: () => {
        const name = st.name.trim();
        if (!name) return toast('운동 이름을 입력해 주세요');
        const emoji = EX_CATS.find((c) => c.id === st.cat)?.emoji || '🏋️';
        const def = { name, cat: st.cat, kind: st.kind, met: KIND_MET[st.kind], emoji, def: st.kind === 'time' ? { sets: 1, min: 20 } : { sets: 3, reps: 12, kg: 0 } };
        onPick(makeExercise(def));
        toast(`'${name}' 추가했어요`);
        sheet.close();
      },
    },
  });
}

/* ───────── 주간 계획 편집 시트 ───────── */

export function openPlanEditor(wd = weekdayOf(ctx.date)) {
  const st = { wd: Number(wd) };
  const target = { type: 'plan', get wd() { return st.wd; } };
  const sheet = openSheet({
    title: '주간 운동 계획',
    className: 'sheet-tall',
    render: () => {
      const p = S().plan[st.wd];
      return `
      <p class="sheet-desc">요일마다 할 운동을 직접 짜보세요. 매주 이 계획대로 운동 탭에 나타나요.</p>
      <div class="days-row plan-days">${weekOrder()
        .map((d) => `<button type="button" class="day-tog ${d === st.wd ? 'on' : ''} ${S().plan[d].exercises.length ? 'has' : ''}" data-action="wd" data-d="${d}">${WD[d]}</button>`)
        .join('')}</div>
      <input class="input big" maxlength="24" placeholder="${WD[st.wd]}요일 운동 이름 (예: 하체 데이)" value="${esc(p.title || '')}" data-change="ptitle">
      ${p.exercises.length ? p.exercises.map((ex) => exerciseCard(ex, 'edit')).join('') : `<div class="card empty sm"><p>${WD[st.wd]}요일은 휴식일이에요 😌</p></div>`}
      <button type="button" class="btn ghost block dashed" data-action="addEx">${ICON.plus} ${WD[st.wd]}요일에 운동 추가</button>
      <div class="plan-tools">
        ${p.exercises.length ? `<button type="button" class="chip sm" data-action="copyTo">${ICON.copy} 다른 요일에 복사</button><button type="button" class="chip sm" data-action="clear">비우기 (휴식일)</button>` : ''}
        <button type="button" class="chip sm" data-action="sample">샘플 주간 계획 불러오기</button>
      </div>`;
    },
    footer: () => '<button class="btn block" type="button" data-action="__close">완료</button>',
    actions: {
      ...exerciseActions(target, () => sheet.refresh()),
      wd: (b) => {
        st.wd = Number(b.dataset.d);
        sheet.refresh({ keepScroll: false });
      },
      ptitle: (i) => {
        update((s) => (s.plan[st.wd].title = i.value.trim()), { silent: true });
        ctx.rerender();
      },
      addEx: () =>
        openExercisePicker((ex) => {
          update((s) => s.plan[st.wd].exercises.push(ex));
          sheet.refresh();
        }),
      clear: async () => {
        if (!(await confirmBox(`${WD[st.wd]}요일 계획을 비울까요?`, { ok: '비우기', danger: true }))) return;
        update((s) => (s.plan[st.wd] = { title: '', exercises: [] }));
        sheet.refresh();
      },
      sample: async () => {
        if (!(await confirmBox('샘플 주간 계획(월~토)으로 바꿀까요?\n현재 주간 계획은 덮어써져요.', { ok: '불러오기' }))) return;
        update((s) => (s.plan = samplePlan()));
        sheet.refresh();
        toast('샘플 계획을 불러왔어요. 자유롭게 수정하세요!');
      },
      copyTo: () => {
        const from = st.wd;
        const pick = new Set();
        const cs = openSheet({
          title: `${WD[from]}요일 계획 복사`,
          render: () => `<p class="sheet-desc">복사할 요일을 고르세요. 기존 계획은 덮어써져요.</p>
            <div class="days-row">${weekOrder()
              .filter((d) => d !== from)
              .map((d) => `<button type="button" class="day-tog ${pick.has(d) ? 'on' : ''}" data-action="p" data-d="${d}">${WD[d]}</button>`)
              .join('')}</div>`,
          footer: () => `<button class="btn block" type="button" data-action="go" ${pick.size ? '' : 'disabled'}>복사하기</button>`,
          actions: {
            p: (b) => {
              const d = Number(b.dataset.d);
              pick.has(d) ? pick.delete(d) : pick.add(d);
              cs.refresh();
            },
            go: () => {
              update((s) => {
                for (const d of pick) {
                  const src = clone(s.plan[from]);
                  src.exercises.forEach((e) => (e.id = uid()));
                  s.plan[d] = src;
                }
              });
              cs.close();
              sheet.refresh();
              toast(`${[...pick].map((d) => WD[d]).join('·')}요일에 복사했어요`);
            },
          },
        });
      },
    },
  });
}

/* ───────── 실행 화면 액션 ───────── */

// 항상 현재 선택된 날짜를 가리키는 대상
const DAY = {
  type: 'day',
  get key() {
    return ctx.date;
  },
};
const dayTarget = () => DAY;

function toggleSet(exId, i) {
  const key = ctx.date;
  if (key > todayKey()) {
    toast('아직 오지 않은 날이에요');
    return;
  }
  let nowDone = false;
  let ex;
  withTarget(dayTarget(), (w) => {
    ex = findEx(w, exId);
    if (!ex) return;
    const s = ex.sets[i];
    s.done = !s.done;
    nowDone = s.done;
  });
  if (nowDone) {
    vibrate(30);
    const { w } = workoutFor(key);
    const st = workoutStats(w);
    if (st.done === st.total) toast('🎉 오늘 운동을 모두 끝냈어요!');
    else if (ex.kind !== 'time') startRest(S().settings.restSec, `${ex.name} 휴식`);
  }
}

function runTimeSet(exId, i) {
  const key = ctx.date;
  const { w } = workoutFor(key);
  const ex = findEx(w, exId);
  if (!ex) return;
  const s = ex.sets[i];
  startPlayer({
    title: ex.name,
    tasks: [{ id: `${exId}:${i}`, title: `${ex.name} ${i + 1}세트`, emoji: ex.emoji, color: '#8B6CF6', durationSec: Math.round((Number(s.min) || 1) * 60) }],
    onTaskDone: () => {
      withTarget({ type: 'day', key }, (ww) => {
        const e = findEx(ww, exId);
        if (e) e.sets[i].done = true;
      });
    },
    finishText: '세트 완료!',
  });
}

/** 남은 세트를 순서대로 진행 (시간 운동은 타이머, 근력 운동은 휴식시간 포함 스톱워치) */
function runAll() {
  const key = ctx.date;
  const { w } = workoutFor(key);
  const tasks = [];
  for (const ex of w.exercises) {
    ex.sets.forEach((s, i) => {
      if (s.done) return;
      const desc = ex.kind === 'weight' ? `${s.kg}kg × ${s.reps}회` : ex.kind === 'reps' ? `${s.reps}회` : `${s.min}분`;
      tasks.push({
        id: `${ex.id}:${i}`,
        title: `${ex.name} · ${i + 1}세트`,
        emoji: ex.emoji,
        color: '#8B6CF6',
        durationSec: ex.kind === 'time' ? Math.round((Number(s.min) || 1) * 60) : 0,
        memo: desc,
      });
    });
  }
  if (!tasks.length) return;
  startPlayer({
    title: w.title || '오늘의 운동',
    tasks,
    finishText: '운동 완료! 수고했어요 💪',
    onTaskDone: (t) => {
      const [exId, i] = t.id.split(':');
      withTarget({ type: 'day', key }, (ww) => {
        const e = findEx(ww, exId);
        if (e) e.sets[Number(i)].done = true;
      });
    },
  });
}

export const actions = {
  ...exerciseActions(DAY),
  toggleSet: (b) => toggleSet(b.dataset.ex, Number(b.dataset.i)),
  timeSet: (b) => runTimeSet(b.dataset.ex, Number(b.dataset.i)),
  runAll: () => runAll(),
  editPlan: (b) => openPlanEditor(b.dataset.wd ?? weekdayOf(ctx.date)),
  addEx: () =>
    openExercisePicker((ex) => {
      withTarget(dayTarget(), (w) => w.exercises.push(ex));
    }),
  title: (i) => withTarget(dayTarget(), (w) => (w.title = i.value.trim())),
  note: (i) => withTarget(dayTarget(), (w) => (w.note = i.value)),
  resetDay: async () => {
    if (!(await confirmBox('이 날의 운동 기록을 지우고 주간 계획으로 되돌릴까요?', { ok: '되돌리기', danger: true }))) return;
    update((s) => delete s.workouts[ctx.date]);
  },
};
