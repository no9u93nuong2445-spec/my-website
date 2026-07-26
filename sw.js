const CACHE_NAME = 'heart-training-loader-v212';
const FALLBACK_PAGE = './index.html';
const CORE_FILES = ['./', './index.html', './manifest.json', './icon.svg'];

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
          caches.open(CACHE_NAME).then(cache => cache.put(canonical, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(canonical);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match(FALLBACK_PAGE);
        throw new Error('offline resource unavailable');
      })
  );
});
