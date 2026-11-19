// 리포트 탭: 주간/월간 루틴 달성률(신호등 달력), 루틴별 통계, 식단·운동·체중 그래프
import {
  S, dayStats, statusOf, mealTotals, calorieGoal, workoutStats, latestWeight, currentStreak, routineActiveOn,
} from '../store.js';
import { colorOf, MOODS } from '../data/templates.js';
import { esc, todayKey, startOfWeek, addDays, monthKeys, fmtShort, fmtMonth, parseKey, WD, num, r1, hexA, rangeKeys } from '../utils.js';
import { ICON } from '../ui.js';
import { ctx } from '../ctx.js';
import { bars, lineChart, meter } from '../components/charts.js';
import { rateClass } from '../components/datestrip.js';

const R = { mode: 'week', anchor: todayKey(), wRange: 30 };

function periodKeys() {
  if (R.mode === 'week') {
    const s = startOfWeek(R.anchor, S().settings.weekStart ?? 1);
    return rangeKeys(s, addDays(s, 6));
  }
  return monthKeys(R.anchor);
}

function periodLabel(keys) {
  if (R.mode === 'month') return fmtMonth(R.anchor);
  return `${fmtShort(keys[0])} – ${fmtShort(keys[keys.length - 1])}`;
}

function shiftAnchor(dir) {
  if (R.mode === 'week') R.anchor = addDays(R.anchor, dir * 7);
  else {
    const d = parseKey(R.anchor);
    d.setDate(1);
    d.setMonth(d.getMonth() + dir);
    R.anchor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

function avgRate(keys) {
  const today = todayKey();
  const rates = keys.filter((k) => k <= today).map((k) => dayStats(k).rate).filter((r) => r != null);
  return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
}

const RATE_COLOR = { good: 'var(--good)', mid: 'var(--mid)', low: 'var(--low)' };
const moodEmoji = (k) => MOODS.find((m) => m.v === S().diary[k]?.mood)?.emoji || '';

function routineSection(keys) {
  const today = todayKey();
  const avg = avgRate(keys);
  const prevKeys = R.mode === 'week' ? keys.map((k) => addDays(k, -7)) : monthKeys(addDays(keys[0], -1));
  const prevAvg = avgRate(prevKeys);
  const diff = avg != null && prevAvg != null ? Math.round((avg - prevAvg) * 100) : null;
  let doneCount = 0;
  let perfect = 0;
  for (const k of keys) {
    if (k > today) continue;
    const s = dayStats(k);
    doneCount += s.done;
    if (s.rate === 1) perfect++;
  }

  let chart;
  if (R.mode === 'week') {
    chart =
      bars(
        keys.map((k) => {
          const s = dayStats(k);
          const v = k <= today && s.rate != null ? Math.round(s.rate * 100) : 0;
          return {
            label: WD[parseKey(k).getDay()],
            value: v,
            valueLabel: `${v}%`,
            color: RATE_COLOR[rateClass(s.rate)] || 'var(--track)',
            tip: `${fmtShort(k)} · ${s.rate == null ? '루틴 없음' : `${v}% (${s.done}/${s.total - s.skip})`}`,
            strong: k === today,
          };
        }),
        { height: 150, max: 112, ariaLabel: '요일별 루틴 달성률' },
      ) +
      `<div class="mood-row">${keys.map((k) => `<span>${moodEmoji(k) || '·'}</span>`).join('')}</div>`;
  } else {
    const ws = S().settings.weekStart ?? 1;
    const offset = (parseKey(keys[0]).getDay() - ws + 7) % 7;
    const wds = Array.from({ length: 7 }, (_, i) => WD[(ws + i) % 7]);
    chart = `<div class="cal">
      <div class="cal-wd">${wds.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cal-grid">${'<span class="cal-cell blank"></span>'.repeat(offset)}${keys
        .map((k) => {
          const s = dayStats(k);
          const future = k > today;
          const cls = future ? 'future' : rateClass(s.rate) || 'none';
          const tip = `${fmtShort(k)} · ${future ? '예정' : s.rate == null ? '루틴 없음' : `${Math.round(s.rate * 100)}% (${s.done}/${s.total - s.skip})`}`;
          return `<span class="cal-cell ${cls} ${k === today ? 'today' : ''}" data-tip="${esc(tip)}"><span class="cal-d">${parseKey(k).getDate()}</span><span class="cal-m">${moodEmoji(k)}</span></span>`;
        })
        .join('')}</div>
    </div>`;
  }

  return `<section class="card">
    <div class="card-head"><h3>루틴 달성률</h3>${diff != null ? `<span class="delta ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}%p <small>지난 ${R.mode === 'week' ? '주' : '달'} 대비</small></span>` : ''}</div>
    <div class="hero-num"><b>${avg == null ? '—' : Math.round(avg * 100)}</b><span>%</span><small>평균 달성률</small></div>
    ${chart}
    <div class="legend"><span><i style="background:var(--good)"></i>80% 이상</span><span><i style="background:var(--mid)"></i>50~79%</span><span><i style="background:var(--low)"></i>50% 미만</span></div>
    <div class="tiles">
      <div><b>${num(doneCount)}</b><small>완료한 루틴</small></div>
      <div><b>${perfect}<i>일</i></b><small>완벽한 날</small></div>
      <div><b>${currentStreak()}<i>일</i></b><small>연속 실천 🔥</small></div>
    </div>
  </section>`;
}

function perRoutineSection(keys) {
  const today = todayKey();
  const past = keys.filter((k) => k <= today);
  const rows = S()
    .routines.map((r) => {
      let sched = 0;
      let done = 0;
      for (const k of past) {
        if (!routineActiveOn(r, k)) continue;
        const st = statusOf(k, r.id);
        if (st === 'skip') continue;
        sched++;
        if (st === 'done') done++;
      }
      return { r, sched, done, rate: sched ? done / sched : 0 };
    })
    .filter((x) => x.sched > 0)
    .sort((a, b) => b.rate - a.rate);
  if (!rows.length) return '';
  return `<section class="card">
    <div class="card-head"><h3>루틴별 실천</h3></div>
    <div class="rr-list">${rows
      .map(({ r, sched, done, rate }) => {
        const c = colorOf(r.color);
        return `<div class="rr" style="--c:${c};--c-soft:${hexA(c, 0.15)}">
          <span class="r-emoji sm">${esc(r.emoji)}</span>
          <div class="rr-body"><div class="rr-top"><b>${esc(r.title)}</b><small>${done}/${sched}회 · ${Math.round(rate * 100)}%</small></div>${meter(done, sched, { color: c, over: c })}</div>
        </div>`;
      })
      .join('')}</div>
  </section>`;
}

function mealSection(keys) {
  const today = todayKey();
  const goal = calorieGoal();
  const logged = keys.filter((k) => k <= today && mealTotals(k).count > 0);
  const totals = logged.map((k) => mealTotals(k));
  const avg = totals.length ? totals.reduce((a, t) => a + t.kcal, 0) / totals.length : 0;
  const within = totals.filter((t) => t.kcal <= goal * 1.05).length;
  const sum = totals.reduce((a, t) => ({ c: a.c + t.c * 4, p: a.p + t.p * 4, f: a.f + t.f * 9 }), { c: 0, p: 0, f: 0 });
  const all = sum.c + sum.p + sum.f;
  const pc = (v) => (all ? Math.round((v / all) * 100) : 0);
  const chart = bars(
    keys.map((k) => {
      const t = mealTotals(k);
      const d = parseKey(k);
      return {
        label: R.mode === 'week' ? WD[d.getDay()] : String(d.getDate()),
        value: Math.round(t.kcal),
        color: t.kcal > goal * 1.05 ? 'var(--kcal)' : 'var(--primary)',
        tip: `${fmtShort(k)} · ${t.count ? `${num(t.kcal)}kcal` : '기록 없음'}`,
        strong: k === today,
      };
    }),
    { height: 160, goal, labelEvery: R.mode === 'week' ? 1 : 5, showValues: false, ariaLabel: '일별 섭취 칼로리' },
  );
  return `<section class="card">
    <div class="card-head"><h3>식단</h3><small>목표 ${num(goal)}kcal</small></div>
    <div class="tiles">
      <div><b>${totals.length ? num(avg) : '—'}</b><small>하루 평균 kcal</small></div>
      <div><b>${within}<i>/${totals.length}일</i></b><small>목표 이내</small></div>
      <div><b>${logged.length}<i>일</i></b><small>기록한 날</small></div>
    </div>
    ${chart}
    <div class="legend"><span><i style="background:var(--primary)"></i>목표 이내</span><span><i style="background:var(--kcal)"></i>목표 초과</span><span><i class="dash"></i>목표선</span></div>
    ${
      all
        ? `<p class="label">평균 탄단지 비율</p>
      <div class="stack"><span style="flex:${pc(sum.c)};background:var(--carb)"></span><span style="flex:${pc(sum.p)};background:var(--protein)"></span><span style="flex:${pc(sum.f)};background:var(--fat)"></span></div>
      <div class="legend"><span><i style="background:var(--carb)"></i>탄수화물 ${pc(sum.c)}%</span><span><i style="background:var(--protein)"></i>단백질 ${pc(sum.p)}%</span><span><i style="background:var(--fat)"></i>지방 ${pc(sum.f)}%</span></div>`
        : ''
    }
  </section>`;
}

function workoutSection(keys) {
  const today = todayKey();
  let daysDone = 0;
  let minutes = 0;
  let kcal = 0;
  const items = keys.map((k) => {
    const w = S().workouts[k];
    const st = w ? workoutStats(w, latestWeight(k)) : null;
    if (st && st.done > 0 && k <= today) {
      daysDone++;
      minutes += st.minutes;
      kcal += st.kcal;
    }
    const d = parseKey(k);
    return {
      label: R.mode === 'week' ? WD[d.getDay()] : String(d.getDate()),
      value: st ? st.kcal : 0,
      color: 'var(--exercise)',
      tip: `${fmtShort(k)} · ${st && st.done ? `${st.minutes}분 · ${num(st.kcal)}kcal` : '운동 기록 없음'}`,
      strong: k === today,
    };
  });
  return `<section class="card">
    <div class="card-head"><h3>운동</h3><small>소모 칼로리(추정)</small></div>
    <div class="tiles">
      <div><b>${daysDone}<i>일</i></b><small>운동한 날</small></div>
      <div><b>${num(minutes)}<i>분</i></b><small>총 운동 시간</small></div>
      <div><b>${num(kcal)}</b><small>총 소모 kcal</small></div>
    </div>
    ${bars(items, { height: 140, labelEvery: R.mode === 'week' ? 1 : 5, showValues: R.mode === 'week', ariaLabel: '일별 운동 소모 칼로리' })}
  </section>`;
}

function weightSection() {
  const p = S().profile;
  const all = Object.entries(S().weights)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  const from = R.wRange ? addDays(todayKey(), -R.wRange) : '0000';
  const pts = all.filter((x) => x.key >= from);
  const cur = latestWeight();
  const lost = r1(p.startWeight - cur);
  const left = r1(cur - p.goalWeight);
  const total = p.startWeight - p.goalWeight;
  const prog = total > 0 ? Math.max(0, Math.min(1, (p.startWeight - cur) / total)) : 0;
  return `<section class="card">
    <div class="card-head"><h3>체중 변화</h3>
      <div class="seg sm">${[[30, '1개월'], [90, '3개월'], [0, '전체']].map(([v, l]) => `<button type="button" class="${R.wRange === v ? 'on' : ''}" data-action="wRange" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="tiles">
      <div><b>${r1(p.startWeight)}</b><small>시작 kg</small></div>
      <div><b>${r1(cur)}</b><small>현재 kg</small></div>
      <div><b>${r1(p.goalWeight)}</b><small>목표 kg</small></div>
    </div>
    ${lineChart(pts, { goal: p.goalWeight, ariaLabel: '체중 변화 그래프' })}
    <div class="goal-prog">
      <div class="gp-top"><span>${lost >= 0 ? `${lost}kg 감량` : `${Math.abs(lost)}kg 증가`}</span><span>${left > 0 ? `목표까지 ${left}kg` : '목표 달성! 🎉'}</span></div>
      ${meter(prog, 1, { color: 'var(--primary)' })}
    </div>
  </section>`;
}

export function render() {
  const keys = periodKeys();
  const isCurrent = keys.includes(todayKey());
  return `
  <header class="page-head"><div><p class="eyebrow">나의 변화를 한눈에</p><h1>리포트</h1></div></header>
  <div class="report-nav">
    <div class="seg">
      <button type="button" class="${R.mode === 'week' ? 'on' : ''}" data-action="mode" data-v="week">주간</button>
      <button type="button" class="${R.mode === 'month' ? 'on' : ''}" data-action="mode" data-v="month">월간</button>
    </div>
    <div class="period">
      <button type="button" class="icon-btn sm" data-action="prev" aria-label="이전">${ICON.left}</button>
      <span>${periodLabel(keys)}</span>
      <button type="button" class="icon-btn sm" data-action="next" aria-label="다음" ${isCurrent ? 'disabled' : ''}>${ICON.right}</button>
    </div>
  </div>
  ${S().routines.length ? routineSection(keys) + perRoutineSection(keys) : '<section class="card empty sm"><p>루틴을 추가하면 달성률 통계가 보여요</p></section>'}
  ${mealSection(keys)}
  ${workoutSection(keys)}
  ${weightSection()}`;
}

export const actions = {
  mode: (b) => {
    R.mode = b.dataset.v;
    R.anchor = todayKey();
    rerender();
  },
  prev: () => {
    shiftAnchor(-1);
    rerender();
  },
  next: () => {
    shiftAnchor(1);
    rerender();
  },
  wRange: (b) => {
    R.wRange = Number(b.dataset.v);
    rerender();
  },
};

const rerender = () => ctx.rerender();
