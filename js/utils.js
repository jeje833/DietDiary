// 공통 유틸리티: 날짜, 포맷, 문자열, 소리/진동

export const pad = (n) => String(n).padStart(2, '0');

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => dateKey(new Date());

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function addMonths(key, n) {
  const d = parseKey(key);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return dateKey(d);
}

export const weekdayOf = (key) => parseKey(key).getDay();

export const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function startOfWeek(key, weekStart = 1) {
  const d = parseKey(key);
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return dateKey(d);
}

export function monthKeys(key) {
  const d = parseKey(key);
  const y = d.getFullYear();
  const m = d.getMonth();
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => dateKey(new Date(y, m, i + 1)));
}

export function rangeKeys(from, to) {
  const out = [];
  let k = from;
  while (k <= to) {
    out.push(k);
    k = addDays(k, 1);
  }
  return out;
}

export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);

export function fmtDate(key, { wd = true } = {}) {
  const d = parseKey(key);
  const s = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return wd ? `${s} ${WD[d.getDay()]}요일` : s;
}

export function fmtShort(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function fmtMonth(key) {
  const d = parseKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const r1 = (n) => Math.round(n * 10) / 10;

export const num = (n) => Math.round(Number(n) || 0).toLocaleString('ko-KR');

export function fmtClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

export function hexA(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function debounce(fn, ms = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

// 한글 초성 검색 (예: "ㄷㄱㅅㅅ" → 닭가슴살)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
export function choseong(str) {
  let out = '';
  for (const ch of str) {
    const c = ch.charCodeAt(0) - 0xac00;
    out += c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
  }
  return out;
}

export function matchKo(name, q) {
  if (!q) return true;
  const n = name.replace(/\s/g, '').toLowerCase();
  const qq = q.replace(/\s/g, '').toLowerCase();
  if (!qq) return true;
  if (n.includes(qq)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(qq)) return choseong(n).includes(qq);
  return false;
}

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 지원 안 함 */
  }
}

let actx;
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx ||= new AC();
    if (actx.state === 'suspended') actx.resume();
  } catch {
    /* 무시 */
  }
}

export function beep(times = 2) {
  try {
    unlockAudio();
    if (!actx) return;
    const t0 = actx.currentTime + 0.02;
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator();
      const g = actx.createGain();
      const t = t0 + i * 0.32;
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + 0.28);
    }
  } catch {
    /* 무시 */
  }
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
