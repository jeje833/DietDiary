// 루틴 알림: 앱이 열려 있는 동안 지정 시간이 되면 알림 (정적 사이트라 서버 푸시는 없음)
import { S, routinesForDate, statusOf } from './store.js';
import { todayKey } from './utils.js';
import { toast } from './ui.js';

const FIRED_KEY = 'dietdiary:fired';

function firedSet() {
  try {
    const v = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}');
    return v.date === todayKey() ? v : { date: todayKey(), ids: [] };
  } catch {
    return { date: todayKey(), ids: [] };
  }
}

export const notifySupported = () => 'Notification' in window;

export async function requestNotify() {
  if (!notifySupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

async function show(title, body) {
  if (notifySupported() && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: title, vibrate: [200, 100, 200] });
        return;
      }
      new Notification(title, { body, icon: 'icons/icon-192.png' });
    } catch {
      /* 무시 */
    }
  }
}

function check(onStart) {
  if (!S().settings.notify) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const key = todayKey();
  const fired = firedSet();
  let changed = false;
  for (const r of routinesForDate(key)) {
    if (!r.time || statusOf(key, r.id) || fired.ids.includes(r.id)) continue;
    const [h, m] = r.time.split(':').map(Number);
    const diff = nowMin - (h * 60 + m);
    if (diff < 0 || diff > 5) continue; // 지정 시각 ~ 5분 이내만
    fired.ids.push(r.id);
    changed = true;
    show(`${r.emoji} ${r.title}`, `${r.time} · ${r.duration ? `${r.duration}분 루틴` : '루틴'}을 할 시간이에요`);
    if (document.visibilityState === 'visible') {
      toast(`⏰ ${r.emoji} ${r.title} 할 시간이에요`, { action: '시작', onAction: () => onStart?.(r) });
    }
  }
  if (changed) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

export function startReminders(onStart) {
  setInterval(() => check(onStart), 20000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check(onStart));
  setTimeout(() => check(onStart), 1500);
}

