/* NeuroDifference — application shell, hash router, search, drawer.
 * Vanilla ES modules, no build step. Every view exports { render(ctx), mount(root, ctx) }.
 */

import { esc, icon, store, levelFor, debounce, toast, touchStreak } from "./core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "./data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "./data/neuro.js";
import { COURSES, LESSONS_ALL, FLASHCARDS } from "./data/learn.js";
import { deckStats } from "./srs.js";

import * as homeView from "./views/home.js";
import * as compoundsView from "./views/compounds.js";
import * as neuroView from "./views/neuro.js";
import * as labView from "./views/lab.js";
import * as taperView from "./views/taper.js";
import * as compareView from "./views/compare.js";
import * as learnView from "./views/learn.js";
import * as evidenceView from "./views/evidence.js";
import * as askView from "./views/ask.js";
import * as notesView from "./views/notes.js";
import * as settingsView from "./views/settings.js";
import * as researchView from "./views/research.js";
import * as atlasView from "./views/atlas.js";
import * as organsView from "./views/organs.js";
import * as mapView from "./views/map.js";
import * as calculatorView from "./views/calculator.js";
import * as brainView from "./views/brain.js";
import * as conditionsView from "./views/conditions.js";
import * as bloodworkView from "./views/bloodwork.js";
import * as pkView from "./views/pk.js";
import * as stackView from "./views/stack.js";
import * as symptomsView from "./views/symptoms.js";
import * as emergencyView from "./views/emergency.js";
import * as auditView from "./views/audit.js";
import { PATHWAYS } from "./data/atlas.js";
import { ORGANS } from "./data/organs.js";
import { CONDITIONS } from "./data/conditions.js";
import { subscribePlate, wireSubscribe } from "./views/ui.js";
import { applyI18n, setLang } from "./lib/i18n.js";

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */

const NAV = [
  {
    section: "Обучение",
    items: [
      { id: "home", label: "Главная", href: "#/", icon: "home" },
      { id: "compounds", label: "Препараты", href: "#/compounds", icon: "pill", count: () => COMPOUNDS.length },
      { id: "brain", label: "Карта мозга", href: "#/brain", icon: "brain", count: () => SYSTEMS.length },
      { id: "learn", label: "Обучение", href: "#/learn", icon: "book" },
      { id: "cards", label: "Карточки", href: "#/cards", icon: "layers", count: () => deckStats(FLASHCARDS).due || "" },
    ],
  },
  {
    section: "Клиника",
    items: [
      { id: "conditions", label: "Состояния", href: "#/conditions", icon: "shield", count: () => CONDITIONS.length },
      { id: "bloodwork", label: "Анализы", href: "#/bloodwork", icon: "trend" },
      { id: "pk", label: "PK-кривые", href: "#/pk", icon: "activity" },
      { id: "stack", label: "Сборка стека", href: "#/stack", icon: "layers" },
      { id: "symptoms", label: "Поиск по симптомам", href: "#/symptoms", icon: "search" },
      { id: "emergency", label: "Красные флаги", href: "#/emergency", icon: "alert" },
    ],
  },
  {
    section: "Атлас",
    items: [
      { id: "atlas", label: "Биохимический атлас", href: "#/atlas", icon: "atom", count: () => PATHWAYS.length },
      { id: "organs", label: "Карта органов", href: "#/organs", icon: "body", count: () => ORGANS.length },
      { id: "map", label: "Карта конвергенции", href: "#/map", icon: "dna", count: () => COMPOUNDS.length },
      { id: "calc", label: "Калькулятор пептидов", href: "#/calc", icon: "calculator" },
    ],
  },
  {
    section: "Инструменты",
    items: [
      { id: "lab", label: "Лаборатория доз", href: "#/lab", icon: "flask" },
      { id: "taper", label: "План снижения", href: "#/lab/taper", icon: "scale" },
      { id: "compare", label: "Сравнение", href: "#/compare", icon: "grid" },
      { id: "interactions", label: "Взаимодействия", href: "#/lab/interactions", icon: "shield" },
      { id: "evidence", label: "Доказательность", href: "#/evidence", icon: "file" },
      { id: "research", label: "Исследования", href: "#/research", icon: "microscope" },
      { id: "ask", label: "Спроси индекс", href: "#/ask", icon: "sparkles" },
      { id: "notes", label: "Блокнот", href: "#/notes", icon: "edit", count: () => (store.data.notes || []).length || "" },
    ],
  },
  {
    section: "",
    items: [{ id: "settings", label: "Настройки", href: "#/settings", icon: "settings" }],
  },
];

/* v5.2: no navigation bars at all. One floating orb opens a unified
   navigator (spatial section index + universal command palette). */
let currentNavId = "home";

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function orbHtml() {
  return `<button class="nav-orb" id="nav-orb" aria-label="Навигация и поиск" aria-haspopup="dialog">
    <span class="nav-orb-ring" aria-hidden="true"></span>
    <span class="nav-orb-ico" id="nav-orb-ico">${icon("grid", 22)}</span>
    <span class="dot-badge nav-orb-dot" data-due-dot aria-hidden="true"></span>
  </button>`;
}

let shellScrollWired = false;

function mountShell(root) {
  root.innerHTML = `<div class="bgfx" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="app">
      <div class="main">
        <div class="view" id="view"></div>
      </div>
    </div>
    ${orbHtml()}
    <div class="toast-host" id="toast-host"></div>`;

  document.getElementById("nav-orb")?.addEventListener("click", () => openNavigator(false));

  if (!shellScrollWired) {
    shellScrollWired = true;
    const onScroll = debounce(() => {
      document.documentElement.setAttribute("data-scrolled", String(window.scrollY > 8));
    }, 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    wireSwipe();
  }
}

/* Swipe down from the very top edge opens the command palette. Tracking
   starts only within 72px of the top so it never fights content scrolling. */
let swipeWired = false;
function wireSwipe() {
  if (swipeWired) return;
  swipeWired = true;
  let sy = 0, sx = 0, st = 0, tracking = false;
  document.addEventListener("touchstart", (e) => {
    if (document.querySelector(".navx-host")) { tracking = false; return; }
    const t = e.touches[0];
    if (t && t.clientY < 72) { tracking = true; sx = t.clientX; sy = t.clientY; st = Date.now(); }
    else tracking = false;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    if (!t) return;
    const dy = t.clientY - sy, dx = Math.abs(t.clientX - sx);
    if (dy > 64 && dx < 90 && Date.now() - st < 650) { tracking = false; openNavigator(true); }
  }, { passive: true });
  document.addEventListener("touchend", () => { tracking = false; }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Drawer (mobile menu)                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Layers (drawer / search overlay) — one open at a time                */
/* ------------------------------------------------------------------ */

let lastFocus = null;

function lockScroll(on) {
  document.documentElement.classList.toggle("layer-open", !!on);
}

/**
 * Remove transient layers. Restores scroll + focus when nothing is left.
 * @param {boolean} restoreFocus
 */
function closeLayers(restoreFocus = true) {
  document.querySelectorAll(".overlay, .drawer-host, .sheet-host, .navx-host").forEach((el) => el.remove());
  lockScroll(false);
  if (restoreFocus && lastFocus && document.contains(lastFocus)) {
    try {
      lastFocus.focus({ preventScroll: true });
    } catch (err) {
      /* ignore */
    }
  }
  lastFocus = null;
}

/* Unified navigator: one overlay = spatial section index (empty query)
   + universal command palette (typed query). Replaces the old drawer. */
function openNavigator(focusSearch) {
  const existing = document.querySelector(".navx-host");
  if (existing) {
    const box = existing.querySelector("#navx-input");
    if (box && focusSearch) box.focus();
    return;
  }
  closeLayers(false);
  lastFocus = document.activeElement;
  const host = document.createElement("div");
  host.className = "navx-host";
  host.innerHTML = `<div class="navx-scrim" data-close></div>
    <div class="navx-panel" role="dialog" aria-modal="true" aria-label="Навигация и поиск">
      <div class="navx-search">
        ${icon("search", 18)}
        <input id="navx-input" type="text" placeholder="Препараты, регионы, уроки, действия…" autocomplete="off" spellcheck="false" aria-label="Поиск по всему приложению">
        <kbd class="navx-kbd">⌘K</kbd>
        <button class="icon-btn navx-x" data-close aria-label="Закрыть">${icon("x", 16)}</button>
      </div>
      <div class="navx-body">
        <div class="navx-grid" id="navx-grid"></div>
        <div class="navx-results" id="navx-results" hidden></div>
      </div>
      <div class="navx-foot">
        <span class="navx-hint">свайп сверху вниз · / или ⌘K — поиск</span>
        <span class="navx-hint navx-keys">↑↓ выбор · Enter открыть · Esc закрыть</span>
      </div>
    </div>`;
  document.body.appendChild(host);

  const grid = host.querySelector("#navx-grid");
  let gi = 0;
  grid.innerHTML = NAV.map((group) => {
    const tiles = group.items.map((it) => {
      const cnt = it.count ? it.count() : "";
      const delay = gi++ * 22;
      return `<a class="navx-tile" href="${it.href}" data-nav="${it.id}" data-close style="--d:${delay}ms">
        <span class="navx-ico">${icon(it.icon, 20)}</span>
        <span class="navx-label">${esc(it.label)}</span>
        ${cnt ? `<span class="navx-count">${esc(cnt)}</span>` : ""}
      </a>`;
    }).join("");
    return `<div class="navx-group"><div class="navx-glabel">${esc(group.section || "Приложение")}</div><div class="navx-tiles">${tiles}</div></div>`;
  }).join("");

  applyI18n(host);
  lockScroll(true);
  requestAnimationFrame(() => host.classList.add("open"));
  paintNav(currentNavId);

  const input = host.querySelector("#navx-input");
  const results = host.querySelector("#navx-results");
  let active = 0, current = [];

  const paint = () => {
    const q = input.value.trim();
    if (!q) { grid.hidden = false; results.hidden = true; results.innerHTML = ""; current = []; return; }
    grid.hidden = true; results.hidden = false;
    current = searchAll(q);
    active = 0;
    if (!current.length) {
      results.innerHTML = `<div class="navx-empty">Ничего не найдено. Попробуй название препарата, нейромедиатор или «взаимодействия».</div>`;
      applyI18n(results); return;
    }
    let html = "", lastKind = "";
    current.forEach((item, i) => {
      if (item.kind !== lastKind) { html += `<div class="navx-rgroup">${esc(item.kind === "Page" ? "Разделы и действия" : item.kind)}</div>`; lastKind = item.kind; }
      html += `<a class="navx-item ${i === active ? "active" : ""}" href="${item.href}" data-i="${i}" data-close>
        ${icon(item.icon, 16)}
        <span class="navx-grow"><span class="t">${esc(item.title)}</span><span class="s">${esc(item.sub)}</span></span>
        ${icon("chevronRight", 14)}
      </a>`;
    });
    results.innerHTML = html;
    applyI18n(results);
  };

  host.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-close]") || ev.target.classList.contains("navx-scrim")) closeLayers(false);
  });
  input.addEventListener("input", paint);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!current.length) return;
      ev.preventDefault();
      active = ev.key === "ArrowDown" ? Math.min(active + 1, current.length - 1) : Math.max(active - 1, 0);
      results.querySelectorAll(".navx-item").forEach((el, i) => el.classList.toggle("active", i === active));
      results.querySelectorAll(".navx-item")[active]?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter") {
      const item = current[active];
      if (item) { closeLayers(false); location.hash = item.href.replace(/^#/, ""); }
    } else if (ev.key === "Escape") { closeLayers(); }
  });
  host.addEventListener("keydown", (ev) => {
    if (ev.key !== "Tab") return;
    const f = Array.from(host.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  if (focusSearch) setTimeout(() => input.focus(), 40);
  else { const t = grid.querySelector(".navx-tile"); if (t) setTimeout(() => t.focus({ preventScroll: true }), 40); }
}

function openDrawer() { openNavigator(false); }

/* ------------------------------------------------------------------ */
/* Search overlay                                                      */
/* ------------------------------------------------------------------ */

function buildIndex() {
  const items = [];
  for (const c of COMPOUNDS) {
    items.push({
      kind: "Препараты",
      title: c.name,
      sub: `${c.cls} · ${c.evidence}`, 
      href: `#/compounds/${c.id}`,
      icon: "pill",
      hay: `${c.name} ${(c.aliases || []).join(" ")} ${c.cls} ${(c.tags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const s of SYSTEMS) {
    items.push({
      kind: "Системы",
      title: s.name,
      sub: s.tagline || "нейромедиаторная система",
      href: `#/brain/${s.id}`,
      icon: "activity",
      hay: `${s.name} ${s.abbr} ${(s.matchFlags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const { course, lesson } of LESSONS_ALL) {
    items.push({
      kind: "Уроки",
      title: lesson.title,
      sub: course.title,
      href: `#/learn/${course.id}/${lesson.id}`,
      icon: "book",
      hay: `${lesson.title} ${course.title}`.toLowerCase(),
    });
  }
  for (const [label, href, ico, sub] of [
    ["Главная", "#/", "home", "дашборд"],
    ["Карточки", "#/cards", "layers", "интервальное повторение"],
    ["Карта мозга", "#/brain", "brain", "регионы и пути"],
    ["Биохимический атлас", "#/atlas", "atom", "пути, ферменты и мишени"],
    ["Карта органов", "#/organs", "body", "органы, гормоны и болезни"],
    ["Карта конвергенции", "#/map", "dna", "нити препаратов в регионы"],
    ["Калькулятор пептидов", "#/calc", "calculator", "арифметика разведения"],
    ["Лаборатория доз", "#/lab", "flask", "песочница фармакокинетики"],
    ["Проверка взаимодействий", "#/lab/interactions", "shield", "безопасность стека"],
    ["Доказательность", "#/evidence", "file", "исследовательские темы"],
    ["Спроси индекс", "#/ask", "sparkles", "поисковый ассистент"],
    ["Блокнот", "#/notes", "edit", "твои заметки"],
    ["Настройки", "#/settings", "settings", "вид и данные"],
  ]) {
    items.push({ kind: "Page", title: label, sub, href, icon: ico, hay: `${label} ${sub}`.toLowerCase() });
  }
  for (const c of CONDITIONS) {
    items.push({ kind: "Состояния", title: c.name || c.title || c.id, sub: c.tagline || c.summary || "клиническое состояние", href: `#/conditions/${c.id}`, icon: "shield", hay: `${c.name || ""} ${(c.aliases || []).join(" ")} ${c.tagline || ""}`.toLowerCase() });
  }
  for (const o of ORGANS) {
    items.push({ kind: "Органы", title: o.name || o.id, sub: o.group || "орган и система", href: `#/organs/${o.id}`, icon: "body", hay: `${o.name || ""} ${o.group || ""}`.toLowerCase() });
  }
  for (const p of PATHWAYS) {
    items.push({ kind: "Пути", title: p.name || p.id, sub: p.tagline || "биохимический путь", href: `#/atlas/${p.id}`, icon: "atom", hay: `${p.name || ""} ${p.tagline || ""}`.toLowerCase() });
  }
  for (const [label, href, ico, sub] of [
    ["Препараты", "#/compounds", "pill", "все compounds"],
    ["Обучение", "#/learn", "book", "курсы и уроки"],
    ["Состояния", "#/conditions", "shield", "клинические состояния"],
    ["Анализы", "#/bloodwork", "trend", "референсы и маркеры"],
    ["PK-кривые", "#/pk", "activity", "фармакокинетика"],
    ["Сборка стека", "#/stack", "layers", "конструктор комбинаций"],
    ["Поиск по симптомам", "#/symptoms", "search", "дифференциал"],
    ["Красные флаги", "#/emergency", "alert", "неотложные состояния"],
    ["План снижения", "#/lab/taper", "scale", "тейперинг"],
    ["Сравнение", "#/compare", "grid", "бок о бок"],
    ["Исследования", "#/research", "microscope", "PubMed и доказательства"],
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
  openNavigator(true);
}

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

function notFound(segs) {
  return {
    nav: "",
    title: "Не найдено",
    view: {
      render: () =>
        `<div class="page-head"><div class="eyebrow">404</div><h1>По этому адресу ничего нет</h1>
         <p>«${esc(segs.join("/"))}» — не маршрут этого приложения.</p></div>
         <a class="btn primary" href="#/">${icon("home", 15)} На главную</a>`,
    },
  };
}

function matchRoute(segs) {
  const [a, b, c] = segs;

  if (!a) return { nav: "home", title: "Главная", view: homeView };
  if (a === "compounds") {
    if (!b) return { nav: "compounds", title: "Препараты", view: compoundsView.list };
    const key = String(b).toLowerCase();
    const cmp = COMPOUND_BY_ID.get(key);
    return { nav: "compounds", title: cmp ? cmp.name : "Compound", view: compoundsView.detail, params: { id: key } };
  }
  if (a === "brain" || a === "systems") {
    if (!b) return { nav: "brain", title: "Карта мозга", view: { render: brainView.render, mount: brainView.mount } };
    const key = String(b).toLowerCase();
    const sys = SYSTEM_BY_ID.get(key);
    return { nav: "brain", title: sys ? sys.name : "System", view: neuroView.system, params: { id: key } };
  }
  if (a === "dev" && (b === "audit" || !b)) {
    return { nav: "settings", title: "Аудит данных", view: { render: auditView.render, mount: auditView.mount } };
  }
  if (a === "emergency" || a === "redflags") {
    return { nav: "emergency", title: "Красные флаги", view: { render: emergencyView.render, mount: emergencyView.mount } };
  }
  if (a === "symptoms" || a === "symptom") {
    return { nav: "symptoms", title: "Поиск по симптомам", view: { render: symptomsView.render, mount: symptomsView.mount } };
  }
  if (a === "stack") {
    return { nav: "stack", title: "Сборка стека", view: { render: stackView.render, mount: stackView.mount } };
  }
  if (a === "pk" || a === "timeline") {
    return { nav: "pk", title: "PK-кривые", view: { render: pkView.render, mount: pkView.mount } };
  }
  if (a === "bloodwork") {
    const view = { render: bloodworkView.render, mount: bloodworkView.mount };
    if (!b) return { nav: "bloodwork", title: "Анализы", view };
    return { nav: "bloodwork", title: "Показатель", view, params: { id: String(b).toLowerCase() } };
  }
  if (a === "conditions") {
    const view = { render: conditionsView.render, mount: conditionsView.mount };
    if (!b) return { nav: "conditions", title: "Состояния", view };
    return { nav: "conditions", title: "Состояние", view, params: { id: String(b).toLowerCase() } };
  }
  if (a === "compare") return { nav: "compare", title: "Сравнение", view: compareView.compare };

  if (a === "atlas") {
    if (!b) return { nav: "atlas", title: "Биохимический атлас", view: { render: atlasView.index, mount: atlasView.mount } };
    if (b === "target" && c)
      return {
        nav: "atlas",
        title: "Мишень",
        view: { render: atlasView.target, mount: atlasView.mount },
        params: { id: String(c).toLowerCase(), kind: "target" },
      };
    return {
      nav: "atlas",
      title: "Путь",
      view: { render: atlasView.pathway, mount: atlasView.mount },
      params: { id: String(b).toLowerCase(), kind: "pathway" },
    };
  }
  if (a === "organs" || a === "organ") {
    return {
      nav: "organs",
      title: "Карта органов",
      view: { render: organsView.organs, mount: organsView.mount },
      params: b ? { id: String(b).toLowerCase() } : {},
    };
  }
  if (a === "map" || a === "network") {
    return { nav: "map", title: "Карта конвергенции", view: { render: mapView.map, mount: mapView.mount } };
  }
  if (a === "calc" || a === "calculator") {
    return { nav: "calc", title: "Калькулятор пептидов", view: { render: calculatorView.calculator, mount: calculatorView.mount } };
  }

  if (a === "lab") {
    if (b === "interactions") return { nav: "interactions", title: "Взаимодействия", view: labView.interactions };
    if (b === "taper") return { nav: "taper", title: "План снижения", view: taperView.taper };
    return { nav: "lab", title: "Лаборатория доз", view: labView.lab };
  }
  if (a === "learn") {
    if (!b) return { nav: "learn", title: "Обучение", view: learnView.index };
    const course = COURSES.find((x) => x.id === b);
    if (!c) return { nav: "learn", title: course ? course.title : "Course", view: learnView.course, params: { courseId: b } };
    return { nav: "learn", title: course ? course.title : "Lesson", view: learnView.lesson, params: { courseId: b, lessonId: c } };
  }
  if (a === "cards" || a === "flashcards") return { nav: "cards", title: "Карточки", view: learnView.cards };
  if (a === "evidence" || a === "studies") return { nav: "evidence", title: "Доказательность", view: evidenceView.evidence };
  if (a === "research" || a === "pubmed") return { nav: "research", title: "Исследования", view: researchView.research };
  if (a === "ask") return { nav: "ask", title: "Спроси индекс", view: askView.ask };
  if (a === "notes") return { nav: "notes", title: "Блокнот", view: notesView.notesView };
  if (a === "settings") return { nav: "settings", title: "Настройки", view: settingsView.settings };
  return notFound(segs);
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const qi = raw.indexOf("?");
  const pathPart = qi === -1 ? raw : raw.slice(0, qi);
  const queryPart = qi === -1 ? "" : raw.slice(qi + 1);
  const segs = pathPart
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch (err) {
        return s;
      }
    });
  const query = {};
  new URLSearchParams(queryPart).forEach((v, k) => {
    query[k] = v;
  });
  return { segs, query };
}

let currentCtx = null;
let lastPath = null;

function paintNav(navId) {
  currentNavId = navId || "home";
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === navId);
  });
  // The orb reflects the current section so you always know where you are.
  const item = NAV.flatMap((g) => g.items).find((it) => it.id === navId);
  const ico = document.getElementById("nav-orb-ico");
  if (ico) ico.innerHTML = icon(item ? item.icon : "grid", 22);
  const orb = document.getElementById("nav-orb");
  if (orb) orb.setAttribute("aria-label", `Навигация и поиск${item ? " · " + item.label : ""}`);
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
  document.querySelectorAll("[data-due-dot]").forEach((el) => {
    el.style.display = due ? "block" : "none";
  });
}

function renderRoute() {
  let parsed;
  try {
    parsed = parseHash();
  } catch (err) {
    parsed = { segs: [], query: {} };
  }
  const { segs, query } = parsed;
  const match = matchRoute(segs);
  const hashKey = location.hash || "#/";

  // clear transient layers from the previous view
  closeLayers(false);

  const oldHost = document.getElementById("view");
  if (!oldHost) return;
  // A brand new host each render: view listeners can never pile up on a
  // recycled container (duplicate grading, double-toggled switches, etc.).
  const host = document.createElement("div");
  host.id = "view";
  host.className = oldHost.className;
  oldHost.replaceWith(host);

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
    host.innerHTML = `<div class="card"><h3 style="margin-bottom:6px">Не удалось отрисовать этот экран</h3>
      <p class="small dim" style="line-height:1.6">${esc(err && err.message ? err.message : String(err))}</p>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn ghost sm" onclick="location.reload()">Перезагрузить</button>
      <a class="btn ghost sm" href="#/">Главная</a></div></div>`;
  }

  // Any view can render a subscribe plate; dismissal is delegated once here.
  wireSubscribe(host);

  paintNav(match.nav);
  paintCounts();

  const titleEl = document.getElementById("topbar-title");
  if (titleEl) titleEl.textContent = match.title;
  document.title = match.title === "Главная" ? "NeuroDifference — доказательность · препараты · пути" : `${match.title} · NeuroDifference`;

  if (lastPath !== hashKey) {
    lastPath = hashKey;
    window.scrollTo(0, 0);
  }
  document.documentElement.setAttribute("data-scrolled", String(window.scrollY > 8));
  applyI18n();
  wireReveals(host);
}

/* Scroll reveals: fade/lift cards as they enter the viewport. Skipped when
   motion is off. Direct #view children already run the entrance animation,
   so only nested cards are revealed — one animation per element. */
let revealIO = null;
function wireReveals(host) {
  const rootEl = document.documentElement;
  const off =
    rootEl.dataset.motion === "off" ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (off || !("IntersectionObserver" in window) || !host) return;
  if (revealIO) revealIO.disconnect();
  const els = Array.from(host.querySelectorAll(".card, .compound-card")).filter(
    (el) => el.parentElement && el.parentElement.id !== "view" && !el.classList.contains("hero-card")
  );
  if (!els.length) return;
  revealIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("nd-in");
          revealIO.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );
  els.forEach((el) => {
    el.classList.add("nd-reveal");
    revealIO.observe(el);
  });
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
      if (document.querySelector(".overlay, .drawer-host, .sheet-host, .navx-host")) {
        ev.preventDefault();
        closeLayers();
      }
      return;
    }
    // Every remaining shortcut is bare-key only.
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
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

/* ------------------------------------------------------------------ */
/* Service worker + update prompt                                      */
/* ------------------------------------------------------------------ */

function wireServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isSecure =
    location.protocol === "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  if (!isSecure) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  const offer = (reg) => {
    if (!reg || !reg.waiting) return;
    if (document.querySelector(".update-bar")) return;
    const bar = document.createElement("div");
    bar.className = "update-bar";
    bar.innerHTML =
      '<span class="update-bar-txt"><b>Готова новая версия</b><span class="tiny dim">Перезагрузи, чтобы подхватить свежую сборку</span></span>' +
      '<button type="button" class="btn primary xs" data-update="go">Обновить</button>' +
      '<button type="button" class="icon-btn" data-update="later" aria-label="Позже">' + icon("x", 14) + "</button>";
    document.body.appendChild(bar);
    bar.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-update]");
      if (!b) return;
      if (b.dataset.update === "go") {
        bar.classList.add("busy");
        try {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch (err) {
          location.reload();
        }
      } else {
        bar.remove();
      }
    });
  };

  let reg = null;
  const check = () => {
    if (!reg) return;
    reg.update().catch(() => {});
  };

  try {
    // Resolve against the document base so a subfolder deployment still
    // registers the right worker.
    const swUrl = new URL("sw.js", document.baseURI);
    navigator.serviceWorker
      .register(swUrl, { scope: "./", updateViaCache: "none" })
      .then((r) => {
        reg = r;
        offer(reg);
        r.addEventListener("updatefound", () => {
          const sw = r.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) offer(r);
          });
        });
      })
      .catch(() => {});
  } catch (err) {
    /* ignore */
  }

  // Look again when the tab comes back, and every half hour for long sessions.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("focus", check);
  setInterval(check, 30 * 60 * 1000);
}

function boot() {
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch (err) {
    /* ignore */
  }
  store.load();
  setLang(store.data.settings.lang || "ru");
  // Counts today as day 1 of the streak instead of leaving the profile
  // marked active with a streak of 0.
  touchStreak();

  window.addEventListener("nd:savefail", () =>
    toast("This browser refused to save your progress — export a backup before closing", "danger", 7000)
  );

  settingsView.applyAppearance();
  window.addEventListener("nd:appearance", () => settingsView.applyAppearance());
  window.addEventListener("nd:lang", () => {
    const rootEl = document.getElementById("root");
    if (rootEl) mountShell(rootEl);
    renderRoute();
  });

  const root = document.getElementById("root");
  mountShell(root);
  wireKeys();

  window.addEventListener("hashchange", renderRoute);
  if (!location.hash) history.replaceState(null, "", "#/");
  renderRoute();

  wireServiceWorker();

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest('a[href^="#/"]');
    if (!a) return;
    if (a.getAttribute("target") === "_blank") return;
    const href = a.getAttribute("href");
    // let the router handle it; just close transient layers
    closeLayers(false);
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