// 여러 화면에서 같이 쓰는 카드: 물, 체중
import { S, update, latestWeight } from '../store.js';
import { r1, esc } from '../utils.js';
import { ctx } from '../ctx.js';
import { toast, ICON } from '../ui.js';

export const CUP_ML = 250;

export function waterCard(key, { wide = false } = {}) {
  const cups = S().water[key] || 0;
  const goal = S().profile.waterGoal || 8;
  const shown = Math.max(goal, cups);
  const cells = Array.from({ length: Math.min(shown, 16) }, (_, i) =>
    `<button type="button" class="cup ${i < cups ? 'on' : ''}" data-action="waterSet" data-n="${i + 1}" aria-label="${i + 1}잔"></button>`,
  ).join('');
  return `<div class="card qc ${wide ? 'wide' : ''}">
    <div class="qc-head"><span>💧 물</span><small>${parseFloat(((cups * CUP_ML) / 1000).toFixed(2))}L</small></div>
    <div class="cups">${cells}</div>
    <div class="stepper sm">
      <button type="button" class="step" data-action="waterAdd" data-d="-1" aria-label="한 잔 빼기">${ICON.minus}</button>
      <span class="step-val"><b>${cups}</b>/${goal}잔</span>
      <button type="button" class="step" data-action="waterAdd" data-d="1" aria-label="한 잔 추가">${ICON.plus}</button>
    </div>
  </div>`;
}

function setWater(key, n) {
  const goal = S().profile.waterGoal || 8;
  const before = S().water[key] || 0;
  const v = Math.max(0, Math.min(30, n));
  update((s) => {
    if (v) s.water[key] = v;
    else delete s.water[key];
  });
  if (before < goal && v >= goal) toast('💧 오늘 물 목표 달성! 잘했어요');
}

export const waterActions = {
  waterSet: (b) => {
    const n = Number(b.dataset.n);
    const cur = S().water[ctxDate()] || 0;
    setWater(ctxDate(), n === cur ? n - 1 : n);
  },
  waterAdd: (b) => setWater(ctxDate(), (S().water[ctxDate()] || 0) + Number(b.dataset.d)),
};

const ctxDate = () => ctx.date;

export function weightCard(key) {
  const w = S().weights[key];
  const prevKeys = Object.keys(S().weights).filter((k) => k < key).sort();
  const prev = prevKeys.length ? S().weights[prevKeys[prevKeys.length - 1]] : null;
  const base = latestWeight(key);
  const goal = S().profile.goalWeight;
  let sub = '오늘 체중을 기록해요';
  if (w != null) {
    const toGoal = r1(w - goal);
    const diff = prev != null ? r1(w - prev) : null;
    sub = `${diff != null ? `${diff > 0 ? '▲' : diff < 0 ? '▼' : '='} ${Math.abs(diff)}kg · ` : ''}${toGoal > 0 ? `목표까지 ${toGoal}kg` : '목표 달성 🎉'}`;
  }
  return `<div class="card qc">
    <div class="qc-head"><span>⚖️ 체중</span><small>${w != null ? 'kg' : ''}</small></div>
    <div class="stepper weight">
      <button type="button" class="step" data-action="wStep" data-d="-0.1" aria-label="0.1kg 빼기">${ICON.minus}</button>
      <input class="step-input" type="number" inputmode="decimal" step="0.1" min="20" max="300" value="${w ?? ''}" placeholder="${esc(base)}" data-change="wSet" aria-label="체중(kg)">
      <button type="button" class="step" data-action="wStep" data-d="0.1" aria-label="0.1kg 더하기">${ICON.plus}</button>
    </div>
    <small class="qc-sub">${sub}</small>
  </div>`;
}

function setWeight(key, v) {
  if (!(v >= 20 && v <= 300)) {
    toast('체중을 확인해 주세요 (20~300kg)');
    return;
  }
  update((s) => {
    s.weights[key] = r1(v);
  });
}

export const weightActions = {
  wStep: (b) => {
    const key = ctxDate();
    const cur = S().weights[key] ?? latestWeight(key);
    setWeight(key, r1(cur + Number(b.dataset.d)));
  },
  wSet: (i) => {
    const key = ctxDate();
    if (i.value === '') {
      update((s) => delete s.weights[key]);
      return;
    }
    setWeight(key, Number(i.value));
  },
};

