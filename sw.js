/* Command Center service worker: lets the app open offline. Never touches Supabase. */
var V = 'cc-v1';
self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || /\.supabase\.co$/.test(u.hostname)) return;
  if (u.origin === self.location.origin) {
    e.respondWith(fetch(r).then(function (res) { var c = res.clone(); caches.open(V).then(function (ch) { ch.put(r, c); }); return res; })
      .catch(function () { return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match('./', { ignoreSearch: true }); }); }));
  } else {
    e.respondWith(caches.open(V).then(function (ch) { return ch.match(r).then(function (m) {
      var f = fetch(r).then(function (res) { if (res && (res.ok || res.type === 'opaque')) ch.put(r, res.clone()); return res; }).catch(function () { return m; });
      return m || f;
    }); }));
  }
});
