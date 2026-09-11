/* Keeps the app openable with no network at all.
 *
 * Only the app's own files are cached.  Video thumbnails are left alone on
 * purpose: they are fetched from YouTube by the viewer's browser and are not
 * ours to store or hand on (see context/WORKOUT_APP_PUBLISH_RESEARCH_20260910.md 3.3).
 */
'use strict';

const VERSION = 'ouchitore-v1';
const SHELL = ['./', './index.html', './store.js', './app.js', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== VERSION).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // thumbnails and video links pass straight through

  /* The page itself is asked for over the network first, and only falls back
   * to the stored copy when there is none.  Everything else can be served from
   * store and refreshed behind you, because index.html names the scripts with
   * a ?v=NN that changes whenever they do - a new number is a new address, so
   * a stale copy is never the one that matches.  Serving a stale index.html,
   * on the other hand, means the phone keeps asking for the old scripts by
   * their old numbers and never sees the update at all. */
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(request).then(fresh => {
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
        }
        return fresh;
      }).catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) {
        /* Refresh in the background so an update lands on the next open. */
        fetch(request).then(fresh => {
          if (fresh && fresh.ok) caches.open(VERSION).then(cache => cache.put(request, fresh.clone()));
        }).catch(() => { });
        return hit;
      }
      return fetch(request).then(fresh => {
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
        }
        return fresh;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
