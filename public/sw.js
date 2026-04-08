// ═══════════════════════════════════════════════════════════════
// PocketPost Service Worker v3 — Nuclear Cache-Busting Edition
// ═══════════════════════════════════════════════════════════════
//
// CRITICAL DESIGN DECISIONS:
//   1. Navigation requests → ALWAYS network, NEVER cached
//   2. version.json, sw.js, manifest.json → ALWAYS network
//   3. Static assets (images, fonts) → stale-while-revalidate
//   4. JS/CSS bundles → network-first (so deploys propagate fast)
//   5. skipWaiting + clients.claim → instant takeover
//
// On every deploy, bump APP_VERSION in lockstep with version.json

const APP_VERSION = '1.0.0';
const CACHE_NAME = `pocketpost-v${APP_VERSION}`;

// Only cache truly static assets (logos, icons)
const PRECACHE_URLS = [
  '/LOGO.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Files that must NEVER be cached under any circumstance
const NEVER_CACHE = [
  'version.json',
  'sw.js',
  'manifest.json',
  '/api/',
  'firebaseapp',
  'googleapis',
  'gstatic',
];

// ─── Install ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${APP_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't block install if precache partially fails
        console.warn('[SW] Precache partial failure:', err);
      });
    })
  );
  // CRITICAL: Take over immediately, don't wait for old tabs to close
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${APP_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Destroying old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log(`[SW] v${APP_VERSION} is now active and controlling all clients`);
      // CRITICAL: Claim all open tabs/webviews immediately
      return self.clients.claim();
    })
  );
});

// ─── Fetch ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Skip non-GET
  if (request.method !== 'GET') return;

  // 2. Skip cross-origin entirely (Firebase SDK, analytics, fonts CDN, etc.)
  if (!url.startsWith(self.location.origin)) return;

  // 3. NEVER cache certain files — always go straight to network
  if (NEVER_CACHE.some((pattern) => url.includes(pattern))) {
    event.respondWith(
      fetch(request).catch(() => {
        // If network fails for never-cache files, return a basic error
        return new Response('Network error', { status: 503 });
      })
    );
    return;
  }

  // 4. Navigation requests (HTML pages) → ALWAYS network, NO caching
  //    This is the #1 fix for mobile/WebView users getting stuck
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // Offline fallback: try to serve cached root
        return caches.match('/').then((cached) => {
          return cached || new Response('You are offline. Please reconnect and try again.', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          });
        });
      })
    );
    return;
  }

  // 5. JS/CSS bundles → network-first (ensures deploy updates propagate fast)
  if (url.match(/\.(js|css)(\?|$)/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('', { status: 503 });
          });
        })
    );
    return;
  }

  // 6. Static assets (images, fonts) → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

// ─── Message handler ────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Allow client to request full cache purge
  if (event.data && event.data.type === 'PURGE_CACHES') {
    caches.keys().then((names) => {
      Promise.all(names.map((n) => caches.delete(n))).then(() => {
        console.log('[SW] All caches purged by client request');
      });
    });
  }
});
