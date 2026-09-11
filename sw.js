/* Keeps the app openable with no network at all.
 *
 * Only the app's own files are cached.  Video thumbnails are left alone on
 * purpose: they are fetched from YouTube by the viewer's browser and are not
 * ours to store or hand on (see context/WORKOUT_APP_PUBLISH_RESEARCH_20260910.md 3.3).
 */
'use strict';

const VERSION = 'ouchitore-v2';
const ALWAYS = ['./', './index.html', './manifest.webmanifest', './tokens.css'];

/* What the app is made of, read off the page rather than written down here.
 *
 * index.html names its scripts with a ?v=NN that changes whenever they do, so
 * a list kept in this file would be a second copy of the truth and would drift
 * from it - and the wrong copy is the one that gets cached. Worse, a version
 * this file has not heard of is not stored at install, and a phone carried out
 * of signal before the page had a chance to store it for itself will not
 * start: index.html comes back, its scripts do not.
 *
 * So: fetch the page, take the addresses out of its script tags, and store
 * exactly those.
 */
function wantedFrom(html) {
  const found = [];
  const tags = /<script[^>]+src=["']([^"']+)["']/gi;
  let hit;
  while ((hit = tags.exec(html)) !== null) found.push('./' + hit[1].replace(/^\.\//, ''));
  return ALWAYS.concat(found);
}

function whatThePageNeeds() {
  return fetch('./index.html', { cache: 'no-store' })
    .then(page => page.text())
    .then(wantedFrom)
    .catch(() => ALWAYS.slice());
}

self.addEventListener('install', event => {
  event.waitUntil(
    whatThePageNeeds()
      .then(wanted => caches.open(VERSION).then(cache => cache.addAll(wanted)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== VERSION).map(name => caches.delete(name))))
      /* Yesterday's scripts are still in here under yesterday's ?v=, and
       * nothing would ever ask for them again. The cache name only changes
       * when this file changes, so without this they pile up for good. */
      .then(() => fetch('./index.html', { cache: 'no-store' }).then(sweep).catch(() => { }))
      .then(() => self.clients.claim())
  );
});

/* Throw away the versioned copies of files this page no longer names. */
function sweep(page) {
  return page.text().then(html => {
    const keep = wantedFrom(html).map(one => new URL(one, self.location.href).href);
    return caches.open(VERSION).then(cache => cache.keys().then(held => Promise.all(
      held.map(request => {
        if (!/\?v=\d+$/.test(request.url)) return null;
        if (keep.indexOf(request.url) >= 0) return null;
        return cache.delete(request);
      })
    )));
  }).catch(() => { });
}

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
          /* The page just told us which scripts it wants. Anything versioned
           * that it did not ask for is last week's, and nothing will ever ask
           * for it again - so it goes now, rather than waiting for this file
           * itself to change, which may be never. */
          event.waitUntil(sweep(fresh.clone()));
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
      /* No fallback here on purpose. This branch answers scripts, styles and
       * pictures, and handing back index.html when one of them cannot be
       * fetched gives the page HTML where JavaScript should be - which is not
       * a degraded app but a dead one: "Unexpected token '<'" and a screen
       * stuck on 読み込んでいます. Letting the request fail is honest, and the
       * page the browser already has keeps working. Only a navigation falls
       * back to the stored page, and that is handled above. */
      return fetch(request).then(fresh => {
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
        }
        return fresh;
      });
    })
  );
});
