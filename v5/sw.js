/* NeuroDifference v5 (Field Lab) service worker — scoped to /v5/.
   Cache names are prefixed nd-v5 so this worker can never evict the main
   site's shell cache (cache storage is shared per origin). */

const VERSION = "nd-v5.0.0";
const V = "5.0.0";

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
  "./app/lib/brain3d.js",
  "./app/lib/i18n.js",
  "./app/data/compounds.js",
  "./app/data/compounds-a.js",
  "./app/data/compounds-b.js",
  "./app/data/compounds-c.js",
  "./app/data/compounds-d.js",
  "./app/data/compounds-e.js",
  "./app/data/compounds-f.js",
  "./app/data/compounds-g.js",
  "./app/data/compounds-h.js",
  "./app/data/compounds-i.js",
  "./app/data/compounds-j.js",
  "./app/data/neuro.js",
  "./app/data/atlas.js",
  "./app/data/organs.js",
  "./app/data/interactions.js",
  "./app/data/interactions-g.js",
  "./app/data/learn.js",
  "./app/data/card-queries.js",
  "./app/data/brainmap.js",
  "./app/data/brain-anatomy.js",
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
      // Only ever touch v5 caches — the main site's nd-v4 cache must survive.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("nd-v5") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .catch(() => undefined)
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const p = url.pathname;
          const isShell = p.endsWith("/") || p.endsWith("/index.html");
          if (res && res.ok && isShell) {
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
