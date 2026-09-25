/* MediMind service worker — runtime cache-first so the app works offline after first visit. */
const CACHE = 'medimind-v15';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    event.respondWith(
        caches.match(req).then((hit) => {
            if (hit) return hit;
            return fetch(req).then((res) => {
                if (res && res.ok && new URL(req.url).origin === self.location.origin) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy));
                }
                return res;
            }).catch(() => {
                // Offline: fall back to the landing page for navigations
                if (req.mode === 'navigate') return caches.match('./index.html');
                return caches.match(req);
            });
        })
    );
});
