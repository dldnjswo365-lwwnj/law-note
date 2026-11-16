/* 지적 법령 노트 — 오프라인 저장(서비스 워커)
   - 첫 접속 때 앱 파일을 기기에 저장하고, 이후에는 인터넷 없이도 열린다.
   - 인터넷이 되면 화면(index.html)은 항상 서버에 새 파일이 있는지 확인하고(최대 15초 기다림), 오프라인이면 저장된 파일을 쓴다.
   - 앱이 새 버전으로 바뀌면 이 파일의 CACHE 이름을 바꿔 새 파일을 받는다.
   - 학습 기록은 localStorage 에 있으므로 이 캐시와 무관하다(캐시가 지워져도 기록은 남는다). */
const CACHE = 'jeokjeuk-v14';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('jeokjeuk-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(req, { ignoreSearch: true }) || (isPage ? await c.match('./index.html') : undefined);
    const net = (isPage ? fetch(req.url, { cache: 'no-cache' }) : fetch(req)).then(r => { if (r && r.ok) c.put(isPage ? './index.html' : req, r.clone()); return r; }).catch(() => undefined);
    if (isPage) {
      const first = await Promise.race([net, new Promise(r => setTimeout(() => r(undefined), 15000))]);
      return first || cached || (await net) || new Response('오프라인 상태이고 저장된 파일이 없어요. 인터넷에 연결한 뒤 한 번 열어 주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return cached || (await net) || new Response('', { status: 504 });
  }));
});
