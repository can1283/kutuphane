const CACHE_NAME = 'kutuphane-pwa-v2';

// Sadece kendi sunucumuzdaki yerel dosyaları önbelleğe alıyoruz
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Yükleme Aşaması
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Yerel dosyalar önbelleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Etkinleştirme Aşaması (Eski önbellekleri temizler)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Ağ İsteği Yakalama (Stale-While-Revalidate + Dış CDN Koruması)
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 1. Dış CDN ve Firebase isteklerini Service Worker müdahale etmeden direkt ağa yönlendir
  if (requestUrl.origin !== location.origin) {
    return; // Doğrudan ağa bırakır, CORS hatası vermesini engeller
  }

  // 2. Yerel dosyalar için Stale-While-Revalidate stratejisi
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
