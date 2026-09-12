/* Keeps the app openable with no network at all.
 *
 * Only the app's own files are cached.  Video thumbnails are left alone on
 * purpose: they are fetched from YouTube by the viewer's browser and are not
 * ours to store or hand on (see context/WORKOUT_APP_PUBLISH_RESEARCH_20260910.md 3.3).
 */
'use strict';

/* Renamed on purpose. Everything not called this is thrown away when a new
 * worker activates, and a phone that met the version which answered with
 * index.html where a picture belonged is still holding those answers - the
 * companions come back as 絵なし until the store they are in is emptied. */
const VERSION = 'ouchitore-v3';
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

/* Every change to the stored page goes through one chain, so two
 * navigations (or a navigation and an activate) never interleave their
 * store-and-sweep and leave a page whose scripts are gone (Codex review,
 * second pass). */
let updating = Promise.resolve();

const ROOT_PATH = new URL('./', self.location.href).pathname;
function isTheAppPage(url) {
  return url.pathname === ROOT_PATH || url.pathname === ROOT_PATH + 'index.html';
}

/* Take a fetched page in, in the only safe order: first make sure every
 * script it names is stored, then store the page under both of its
 * addresses, and only then throw away scripts nothing names any more. A
 * phone that goes offline in the middle keeps a page whose scripts exist. */
function takeIn(html, pageResponseA, pageResponseB) {
  return caches.open(VERSION).then(cache => {
    const wanted = wantedFrom(html).filter(one => one !== './' && one !== './index.html');
    return Promise.all(wanted.map(one => cache.match(one).then(hit => hit ? null
      : fetch(one, { cache: 'no-store' }).then(r => { if (r && r.ok) return cache.put(one, r); }))))
      .then(() => Promise.all([
        cache.put(new Request(new URL('./', self.location.href).href), pageResponseA),
        cache.put(new Request(new URL('./index.html', self.location.href).href), pageResponseB)
      ]))
      .then(() => sweepHtml(html));
  });
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
      /* Only this app's own older stores: another app on the same host
       * (GitHub Pages puts many under one origin) keeps its cache. */
      .then(names => Promise.all(names.filter(name => name !== VERSION && name.indexOf('ouchitore-') === 0)
        .map(name => caches.delete(name))))
      /* Yesterday's scripts are still in here under yesterday's ?v=, and
       * nothing would ever ask for them again. The cache name only changes
       * when this file changes, so without this they pile up for good. */
      .then(() => fetch('./index.html', { cache: 'no-store' }).then(page => {
        const a = page.clone(), b = page.clone();
        return page.text().then(html => { updating = updating.then(() => takeIn(html, a, b)).catch(() => { }); return updating; });
      }).catch(() => { }))
      .then(() => self.clients.claim())
  );
});

/* Throw away the versioned copies of files this page no longer names. */
function sweep(page) {
  return page.text().then(sweepHtml);
}

function sweepHtml(html) {
  return Promise.resolve().then(() => {
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
      /* no-store, so the page really does come from the network. Asking for it
       * plainly lets the browser answer out of its own HTTP cache - GitHub
       * Pages sends max-age=600 on HTML - and then the phone keeps requesting
       * yesterday's scripts by their old ?v= for as long as that lasts. Seen
       * happening locally: a plain reload showed the previous version while
       * the same URL with a query on the end showed the new one. */
      fetch(request.url, { cache: 'no-store', credentials: 'same-origin' }).then(fresh => {
        /* Only the app's own page is taken in; selftest.html and the
         * design boards are navigations too, and must never become the
         * stored start page (Codex review, second pass). */
        if (fresh && fresh.ok && isTheAppPage(url)) {
          const a = fresh.clone(), b = fresh.clone(), c = fresh.clone();
          event.waitUntil(c.text().then(html => {
            updating = updating.then(() => takeIn(html, a, b)).catch(() => { });
            return updating;
          }));
        }
        return fresh;
      }).catch(() => caches.open(VERSION).then(cache =>
        cache.match(request).then(hit => hit || cache.match('./index.html'))))
    );
    return;
  }

  event.respondWith(
    caches.open(VERSION).then(cache => cache.match(request)).then(hit => {
      if (hit) {
        /* Refresh in the background so an update lands on the next open;
         * the worker is kept alive until the write is done. */
        event.waitUntil(fetch(request).then(fresh => {
          if (fresh && fresh.ok) return caches.open(VERSION).then(cache => cache.put(request, fresh.clone()));
        }).catch(() => { }));
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
          event.waitUntil(caches.open(VERSION).then(cache => cache.put(request, copy)));
        }
        return fresh;
      });
    })
  );
});
