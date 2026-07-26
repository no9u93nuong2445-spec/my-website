const CACHE_NAME = 'heart-training-v2007';
const CORE_FILES = [
  './index.html',
  './manifest.json',
  './icon.svg',
  ...Array.from({ length: 12 }, (_, index) =>
    `./webdata/part-${String(index + 1).padStart(2, '0')}.txt`
  )
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function canonicalRequest(request) {
  const url = new URL(request.url);
  return new Request(url.origin + url.pathname, { method: 'GET' });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const canonical = canonicalRequest(event.request);
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(canonical, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(canonical);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('offline resource unavailable');
      })
  );
});
