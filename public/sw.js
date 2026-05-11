/**
 * sw.js — ClinicOS Service Worker
 * Strategy:
 *  - App shell (JS/CSS/fonts): Cache-First
 *  - API requests (Supabase): Network-First with offline fallback
 *  - Navigation requests: Network-First → fall back to cached /
 *
 * NOTE: In development (localhost) we skip all caching to avoid
 * interfering with Next.js hot-reload and server-sent events.
 */

const CACHE_NAME = 'clinicos-v1';
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// In development, only enable the service worker when offline to avoid 
// interfering with Next.js Hot Module Replacement (HMR).
function shouldSkip() {
  if (IS_DEV) {
    return navigator.onLine; // Skip if online in dev
  }
  return false; // Never skip in production
}

const APP_SHELL = [
  '/',
  '/dashboard',
  '/dashboard/patients',
  '/dashboard/appointments',
];


// -----------------------------------------------------------------------
// Install – pre-cache app shell
// -----------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Non-fatal: pages may not exist yet during first install
      });
    })
  );
  self.skipWaiting();
});

// -----------------------------------------------------------------------
// Activate – remove old caches
// -----------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// -----------------------------------------------------------------------
// Fetch – routing strategies
// -----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip interception based on environment and connectivity
  if (shouldSkip()) return;

  // Skip non-GET requests & chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Supabase API → Network-First
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // _next static assets → Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation (HTML pages) → Network-First, fallback to cached /
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Everything else → Network-First
  event.respondWith(networkFirst(request));
});

// -----------------------------------------------------------------------
// Strategy helpers
// -----------------------------------------------------------------------

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('Offline', { status: 503 });
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch {
    // Offline – try exact match first, then root
    const cached =
      (await caches.match(request)) ?? (await caches.match('/'));
    if (cached) return cached;
  }
  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
