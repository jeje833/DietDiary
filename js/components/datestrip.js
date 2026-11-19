// 주간 날짜 선택 스트립 (상단). 액션은 app.js 의 공통 액션(ds*)이 처리
import { addDays, startOfWeek, parseKey, todayKey, WD, fmtMonth } from '../utils.js';
import { S } from '../store.js';
import { ICON } from '../ui.js';

/**
 * @param {string} selected 선택된 날짜 키
 * @param {(key:string)=>{cls?:string, p?:number}|null} dot 날짜별 표시 (cls: good|mid|low|plan|done, p: 0~1)
 */
export function dateStrip(selected, dot = () => null) {
  const ws = S().settings.weekStart ?? 1;
  const start = startOfWeek(selected, ws);
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const cells = days
    .map((k) => {
      const d = parseKey(k);
      const info = dot(k);
      const wd = d.getDay();
      return `<button type="button" class="ds-day ${k === selected ? 'sel' : ''} ${k === today ? 'today' : ''} ${wd === 0 ? 'sun' : wd === 6 ? 'sat' : ''}" data-action="dsSelect" data-key="${k}" aria-label="${d.getMonth() + 1}월 ${d.getDate()}일">
        <span class="ds-wd">${WD[wd]}</span>
        <span class="ds-num">${d.getDate()}</span>
        <span class="ds-dot ${info?.cls || ''}"></span>
      </button>`;
    })
    .join('');
  return `<div class="datestrip">
    <div class="ds-head">
      <button type="button" class="ds-month" data-action="dsPick">${fmtMonth(selected)} ${ICON.calendar}</button>
      <div class="ds-nav">
        ${selected !== today ? '<button type="button" class="chip sm" data-action="dsToday">오늘</button>' : ''}
        <button type="button" class="icon-btn sm" data-action="dsPrev" aria-label="이전 주">${ICON.left}</button>
        <button type="button" class="icon-btn sm" data-action="dsNext" aria-label="다음 주">${ICON.right}</button>
      </div>
    </div>
    <div class="ds-days" data-swipe="week">${cells}</div>
  </div>`;
}

/** 루틴 달성률 → 신호등 등급 */
export function rateClass(rate) {
  if (rate == null) return '';
  if (rate >= 0.8) return 'good';
  if (rate >= 0.5) return 'mid';
  return 'low';
}
