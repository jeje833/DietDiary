// 루틴 플레이어: 루틴을 하나씩 타이머로 진행 (시간이 지나면 초과 시간 카운트)
import { esc, fmtClock, vibrate, beep, unlockAudio, hexA } from './utils.js';
import { ICON } from './ui.js';

let P = null;
let wakeLock = null;

async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (P && document.visibilityState === 'visible') {
    keepAwake();
    tick();
  }
});

/**
 * @param {{title:string, tasks:Array<{id:string,title:string,emoji:string,color:string,durationSec:number,memo?:string}>,
 *          onTaskDone?:(task, info)=>void, onFinish?:(summary)=>void, finishText?:string}} opts
 */
export function startPlayer(opts) {
  if (!opts.tasks.length) return;
  stopPlayer();
  unlockAudio();
  const el = document.createElement('div');
  el.className = 'player';
  document.body.appendChild(el);
  document.body.classList.add('locked');
  P = { ...opts, idx: 0, el, results: [], finished: false };
  startTask();
  el.addEventListener('click', onClick);
  P.timer = setInterval(tick, 250);
  keepAwake();
  requestAnimationFrame(() => el.classList.add('open'));
}

export const playerOpen = () => !!P;

function startTask() {
  P.started = Date.now();
  P.accum = 0;
  P.paused = false;
  P.alerted = false;
  render();
}

const cur = () => P.tasks[P.idx];
const elapsed = () => (P.accum + (P.paused ? 0 : Date.now() - P.started)) / 1000;

function render() {
  const t = cur();
  const c = t.color || '#22B07D';
  P.el.style.setProperty('--c', c);
  P.el.style.setProperty('--c-soft', hexA(c, 0.14));
  if (P.finished) {
    const done = P.results.filter((r) => r.status === 'done');
    const total = Math.round(P.results.reduce((a, r) => a + r.sec, 0) / 60);
    P.el.innerHTML = `
      <div class="pl-finish">
        <div class="pl-party">🎉</div>
        <h2>${esc(P.finishText || `${P.title} 완료!`)}</h2>
        <p>${P.tasks.length}개 중 <b>${done.length}개</b> 완료 · 총 ${total}분</p>
        <ul class="pl-result">${P.results
          .map((r) => `<li class="${r.status}"><span>${esc(r.emoji)}</span><span>${esc(r.title)}</span><small>${r.status === 'done' ? fmtClock(r.sec) : '건너뜀'}</small></li>`)
          .join('')}</ul>
        <button class="btn block" type="button" data-pl="close">닫기</button>
      </div>`;
    return;
  }
  const next = P.tasks[P.idx + 1];
  P.el.innerHTML = `
    <div class="pl-top">
      <button class="icon-btn" type="button" data-pl="close" aria-label="닫기">${ICON.close}</button>
      <span class="pl-title">${esc(P.title)}</span>
      <span class="pl-count">${P.idx + 1} / ${P.tasks.length}</span>
    </div>
    <div class="pl-steps">${P.tasks.map((_, i) => `<span class="${i < P.idx ? 'past' : i === P.idx ? 'now' : ''}"></span>`).join('')}</div>
    <div class="pl-center">
      <div class="pl-ring">
        <svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="100" class="pl-track"/><circle cx="110" cy="110" r="100" class="pl-arc" transform="rotate(-90 110 110)" stroke-dasharray="628.3" stroke-dashoffset="628.3"/></svg>
        <span class="pl-emoji">${esc(t.emoji)}</span>
      </div>
      <h2 class="pl-name">${esc(t.title)}</h2>
      ${t.memo ? `<p class="pl-memo">${esc(t.memo)}</p>` : ''}
      <div class="pl-time">00:00</div>
      <p class="pl-sub"></p>
    </div>
    <div class="pl-controls">
      <button class="pl-btn" type="button" data-pl="skip">${ICON.next}<span>건너뛰기</span></button>
      <button class="pl-btn main" type="button" data-pl="pause" aria-label="일시정지">${ICON.pause}</button>
      <button class="pl-btn" type="button" data-pl="done">${ICON.check}<span>완료</span></button>
    </div>
    <div class="pl-next">${next ? `다음 · ${esc(next.emoji)} ${esc(next.title)}` : '마지막 루틴이에요 💪'}</div>`;
  tick();
}

function tick() {
  if (!P || P.finished) return;
  const t = cur();
  const sec = elapsed();
  const timeEl = P.el.querySelector('.pl-time');
  const subEl = P.el.querySelector('.pl-sub');
  const arc = P.el.querySelector('.pl-arc');
  if (!timeEl) return;
  if (t.durationSec > 0) {
    const left = t.durationSec - sec;
    const over = left < 0;
    timeEl.textContent = over ? `+${fmtClock(-left)}` : fmtClock(Math.ceil(left));
    timeEl.classList.toggle('over', over);
    subEl.textContent = P.paused ? '일시정지됨' : over ? '목표 시간을 넘겼어요 · 완료를 눌러주세요' : `목표 ${fmtClock(t.durationSec)}`;
    arc.style.strokeDashoffset = String(628.3 * (1 - Math.min(1, sec / t.durationSec)));
    arc.classList.toggle('over', over);
    if (over && !P.alerted) {
      P.alerted = true;
      vibrate([200, 100, 200]);
      beep(3);
    }
  } else {
    timeEl.textContent = fmtClock(sec);
    subEl.textContent = P.paused ? '일시정지됨' : '스톱워치';
    arc.style.strokeDashoffset = String(628.3 * (1 - ((sec % 60) / 60)));
  }
}

function finishTask(status) {
  const t = cur();
  const sec = Math.round(elapsed());
  P.results.push({ id: t.id, title: t.title, emoji: t.emoji, status, sec: status === 'done' ? sec : 0 });
  if (status === 'done') {
    vibrate(40);
    P.onTaskDone?.(t, { status, sec });
  }
  if (P.idx < P.tasks.length - 1) {
    P.idx++;
    startTask();
  } else {
    P.finished = true;
    clearInterval(P.timer);
    if (P.results.some((r) => r.status === 'done')) beep(2);
    P.onFinish?.(P.results);
    if (P.tasks.length === 1 && status === 'done' && P.autoClose) {
      stopPlayer();
      return;
    }
    render();
  }
}

function onClick(e) {
  const b = e.target.closest('[data-pl]');
  if (!b || !P) return;
  const a = b.dataset.pl;
  if (a === 'close') stopPlayer();
  else if (a === 'skip') finishTask('skip');
  else if (a === 'done') finishTask('done');
  else if (a === 'pause') {
    if (P.paused) {
      P.started = Date.now();
      P.paused = false;
      b.innerHTML = ICON.pause;
    } else {
      P.accum += Date.now() - P.started;
      P.paused = true;
      b.innerHTML = ICON.play;
    }
    tick();
  }
}

export function stopPlayer() {
  if (!P) return;
  clearInterval(P.timer);
  const el = P.el;
  el.classList.remove('open');
  setTimeout(() => el.remove(), 250);
  P = null;
  if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('locked');
  try {
    wakeLock?.release();
  } catch {
    /* 무시 */
  }
  wakeLock = null;
}
