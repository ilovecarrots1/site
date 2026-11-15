/* NeuroDifference — application shell, hash router, search, drawer.
 * Vanilla ES modules, no build step. Every view exports { render(ctx), mount(root, ctx) }.
 */

import { esc, icon, store, levelFor, debounce } from "./core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "./data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "./data/neuro.js";
import { COURSES, LESSONS_ALL, FLASHCARDS } from "./data/learn.js";
import { deckStats } from "./srs.js";

import * as homeView from "./views/home.js";
import * as compoundsView from "./views/compounds.js";
import * as neuroView from "./views/neuro.js";
import * as labView from "./views/lab.js";
import * as learnView from "./views/learn.js";
import * as evidenceView from "./views/evidence.js";
import * as askView from "./views/ask.js";
import * as notesView from "./views/notes.js";
import * as settingsView from "./views/settings.js";

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */

const NAV = [
  {
    section: "Study",
    items: [
      { id: "home", label: "Home", href: "#/", icon: "home" },
      { id: "compounds", label: "Compounds", href: "#/compounds", icon: "pill", count: () => COMPOUNDS.length },
      { id: "brain", label: "Brain map", href: "#/brain", icon: "brain", count: () => SYSTEMS.length },
      { id: "learn", label: "Learn", href: "#/learn", icon: "book" },
      { id: "cards", label: "Flashcards", href: "#/cards", icon: "layers", count: () => deckStats(FLASHCARDS).due || "" },
    ],
  },
  {
    section: "Tools",
    items: [
      { id: "lab", label: "Dose lab", href: "#/lab", icon: "flask" },
      { id: "interactions", label: "Interactions", href: "#/lab/interactions", icon: "shield" },
      { id: "evidence", label: "Evidence", href: "#/evidence", icon: "file" },
      { id: "ask", label: "Ask the index", href: "#/ask", icon: "sparkles" },
      { id: "notes", label: "Notebook", href: "#/notes", icon: "edit", count: () => (store.data.notes || []).length || "" },
    ],
  },
  {
    section: "",
    items: [{ id: "settings", label: "Settings", href: "#/settings", icon: "settings" }],
  },
];

const MOBILE_NAV = [
  { id: "home", label: "Home", href: "#/", icon: "home" },
  { id: "compounds", label: "Compounds", href: "#/compounds", icon: "pill" },
  { id: "brain", label: "Brain", href: "#/brain", icon: "brain" },
  { id: "learn", label: "Learn", href: "#/learn", icon: "book" },
  { id: "more", label: "More", icon: "menu", more: true },
];

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

const BRAND = `<span class="brand-mark">${icon("brain", 17)}</span>
  <span class="brand-text"><b>NeuroDifference</b><span>evidence · compounds</span></span>`;

function sidebarHtml() {
  const s = store.data;
  const lvl = levelFor(s.profile.xp || 0);
  return `<aside class="sidebar" id="sidebar">
    <a class="brand" href="#/">${BRAND}</a>
    ${NAV.map(
      (group) => `${group.section ? `<div class="side-label">${esc(group.section)}</div>` : `<div class="side-label">&nbsp;</div>`}
        ${group.items
          .map(
            (it) => `<a class="side-item" href="${it.href}" data-nav="${it.id}">
              ${icon(it.icon, 16)}<span>${esc(it.label)}</span>
              ${it.count ? `<span class="pill-count" data-count="${it.id}">${it.count()}</span>` : ""}
            </a>`
          )
          .join("")}`
    ).join("")}
    <div class="side-foot">
      <a class="side-xp" href="#/settings" style="text-decoration:none;color:inherit;display:block">
        <div class="lv"><b>${lvl.level}</b><span>level · ${s.profile.xp || 0} XP</span></div>
        <div class="meter"><i style="width:${Math.round((lvl.into / (lvl.need || 1)) * 100)}%"></i></div>
        <div class="tiny dim" style="margin-top:6px">${s.profile.streak || 0}-day streak${s.profile.streak ? " 🔥" : ""}</div>
      </a>
    </div>
  </aside>`;
}

function topbarHtml() {
  return `<header class="topbar">
    <button class="icon-btn menu-btn" id="btn-menu" aria-label="Open menu">${icon("menu", 20)}</button>
    <a class="brand" href="#/">${BRAND}</a>
    <div class="topbar-title" id="topbar-title">Home</div>
    <div class="topbar-actions">
      <button class="icon-btn" id="btn-search" aria-label="Search">
        ${icon("search", 18)}
      </button>
      <a class="icon-btn only-desktop" href="#/cards" aria-label="Flashcards due" style="position:relative">
        ${icon("layers", 18)}
        <span class="dot-badge" id="nav-cards-dot"></span>
      </a>
      <a class="icon-btn only-desktop" href="#/settings" aria-label="Settings">${icon("settings", 18)}</a>
    </div>
  </header>`;
}

function bottomNavHtml() {
  return `<nav class="bottom-nav" id="bottom-nav">
    ${MOBILE_NAV.map((it) =>
      it.more
        ? `<button class="nav-item" id="btn-more" style="background:none;border:0;font:inherit;cursor:pointer">${icon(it.icon, 20)}<span>${esc(it.label)}</span></button>`
        : `<a class="nav-item" href="${it.href}" data-nav="${it.id}">${icon(it.icon, 20)}<span>${esc(it.label)}</span></a>`
    ).join("")}
  </nav>`;
}

function mountShell(root) {
  root.innerHTML = `<div class="app">
      ${sidebarHtml()}
      <div class="main">
        ${topbarHtml()}
        <div class="view" id="view"></div>
      </div>
    </div>
    ${bottomNavHtml()}
    <div class="toast-host" id="toast-host"></div>`;

  document.getElementById("btn-menu")?.addEventListener("click", openDrawer);
  document.getElementById("btn-more")?.addEventListener("click", openDrawer);
  document.getElementById("btn-search")?.addEventListener("click", openSearch);

  const onScroll = debounce(() => {
    document.documentElement.setAttribute("data-scrolled", String(window.scrollY > 8));
  }, 60);
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Drawer (mobile menu)                                                */
/* ------------------------------------------------------------------ */

function openDrawer() {
  document.querySelectorAll(".drawer-host").forEach((el) => el.remove());
  const host = document.createElement("div");
  host.className = "drawer-host";
  host.innerHTML = `<div class="drawer-scrim" data-close></div>
    <div class="drawer">
      <a class="brand" href="#/" data-close>${BRAND}</a>
      ${NAV.map(
        (group) => `${group.section ? `<h4>${esc(group.section)}</h4>` : `<h4>Tuning</h4>`}
          ${group.items
            .map(
              (it) => `<a class="d-item" href="${it.href}" data-nav="${it.id}" data-close>
                ${icon(it.icon, 16)}<span>${esc(it.label)}</span>
                ${it.count ? `<span class="pill-count" style="margin-left:auto">${it.count()}</span>` : ""}
              </a>`
            )
            .join("")}`
      ).join("")}
      <div style="margin-top:auto;padding-top:14px">
        <button class="btn ghost sm block" data-search>${icon("search", 14)} Search everything</button>
      </div>
    </div>`;
  document.body.appendChild(host);
  host.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-search]")) {
      host.remove();
      openSearch();
      return;
    }
    if (ev.target.closest("[data-close]") || ev.target.classList.contains("drawer-scrim")) host.remove();
  });
}

/* ------------------------------------------------------------------ */
/* Search overlay                                                      */
/* ------------------------------------------------------------------ */

function buildIndex() {
  const items = [];
  for (const c of COMPOUNDS) {
    items.push({
      kind: "Compound",
      title: c.name,
      sub: `${c.cls} · ${c.evidence} evidence`,
      href: `#/compounds/${c.id}`,
      icon: "pill",
      hay: `${c.name} ${(c.aliases || []).join(" ")} ${c.cls} ${(c.tags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const s of SYSTEMS) {
    items.push({
      kind: "System",
      title: s.name,
      sub: s.tagline || "transmitter system",
      href: `#/brain/${s.id}`,
      icon: "activity",
      hay: `${s.name} ${s.abbr} ${(s.matchFlags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const { course, lesson } of LESSONS_ALL) {
    items.push({
      kind: "Lesson",
      title: lesson.title,
      sub: course.title,
      href: `#/learn/${course.id}/${lesson.id}`,
      icon: "book",
      hay: `${lesson.title} ${course.title}`.toLowerCase(),
    });
  }
  for (const [label, href, ico, sub] of [
    ["Home", "#/", "home", "dashboard"],
    ["Flashcards", "#/cards", "layers", "spaced repetition"],
    ["Brain map", "#/brain", "brain", "regions and pathways"],
    ["Dose lab", "#/lab", "flask", "pharmacokinetics sandbox"],
    ["Interaction checker", "#/lab/interactions", "shield", "stack safety"],
    ["Evidence", "#/evidence", "file", "research topics"],
    ["Ask", "#/ask", "sparkles", "retrieval assistant"],
    ["Notebook", "#/notes", "edit", "your notes"],
    ["Settings", "#/settings", "settings", "appearance and data"],
  ]) {
    items.push({ kind: "Page", title: label, sub, href, icon: ico, hay: `${label} ${sub}`.toLowerCase() });
  }
  return items;
}

let searchIndex = null;

function searchAll(q) {
  if (!searchIndex) searchIndex = buildIndex();
  const query = q.trim().toLowerCase();
  if (!query) {
    return searchIndex.filter((i) => i.kind === "Page").slice(0, 6);
  }
  const words = query.split(/\s+/);
  return searchIndex
    .map((item) => {
      let score = 0;
      for (const w of words) {
        const inTitle = item.title.toLowerCase().includes(w);
        if (inTitle) score += item.title.toLowerCase().startsWith(w) ? 8 : 5;
        if (item.hay.includes(w)) score += 2;
      }
      if (item.title.toLowerCase() === query) score += 20;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((x) => x.item);
}

function openSearch() {
  document.querySelectorAll(".overlay").forEach((el) => el.remove());
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="overlay-panel">
    <div class="overlay-search">
      ${icon("search", 17)}
      <input id="ov-input" type="text" placeholder="Search compounds, systems, lessons…" autocomplete="off" spellcheck="false">
      <button class="icon-btn" data-close aria-label="Close">${icon("x", 16)}</button>
    </div>
    <div class="overlay-results" id="ov-results"></div>
  </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#ov-input");
  const results = overlay.querySelector("#ov-results");
  let active = 0;
  let current = [];

  const paint = () => {
    current = searchAll(input.value);
    if (!current.length) {
      results.innerHTML = `<div class="sr-empty">No match. Try a compound name, a transmitter, or “interactions”.</div>`;
      return;
    }
    let html = "";
    let lastKind = "";
    current.forEach((item, i) => {
      if (item.kind !== lastKind) {
        html += `<div class="sr-group">${esc(item.kind)}${item.kind === "Compound" ? "s" : item.kind === "Lesson" ? "s" : item.kind === "System" ? "s" : "s"}</div>`;
        lastKind = item.kind;
      }
      html += `<a class="sr-item ${i === active ? "active" : ""}" href="${item.href}" data-i="${i}">
        ${icon(item.icon, 15)}
        <span class="grow"><span class="t">${esc(item.title)}</span><span class="s">${esc(item.sub)}</span></span>
        ${icon("chevronRight", 14)}
      </a>`;
    });
    results.innerHTML = html;
  };

  paint();
  setTimeout(() => input.focus(), 40);

  input.addEventListener("input", () => {
    active = 0;
    paint();
  });

  overlay.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]") || ev.target.classList.contains("overlay")) overlay.remove();
  });

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      active = Math.min(active + 1, current.length - 1);
      results.querySelectorAll(".sr-item").forEach((el, i) => el.classList.toggle("active", i === active));
      results.querySelectorAll(".sr-item")[active]?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      active = Math.max(active - 1, 0);
      results.querySelectorAll(".sr-item").forEach((el, i) => el.classList.toggle("active", i === active));
      results.querySelectorAll(".sr-item")[active]?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter") {
      const item = current[active];
      if (item) {
        overlay.remove();
        location.hash = item.href.replace(/^#/, "");
      }
    } else if (ev.key === "Escape") {
      overlay.remove();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

function notFound(segs) {
  return {
    nav: "",
    title: "Not found",
    view: {
      render: () =>
        `<div class="page-head"><div class="eyebrow">404</div><h1>Nothing at that address</h1>
         <p>“${esc(segs.join("/"))}” is not a route in this app.</p></div>
         <a class="btn primary" href="#/">${icon("home", 15)} Back home</a>`,
    },
  };
}

function matchRoute(segs) {
  const [a, b, c] = segs;

  if (!a) return { nav: "home", title: "Home", view: homeView };
  if (a === "compounds") {
    if (!b) return { nav: "compounds", title: "Compounds", view: compoundsView.list };
    const cmp = COMPOUND_BY_ID.get(b);
    return { nav: "compounds", title: cmp ? cmp.name : "Compound", view: compoundsView.detail, params: { id: b } };
  }
  if (a === "brain" || a === "systems") {
    if (!b) return { nav: "brain", title: "Brain map", view: neuroView.map };
    const sys = SYSTEM_BY_ID.get(b);
    return { nav: "brain", title: sys ? sys.name : "System", view: neuroView.system, params: { id: b } };
  }
  if (a === "lab") {
    if (b === "interactions") return { nav: "interactions", title: "Interactions", view: labView.interactions };
    return { nav: "lab", title: "Dose lab", view: labView.lab };
  }
  if (a === "learn") {
    if (!b) return { nav: "learn", title: "Learn", view: learnView.index };
    const course = COURSES.find((x) => x.id === b);
    if (!c) return { nav: "learn", title: course ? course.title : "Course", view: learnView.course, params: { courseId: b } };
    return { nav: "learn", title: course ? course.title : "Lesson", view: learnView.lesson, params: { courseId: b, lessonId: c } };
  }
  if (a === "cards" || a === "flashcards") return { nav: "cards", title: "Flashcards", view: learnView.cards };
  if (a === "evidence" || a === "studies") return { nav: "evidence", title: "Evidence", view: evidenceView.evidence };
  if (a === "ask") return { nav: "ask", title: "Ask", view: askView.ask };
  if (a === "notes") return { nav: "notes", title: "Notebook", view: notesView.notesView };
  if (a === "settings") return { nav: "settings", title: "Settings", view: settingsView.settings };
  return notFound(segs);
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const segs = pathPart.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  const query = {};
  new URLSearchParams(queryPart || "").forEach((v, k) => {
    query[k] = v;
  });
  return { segs, query };
}

let currentCtx = null;
let lastPath = null;

function paintNav(navId) {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === navId);
  });
}

function paintCounts() {
  const due = deckStats(FLASHCARDS).due;
  document.querySelectorAll('[data-count="cards"]').forEach((el) => {
    el.textContent = due || "";
    el.style.display = due ? "" : "none";
  });
  const notes = (store.data.notes || []).length;
  document.querySelectorAll('[data-count="notes"]').forEach((el) => {
    el.textContent = notes || "";
    el.style.display = notes ? "" : "none";
  });
  const dot = document.getElementById("nav-cards-dot");
  if (dot) dot.style.display = due ? "block" : "none";
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    const lvl = levelFor(store.data.profile.xp || 0);
    const lv = sidebar.querySelector(".side-xp .lv b");
    const xp = sidebar.querySelector(".side-xp .lv span");
    const bar = sidebar.querySelector(".side-xp .meter i");
    if (lv) lv.textContent = lvl.level;
    if (xp) xp.textContent = `level · ${store.data.profile.xp || 0} XP`;
    if (bar) bar.style.width = `${Math.round((lvl.into / (lvl.need || 1)) * 100)}%`;
  }
}

function renderRoute() {
  const { segs, query } = parseHash();
  const match = matchRoute(segs);
  const path = segs.join("/");

  // clear transient layers from the previous view
  document.querySelectorAll(".sheet-host, .drawer-host, .overlay").forEach((el) => el.remove());

  const host = document.getElementById("view");
  if (!host) return;

  const ctx = {
    params: match.params || {},
    query,
    rerender: renderRoute,
    refreshCounts: paintCounts,
    navigate: (href) => {
      location.hash = href.replace(/^#/, "");
    },
  };
  currentCtx = ctx;

  try {
    host.innerHTML = match.view.render(ctx);
    match.view.mount?.(host, ctx);
  } catch (err) {
    console.error("[neurodiff] view failed", err);
    host.innerHTML = `<div class="card"><h3 style="margin-bottom:6px">This view failed to render</h3>
      <p class="small dim" style="line-height:1.6">${esc(err && err.message ? err.message : String(err))}</p>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost sm" onclick="location.reload()">Reload</button>
      <a class="btn ghost sm" href="#/">Home</a></div></div>`;
  }

  paintNav(match.nav);
  paintCounts();

  const titleEl = document.getElementById("topbar-title");
  if (titleEl) titleEl.textContent = match.title;
  document.title = match.title === "Home" ? "NeuroDifference — evidence · compounds · pathways" : `${match.title} · NeuroDifference`;

  if (lastPath !== path) {
    lastPath = path;
    window.scrollTo(0, 0);
  }
  document.documentElement.setAttribute("data-scrolled", String(window.scrollY > 8));
}

/* ------------------------------------------------------------------ */
/* Global keys                                                         */
/* ------------------------------------------------------------------ */

function wireKeys() {
  let gPressed = 0;
  document.addEventListener("keydown", (ev) => {
    const tag = (ev.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || ev.target.isContentEditable;

    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
      ev.preventDefault();
      openSearch();
      return;
    }
    if (ev.key === "Escape") {
      document.querySelectorAll(".overlay, .drawer-host").forEach((el) => el.remove());
      return;
    }
    if (typing) return;

    if (ev.key === "/") {
      ev.preventDefault();
      openSearch();
      return;
    }

    if (ev.key.toLowerCase() === "g") {
      gPressed = Date.now();
      return;
    }
    if (Date.now() - gPressed < 900) {
      const map = { h: "#/", c: "#/compounds", b: "#/brain", l: "#/lab", a: "#/ask", e: "#/evidence", n: "#/notes", s: "#/settings", k: "#/cards", r: "#/learn" };
      const target = map[ev.key.toLowerCase()];
      if (target) {
        ev.preventDefault();
        gPressed = 0;
        location.hash = target.replace(/^#/, "");
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function boot() {
  store.load();
  if (!store.data.profile.lastActive) {
    store.update((s) => {
      s.profile.lastActive = new Date().toISOString().slice(0, 10);
    });
  }

  settingsView.applyAppearance();
  window.addEventListener("nd:appearance", () => settingsView.applyAppearance());

  const root = document.getElementById("root");
  mountShell(root);
  wireKeys();

  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) history.replaceState(null, "", "#/");
  renderRoute();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest('a[href^="#/"]');
    if (!a) return;
    if (a.getAttribute("target") === "_blank") return;
    const href = a.getAttribute("href");
    // let the router handle it; just close transient layers
    document.querySelectorAll(".drawer-host, .overlay").forEach((el) => el.remove());
    if (location.hash === href) {
      ev.preventDefault();
      renderRoute();
    }
  });

  window.addEventListener("error", (ev) => {
    console.warn("[neurodiff] runtime error", ev.message);
  });
}

boot();