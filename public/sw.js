/**
 * sw.js — ClinicOS Smart Service Worker (Optimized)
 */

const CACHE_NAME = 'clinicos-v2';
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// 1. Install - Immediate Takeover
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate - Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3. Fetch - Transparent Proxy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip dev and non-GET
  if (IS_DEV && navigator.onLine) return;
  if (request.method !== 'GET') return;

  // Static Assets -> Cache-First
  if (url.pathname.startsWith('/_next/static/') || url.pathname.includes('/fonts/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Navigations & API -> Network-First (No aggressive 503)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !url.pathname.includes('/api/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // Final fallback for navigations only
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        
        // Let it fail naturally if nothing is found (don't return custom 503)
        throw new Error('Truly offline');
      })
  );
});

