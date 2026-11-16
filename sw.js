/* NeuroDifference service worker — app-shell cache, offline-first reads.
   Bump VERSION on every release: the old cache name is deleted on activate so
   a stale shell can never outlive a deploy. */

const VERSION = "nd-v3.0.0";
const V = "3.0.0";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-maskable.svg",
  "./app/styles.css",
  "./app/skin.css",
  "./app/clinic.css",
  "./app/main.js",
  "./app/core.js",
  "./app/srs.js",
  "./app/lib/pubmed.js",
  "./app/lib/pk.js",
  "./app/data/compounds.js",
  "./app/data/compounds-a.js",
  "./app/data/compounds-b.js",
  "./app/data/compounds-c.js",
  "./app/data/compounds-d.js",
  "./app/data/compounds-e.js",
  "./app/data/compounds-f.js",
  "./app/data/neuro.js",
  "./app/data/atlas.js",
  "./app/data/organs.js",
  "./app/data/interactions.js",
  "./app/data/learn.js",
  "./app/data/card-queries.js",
  "./app/data/brainmap.js",
  "./app/data/conditions.js",
  "./app/data/conditions-a.js",
  "./app/data/conditions-b.js",
  "./app/data/conditions-c.js",
  "./app/data/bloodwork.js",
  "./app/data/bloodwork-a.js",
  "./app/data/bloodwork-b.js",
  "./app/views/ui.js",
  "./app/views/home.js",
  "./app/views/compounds.js",
  "./app/views/neuro.js",
  "./app/views/brain.js",
  "./app/views/lab.js",
  "./app/views/taper.js",
  "./app/views/compare.js",
  "./app/views/learn.js",
  "./app/views/evidence.js",
  "./app/views/research.js",
  "./app/views/ask.js",
  "./app/views/notes.js",
  "./app/views/settings.js",
  "./app/views/atlas.js",
  "./app/views/organs.js",
  "./app/views/map.js",
  "./app/views/calculator.js",
  "./app/views/conditions.js",
  "./app/views/bloodwork.js",
  "./app/views/pk.js",
  "./app/views/stack.js",
  "./app/views/symptoms.js",
  "./app/views/emergency.js",
  "./app/views/audit.js",
];

/* Install: cache what we can, never fail the whole worker because one file
   moved. Old caches are removed on activate, so a partial shell self-heals on
   the next fetch. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "ND_ACTIVATED", version: V })))
      .catch(() => undefined)
  );
});

/* A page can ask a waiting worker to take over immediately. */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept third-party traffic (PubMed, fonts) — those have their own
  // caching rules and must stay live.
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, cached shell as the offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put("./index.html", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches
            .match("./index.html")
            .then((r) => r || caches.match("./"))
            .then((r) => r || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } }))
        )
    );
    return;
  }

  // Assets: stale-while-revalidate so the UI paints from cache instantly and
  // the next load already has the fresh file.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});