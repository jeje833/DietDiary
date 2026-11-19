// 세트 사이 휴식 타이머 (화면 하단 플로팅 바)
import { fmtClock, vibrate, beep, unlockAudio } from './utils.js';
import { ICON } from './ui.js';

let R = null;

function el() {
  let bar = document.getElementById('restbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'restbar';
    bar.className = 'restbar';
    document.body.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rest]');
      if (!b || !R) return;
      if (b.dataset.rest === 'add') {
        R.end += 15000;
        R.total += 15;
        tick();
      } else stopRest();
    });
  }
  return bar;
}

export function startRest(sec, label = '휴식') {
  if (!sec || sec <= 0) return;
  unlockAudio();
  clearInterval(R?.timer);
  R = { end: Date.now() + sec * 1000, total: sec, label };
  const bar = el();
  bar.innerHTML = `
    <div class="rb-prog"><span></span></div>
    <div class="rb-row">
      <span class="rb-ic">${ICON.timer}</span>
      <div class="rb-text"><small>${label}</small><b class="rb-time">${fmtClock(sec)}</b></div>
      <button class="chip sm" type="button" data-rest="add">+15초</button>
      <button class="icon-btn sm" type="button" data-rest="stop" aria-label="휴식 종료">${ICON.close}</button>
    </div>`;
  bar.classList.add('show');
  R.timer = setInterval(tick, 250);
  tick();
}

function tick() {
  if (!R) return;
  const left = (R.end - Date.now()) / 1000;
  const bar = el();
  const t = bar.querySelector('.rb-time');
  const p = bar.querySelector('.rb-prog span');
  if (t) t.textContent = fmtClock(Math.ceil(Math.max(0, left)));
  if (p) p.style.width = `${Math.max(0, Math.min(1, left / R.total)) * 100}%`;
  if (left <= 0) {
    vibrate([150, 80, 150]);
    beep(2);
    const label = bar.querySelector('.rb-text small');
    if (label) label.textContent = '휴식 끝! 다음 세트 시작 💪';
    clearInterval(R.timer);
    const cur = R;
    setTimeout(() => {
      if (R === cur) stopRest();
    }, 2500);
  }
}

export function stopRest() {
  if (!R) return;
  clearInterval(R.timer);
  R = null;
  el().classList.remove('show');
}
