// DietDiary 서비스워커: 앱 파일을 캐시해 오프라인에서도 동작
// 배포할 때마다 VERSION 을 올리면 사용자에게 '새 버전' 알림이 떠요
const VERSION = '1.0.0';
const CACHE = `dietdiary-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/favicon.svg',
  'icons/icon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/app.js',
  'js/components/charts.js',
  'js/components/datestrip.js',
  'js/ctx.js',
  'js/data/exercises.js',
  'js/data/foods.js',
  'js/data/templates.js',
  'js/install.js',
  'js/photos.js',
  'js/player.js',
  'js/reminders.js',
  'js/resttimer.js',
  'js/store.js',
  'js/ui.js',
  'js/utils.js',
  'js/views/me.js',
  'js/views/meals.js',
  'js/views/onboarding.js',
  'js/views/report.js',
  'js/views/routine-sheets.js',
  'js/views/shared.js',
  'js/views/today.js',
  'js/views/workout.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('dietdiary-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 캐시된 앱 셸 사용 (오프라인 지원)
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(req)).catch(() => caches.match('index.html')),
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./#/today');
    }),
  );
});
