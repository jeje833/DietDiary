// 앱 진입점: 라우팅, 렌더링, 공통 액션, 서비스워커
import { S, subscribe, onSaveError, routinesForDate } from './store.js';
import { ctx } from './ctx.js';
import { addDays, todayKey } from './utils.js';
import { ICON, bindDelegation, toast, initTooltips, applyTheme, closeAllSheets } from './ui.js';
import * as today from './views/today.js';
import * as meals from './views/meals.js';
import * as workout from './views/workout.js';
import * as report from './views/report.js';
import * as me from './views/me.js';
import { openOnboarding } from './views/onboarding.js';
import { startReminders } from './reminders.js';
import { playRoutines } from './views/routine-sheets.js';
import './install.js';

const VIEWS = { today, meals, workout, report, me };
const TABS = [
  { id: 'today', label: '오늘', icon: ICON.tabToday },
  { id: 'meals', label: '식단', icon: ICON.tabMeals },
  { id: 'workout', label: '운동', icon: ICON.tabWorkout },
  { id: 'report', label: '리포트', icon: ICON.tabReport },
  { id: 'me', label: '나', icon: ICON.tabMe },
];

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

/* ───────── 렌더링 ───────── */

function goTab(tab) {
  closeAllSheets();
  if (tab === ctx.tab) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  history.replaceState(null, '', `#/${tab}`);
  route();
}
ctx.go = goTab;

function render() {
  const v = VIEWS[ctx.tab];
  viewEl.innerHTML = v.render();
  v.mount?.(viewEl);
}
ctx.rerender = render;

function renderTabbar() {
  tabbar.innerHTML = TABS.map(
    (t) => `<a href="#/${t.id}" class="tab ${ctx.tab === t.id ? 'on' : ''}" data-tab="${t.id}" aria-label="${t.label}" ${ctx.tab === t.id ? 'aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></a>`,
  ).join('');
}

function route() {
  const tab = location.hash.replace(/^#\/?/, '').split('?')[0];
  const next = VIEWS[tab] ? tab : 'today';
  const changed = next !== ctx.tab;
  ctx.tab = next;
  renderTabbar();
  render();
  if (changed) window.scrollTo(0, 0);
}

/* ───────── 공통 액션 (날짜 스트립 등) ───────── */

const dateInput = document.createElement('input');
dateInput.type = 'date';
dateInput.className = 'hidden-date';
dateInput.setAttribute('aria-hidden', 'true');
dateInput.tabIndex = -1;
document.body.appendChild(dateInput);
dateInput.addEventListener('change', () => {
  if (dateInput.value) setDate(dateInput.value);
});

function setDate(key) {
  ctx.date = key;
  render();
}

const common = {
  dsSelect: (b) => setDate(b.dataset.key),
  dsPrev: () => setDate(addDays(ctx.date, -7)),
  dsNext: () => setDate(addDays(ctx.date, 7)),
  dsToday: () => setDate(todayKey()),
  dsPick: () => {
    dateInput.value = ctx.date;
    try {
      dateInput.showPicker();
    } catch {
      dateInput.click();
    }
  },
};

bindDelegation(viewEl, () => ({ ...common, ...VIEWS[ctx.tab].actions }));

// 날짜 스트립 좌우 스와이프로 주 이동
let touch = null;
viewEl.addEventListener('touchstart', (e) => {
  const strip = e.target.closest('[data-swipe="week"]');
  touch = strip ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
viewEl.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) setDate(addDays(ctx.date, dx < 0 ? 7 : -7));
}, { passive: true });

tabbar.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-tab]');
  if (!a) return;
  e.preventDefault();
  goTab(a.dataset.tab);
});

/* ───────── 날짜가 바뀌면(자정) 오늘로 이동 ───────── */

let lastToday = todayKey();
function checkDayChange() {
  const t = todayKey();
  if (t !== lastToday) {
    if (ctx.date === lastToday) ctx.date = t;
    lastToday = t;
    render();
  }
}
setInterval(checkDayChange, 60000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkDayChange());

/* ───────── 초기화 ───────── */

onSaveError(() => toast('저장 공간이 부족해요. 오래된 사진을 정리하거나 백업 후 초기화해 주세요', { ms: 5000 }));

subscribe(() => {
  render();
  if (!S().onboarded) openOnboarding();
});

applyTheme(S().settings.theme);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(S().settings.theme));
window.addEventListener('hashchange', route);
window.addEventListener('dd:install-ready', () => ctx.tab === 'me' && render());
initTooltips();
route();
if (!S().onboarded) openOnboarding();

startReminders((r) => {
  ctx.date = todayKey();
  const fresh = routinesForDate(ctx.date).find((x) => x.id === r.id);
  if (fresh) playRoutines([fresh], fresh.title, ctx.date);
});

// 저장 공간이 브라우저에 의해 지워지지 않도록 요청
navigator.storage?.persist?.().catch(() => {});

/* ───────── 서비스워커 (오프라인 + 업데이트 알림) ───────── */

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const notify = (worker) => {
        toast('새 버전이 준비됐어요', {
          action: '업데이트',
          ms: 10000,
          onAction: () => worker.postMessage('skipWaiting'),
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) notify(nw);
        });
      });
      let reloading = false;
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading || !hadController) return; // 첫 설치 때는 새로고침하지 않음
        reloading = true;
        location.reload();
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      /* 오프라인 지원 없이 동작 */
    }
  });
}
