// UI 공통: 아이콘, 토스트, 바텀시트, 확인창, 이벤트 위임
import { esc } from './utils.js';

const svg = (d, extra = '') =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICON = {
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.6"'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  play: svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>'),
  pause: svg('<path d="M8.5 5v14M15.5 5v14"/>', 'stroke-width="3"'),
  next: svg('<path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  calendar: svg('<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  more: svg('<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  timer: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M10 2.5h4"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  share: svg('<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5v9h14v-9h-1"/>'),
  // 탭바
  tabToday: svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.2"/>'),
  tabMeals: svg('<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 3.5c-.9 1.7.9 2.6 0 4.5M13.5 3.5c-.9 1.7.9 2.6 0 4.5"/>'),
  tabWorkout: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  tabReport: svg('<path d="M5 20V11M12 20V4.5M19 20v-6.5"/>'),
  tabMe: svg('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.4-3.8 4.3-5.8 7.5-5.8s6.1 2 7.5 5.8"/>'),
};

/* ───────── 이벤트 위임 ───────── */

export function bindDelegation(root, getActions) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t || !root.contains(t)) return;
    const fn = getActions()[t.dataset.action];
    if (fn) fn(t, e);
  });
  for (const type of ['change', 'input']) {
    root.addEventListener(type, (e) => {
      const t = e.target.closest(`[data-${type}]`);
      if (!t || !root.contains(t)) return;
      const fn = getActions()[t.dataset[type]];
      if (fn) fn(t, e);
    });
  }
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target.closest('[data-enter]');
    if (!t) return;
    const fn = getActions()[t.dataset.enter];
    if (fn) {
      e.preventDefault();
      fn(t, e);
    }
  });
}

/* ───────── 토스트 ───────── */

export function toast(msg, { action, onAction, ms = 2200 } = {}) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  el.classList.add('show');
  if (action) {
    el.querySelector('button').onclick = () => {
      el.classList.remove('show');
      onAction?.();
    };
  }
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), action ? Math.max(ms, 5000) : ms);
}

/* ───────── 바텀 시트 ───────── */

const stack = [];

export function openSheet({ title = '', render, actions = {}, onMount, onClose, className = '', footer }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `
    <div class="sheet-backdrop"></div>
    <div class="sheet ${className}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grab"></div>
      <div class="sheet-head"><h3>${esc(title)}</h3>
        <button class="icon-btn" type="button" data-action="__close" aria-label="닫기">${ICON.close}</button></div>
      <div class="sheet-body"></div>
      ${footer ? '<div class="sheet-foot"></div>' : ''}
    </div>`;
  const body = wrap.querySelector('.sheet-body');
  const foot = wrap.querySelector('.sheet-foot');
  let closed = false;
  const api = {
    el: wrap,
    body,
    actions,
    data: {},
    refresh({ keepScroll = true } = {}) {
      const y = body.scrollTop;
      body.innerHTML = render(api);
      if (foot) foot.innerHTML = footer(api);
      if (keepScroll) body.scrollTop = y;
      onMount?.(api);
    },
    setTitle(t) {
      wrap.querySelector('.sheet-head h3').textContent = t;
    },
    close() {
      if (closed) return;
      closed = true;
      wrap.classList.remove('open');
      const i = stack.indexOf(api);
      if (i >= 0) stack.splice(i, 1);
      setTimeout(() => wrap.remove(), 260);
      if (!stack.length) document.body.classList.remove('locked');
      onClose?.();
    },
  };
  actions.__close = () => api.close();
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => api.close());
  bindDelegation(wrap, () => api.actions);
  document.getElementById('layer').appendChild(wrap);
  stack.push(api);
  document.body.classList.add('locked');
  api.refresh({ keepScroll: false });
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  return api;
}

export const topSheet = () => stack[stack.length - 1];
export const closeAllSheets = () => [...stack].forEach((s) => s.close());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') topSheet()?.close();
});

export function confirmBox(message, { ok = '확인', cancel = '취소', danger = false, title = '확인' } = {}) {
  return new Promise((resolve) => {
    let decided = false;
    const s = openSheet({
      title,
      className: 'sheet-confirm',
      render: () => `
        <p class="confirm-msg">${esc(message).replace(/\n/g, '<br>')}</p>
        <div class="btn-row">
          <button class="btn secondary" type="button" data-action="no">${esc(cancel)}</button>
          <button class="btn ${danger ? 'danger' : ''}" type="button" data-action="yes">${esc(ok)}</button>
        </div>`,
      actions: {
        yes: () => {
          decided = true;
          resolve(true);
          s.close();
        },
        no: () => s.close(),
      },
      onClose: () => {
        if (!decided) resolve(false);
      },
    });
  });
}

/* ───────── 차트 툴팁 (탭/호버) ───────── */

let tipEl;
export function initTooltips() {
  tipEl = document.createElement('div');
  tipEl.className = 'chart-tip';
  document.body.appendChild(tipEl);
  const show = (t, x, y) => {
    tipEl.innerHTML = esc(t.dataset.tip).replace(/\|/g, '<br>');
    tipEl.classList.add('show');
    const r = tipEl.getBoundingClientRect();
    const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    tipEl.style.left = `${left}px`;
    tipEl.style.top = `${Math.max(8, y - r.height - 12)}px`;
  };
  const hide = () => tipEl.classList.remove('show');
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t && e.pointerType === 'mouse') show(t, e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t && e.pointerType === 'mouse') show(t, e.clientX, e.clientY);
    else if (e.pointerType === 'mouse') hide();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t && e.pointerType !== 'mouse') show(t, e.clientX, e.clientY);
    else if (e.pointerType !== 'mouse') hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
}

/* ───────── 테마 ───────── */

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  const dark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute('content', dark ? '#0F1115' : '#F3F5F7');
  });
}
