// 가벼운 SVG 차트 (외부 라이브러리 없음)
import { clamp, esc, num, fmtShort, daysBetween, r1 } from '../utils.js';

export function ring(pct, { size = 120, stroke = 12, color = 'var(--primary)', inner = '', label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(pct ?? 0, 0, 1);
  const mid = size / 2;
  const arc =
    p > 0
      ? `<circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" transform="rotate(-90 ${mid} ${mid})" class="ring-arc"/>`
      : '';
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${esc(label)}">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>${arc}
    </svg><div class="ring-in">${inner}</div></div>`;
}

/**
 * 막대 차트. items: [{ label, value, tip, color }]
 * goal 이 있으면 점선 목표선 표시
 */
export function bars(items, { height = 150, goal = 0, max, showValues, labelEvery = 1, ariaLabel = '' } = {}) {
  const W = 340;
  const H = height;
  const top = 20;
  const bottom = 24;
  const n = items.length || 1;
  const vmax = Math.max(1, goal || 0, ...items.map((i) => i.value || 0));
  const mx = max ?? vmax * 1.12;
  const plotH = H - top - bottom;
  const slot = W / n;
  const bw = Math.max(3, Math.min(24, slot * 0.58));
  const values = showValues ?? n <= 8;
  let out = '';
  items.forEach((it, i) => {
    const x = i * slot + (slot - bw) / 2;
    const v = it.value || 0;
    const h = v > 0 ? Math.max(3, (v / mx) * plotH) : 0;
    const y = H - bottom - h;
    const rx = Math.min(4, bw / 2);
    if (h > 0) {
      // 아래쪽은 직각, 위쪽만 둥글게
      out += `<path d="M${x},${H - bottom} V${y + rx} Q${x},${y} ${x + rx},${y} H${x + bw - rx} Q${x + bw},${y} ${x + bw},${y + rx} V${H - bottom} Z" fill="${it.color || 'var(--primary)'}"/>`;
      if (values) out += `<text x="${x + bw / 2}" y="${y - 6}" class="c-val" text-anchor="middle">${esc(it.valueLabel ?? num(v))}</text>`;
    }
    // 넓은 터치 영역
    out += `<rect x="${i * slot}" y="${top - 10}" width="${slot}" height="${plotH + 10}" fill="transparent" data-tip="${esc(it.tip ?? `${it.label}: ${num(v)}`)}"/>`;
    if (i % labelEvery === 0 || i === n - 1)
      out += `<text x="${x + bw / 2}" y="${H - 6}" class="c-lab ${it.strong ? 'strong' : ''}" text-anchor="middle">${esc(it.label)}</text>`;
  });
  let goalLine = '';
  if (goal > 0) {
    const gy = H - bottom - (goal / mx) * plotH;
    goalLine = `<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" class="c-goal"/><text x="${W}" y="${gy - 5}" text-anchor="end" class="c-goal-lab">목표 ${num(goal)}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">
    <line x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}" class="c-base"/>${goalLine}${out}</svg>`;
}

/** 체중 등 꺾은선 차트. points: [{ key, value }] (날짜순) */
export function lineChart(points, { height = 170, goal, unit = 'kg', ariaLabel = '' } = {}) {
  if (!points.length) return '<div class="chart-empty">아직 기록이 없어요</div>';
  const W = 340;
  const H = height;
  const left = 34;
  const right = 12;
  const top = 18;
  const bottom = 24;
  const vals = points.map((p) => p.value);
  if (goal) vals.push(goal);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 2) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const first = points[0].key;
  const span = Math.max(1, daysBetween(first, points[points.length - 1].key));
  const X = (k) => left + (daysBetween(first, k) / span) * (W - left - right);
  const Y = (v) => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  const single = points.length === 1;
  const xs = points.map((p) => (single ? (left + W - right) / 2 : X(p.key)));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${xs[xs.length - 1].toFixed(1)},${H - bottom} L${xs[0].toFixed(1)},${H - bottom} Z`;
  // y 눈금 3개
  let grid = '';
  for (let i = 0; i < 3; i++) {
    const v = lo + ((hi - lo) * (i + 0.5)) / 3;
    const y = Y(v);
    grid += `<line x1="${left}" x2="${W - right}" y1="${y}" y2="${y}" class="c-grid"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" class="c-lab">${r1(v)}</text>`;
  }
  let goalLine = '';
  if (goal) {
    const gy = Y(goal);
    goalLine = `<line x1="${left}" x2="${W - right}" y1="${gy}" y2="${gy}" class="c-goal"/><text x="${W - right}" y="${gy - 5}" text-anchor="end" class="c-goal-lab">목표 ${goal}${unit}</text>`;
  }
  const showDots = points.length <= 40;
  const dots = points
    .map((p, i) => {
      const cx = xs[i];
      const cy = Y(p.value);
      return `${showDots || i === points.length - 1 ? `<circle cx="${cx}" cy="${cy}" r="4" class="c-dot"/>` : ''}<circle cx="${cx}" cy="${cy}" r="12" fill="transparent" data-tip="${esc(`${fmtShort(p.key)}  ${p.value}${unit}`)}"/>`;
    })
    .join('');
  const last = points[points.length - 1];
  const lastLabel = `<text x="${Math.min(xs[xs.length - 1], W - right - 4)}" y="${Y(last.value) - 10}" text-anchor="end" class="c-val strong">${last.value}${unit}</text>`;
  const xl = `<text x="${xs[0]}" y="${H - 6}" class="c-lab" text-anchor="${single ? 'middle' : 'start'}">${fmtShort(first)}</text>${
    single ? '' : `<text x="${xs[xs.length - 1]}" y="${H - 6}" class="c-lab" text-anchor="end">${fmtShort(last.key)}</text>`
  }`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">
    <defs><linearGradient id="lg-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".22"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
    ${grid}${goalLine}<path d="${area}" fill="url(#lg-area)"/><path d="${d}" class="c-line"/>${dots}${lastLabel}${xl}</svg>`;
}

/** 가로 진행 막대 */
export function meter(value, max, { color = 'var(--primary)', over = 'var(--kcal)' } = {}) {
  const p = max > 0 ? value / max : 0;
  return `<div class="meter"><span style="width:${clamp(p, 0, 1) * 100}%;background:${p > 1.05 ? over : color}"></span></div>`;
}
