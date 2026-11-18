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

const MOBILE_NAV = [
  { id: "home", label: "Главная", href: "#/", icon: "home" },
  { id: "compounds", label: "Препараты", href: "#/compounds", icon: "pill" },
  { id: "brain", label: "Мозг", href: "#/brain", icon: "brain" },
  { id: "learn", label: "Обучение", href: "#/learn", icon: "book" },
  { id: "more", label: "Ещё", icon: "menu", more: true },
];

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

const BRAND = `<span class="brand-mark">${icon("brain", 17)}</span>
  <span class="brand-text"><b>NeuroDifference</b><span>доказательность · препараты</span></span>`;

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
      ${subscribePlate({ compact: true })}
      <a class="side-xp" href="#/settings" style="text-decoration:none;color:inherit;display:block">
        <div class="lv"><b>${lvl.level}</b><span>уровень · ${s.profile.xp || 0} XP</span></div>
        <div class="meter"><i style="width:${Math.round((lvl.into / (lvl.need || 1)) * 100)}%"></i></div>
        <div class="tiny dim" style="margin-top:6px">${s.profile.streak || 0} дн. подряд${s.profile.streak ? " 🔥" : ""}</div>
      </a>
    </div>
  </aside>`;
}

function topbarHtml() {
  return `<header class="topbar">
    <button class="icon-btn menu-btn" id="btn-menu" aria-label="Открыть меню">${icon("menu", 20)}</button>
    <a class="brand" href="#/">${BRAND}</a>
    <div class="topbar-title" id="topbar-title">Главная</div>
    <div class="topbar-actions">
      <button class="icon-btn" id="btn-search" aria-label="Поиск">
        ${icon("search", 18)}
      </button>
      <a class="icon-btn only-desktop" href="#/cards" aria-label="Карточки к повторению" style="position:relative">
        ${icon("layers", 18)}
        <span class="dot-badge" id="nav-cards-dot" data-due-dot></span>
      </a>
      <a class="icon-btn only-desktop" href="#/settings" aria-label="Настройки">${icon("settings", 18)}</a>
    </div>
  </header>`;
}

function bottomNavHtml() {
  return `<nav class="bottom-nav" id="bottom-nav">
    ${MOBILE_NAV.map((it) =>
      it.more
        ? `<button class="nav-item" id="btn-more" style="background:none;border:0;font:inherit;cursor:pointer">${icon(it.icon, 20)}<span>${esc(it.label)}</span></button>`
        : `<a class="nav-item" href="${it.href}" data-nav="${it.id}">${icon(it.icon, 20)}${it.id === "learn" ? `<span class="dot-badge" data-due-dot aria-hidden="true"></span>` : ""}<span>${esc(it.label)}</span></a>`
    ).join("")}
  </nav>`;
}

function mountShell(root) {
  root.innerHTML = `<div class="bgfx" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="app">
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
  document.querySelectorAll(".overlay, .drawer-host, .sheet-host").forEach((el) => el.remove());
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

function openDrawer() {
  if (document.querySelector(".drawer-host")) return;
  closeLayers(false);
  lastFocus = document.activeElement;
  const host = document.createElement("div");
  host.className = "drawer-host";
  host.innerHTML = `<div class="drawer-scrim" data-close></div>
    <div class="drawer">
      <a class="brand" href="#/" data-close>${BRAND}</a>
      ${NAV.map(
        (group) => `${group.section ? `<h4>${esc(group.section)}</h4>` : `<h4>Приложение</h4>`}
          ${group.items
            .map(
              (it) => `<a class="d-item" href="${it.href}" data-nav="${it.id}" data-close>
                ${icon(it.icon, 16)}<span>${esc(it.label)}</span>
                ${it.count ? `<span class="pill-count" style="margin-left:auto">${it.count()}</span>` : ""}
              </a>`
            )
            .join("")}`
      ).join("")}
      <div style="margin-top:auto;padding-top:14px;display:grid;gap:10px">
        ${subscribePlate({ compact: true })}
        <button class="btn ghost sm block" data-search>${icon("search", 14)} Искать везде</button>
      </div>
    </div>`;
  document.body.appendChild(host);
  wireSubscribe(host);
  lockScroll(true);
  const close = () => closeLayers();
  host.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-search]")) {
      close();
      openSearch();
      return;
    }
    if (ev.target.closest("[data-close]") || ev.target.classList.contains("drawer-scrim")) close();
  });
  const first = host.querySelector(".d-item");
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
}

/* ------------------------------------------------------------------ */
/* Search overlay                                                      */
/* ------------------------------------------------------------------ */

function buildIndex() {
  const items = [];
  for (const c of COMPOUNDS) {
    items.push({
      kind: "Препарат",
      title: c.name,
      sub: `${c.cls} · ${c.evidence}`, 
      href: `#/compounds/${c.id}`,
      icon: "pill",
      hay: `${c.name} ${(c.aliases || []).join(" ")} ${c.cls} ${(c.tags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const s of SYSTEMS) {
    items.push({
      kind: "Система",
      title: s.name,
      sub: s.tagline || "нейромедиаторная система",
      href: `#/brain/${s.id}`,
      icon: "activity",
      hay: `${s.name} ${s.abbr} ${(s.matchFlags || []).join(" ")}`.toLowerCase(),
    });
  }
  for (const { course, lesson } of LESSONS_ALL) {
    items.push({
      kind: "Урок",
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
  const existing = document.querySelector(".overlay");
  if (existing) {
    const box = existing.querySelector("#ov-input");
    if (box) box.focus();
    return;
  }
  closeLayers(false);
  lastFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Поиск по всему приложению");
  overlay.innerHTML = `<div class="overlay-panel">
    <div class="overlay-search">
      ${icon("search", 17)}
      <input id="ov-input" type="text" placeholder="Препараты, системы, уроки…" autocomplete="off" spellcheck="false">
      <button class="icon-btn" data-close aria-label="Закрыть">${icon("x", 16)}</button>
    </div>
    <div class="overlay-results" id="ov-results"></div>
  </div>`;
  document.body.appendChild(overlay);
  lockScroll(true);
  const close = () => closeLayers();

  const input = overlay.querySelector("#ov-input");
  const results = overlay.querySelector("#ov-results");
  let active = 0;
  let current = [];

  const paint = () => {
    current = searchAll(input.value);
    active = 0;
    if (!current.length) {
      results.innerHTML = `<div class="sr-empty">No match. Try a compound name, a transmitter, or “interactions”.</div>`;
      return;
    }
    let html = "";
    let lastKind = "";
    current.forEach((item, i) => {
      if (item.kind !== lastKind) {
        html += `<div class="sr-group">${esc(item.kind)}s</div>`;
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
    if (ev.target.closest("[data-close]") || ev.target.classList.contains("overlay")) close();
  });

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      active = Math.min(active + 1, Math.max(current.length - 1, 0));
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
        closeLayers(false);
        location.hash = item.href.replace(/^#/, "");
      }
    } else if (ev.key === "Escape") {
      close();
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
    const key = String(b).toLowerCase();
    const cmp = COMPOUND_BY_ID.get(key);
    return { nav: "compounds", title: cmp ? cmp.name : "Compound", view: compoundsView.detail, params: { id: key } };
  }
  if (a === "brain" || a === "systems") {
    if (!b) return { nav: "brain", title: "Brain map", view: { render: brainView.render, mount: brainView.mount } };
    const key = String(b).toLowerCase();
    const sys = SYSTEM_BY_ID.get(key);
    return { nav: "brain", title: sys ? sys.name : "System", view: neuroView.system, params: { id: key } };
  }
  if (a === "dev" && (b === "audit" || !b)) {
    return { nav: "settings", title: "Data audit", view: { render: auditView.render, mount: auditView.mount } };
  }
  if (a === "emergency" || a === "redflags") {
    return { nav: "emergency", title: "Red flags", view: { render: emergencyView.render, mount: emergencyView.mount } };
  }
  if (a === "symptoms" || a === "symptom") {
    return { nav: "symptoms", title: "Symptom finder", view: { render: symptomsView.render, mount: symptomsView.mount } };
  }
  if (a === "stack") {
    return { nav: "stack", title: "Stack builder", view: { render: stackView.render, mount: stackView.mount } };
  }
  if (a === "pk" || a === "timeline") {
    return { nav: "pk", title: "PK timeline", view: { render: pkView.render, mount: pkView.mount } };
  }
  if (a === "bloodwork") {
    const view = { render: bloodworkView.render, mount: bloodworkView.mount };
    if (!b) return { nav: "bloodwork", title: "Bloodwork", view };
    return { nav: "bloodwork", title: "Marker", view, params: { id: String(b).toLowerCase() } };
  }
  if (a === "conditions") {
    const view = { render: conditionsView.render, mount: conditionsView.mount };
    if (!b) return { nav: "conditions", title: "Conditions", view };
    return { nav: "conditions", title: "Condition", view, params: { id: String(b).toLowerCase() } };
  }
  if (a === "compare") return { nav: "compare", title: "Compare", view: compareView.compare };

  if (a === "atlas") {
    if (!b) return { nav: "atlas", title: "Biochemical atlas", view: { render: atlasView.index, mount: atlasView.mount } };
    if (b === "target" && c)
      return {
        nav: "atlas",
        title: "Target",
        view: { render: atlasView.target, mount: atlasView.mount },
        params: { id: String(c).toLowerCase(), kind: "target" },
      };
    return {
      nav: "atlas",
      title: "Pathway",
      view: { render: atlasView.pathway, mount: atlasView.mount },
      params: { id: String(b).toLowerCase(), kind: "pathway" },
    };
  }
  if (a === "organs" || a === "organ") {
    return {
      nav: "organs",
      title: "Organ map",
      view: { render: organsView.organs, mount: organsView.mount },
      params: b ? { id: String(b).toLowerCase() } : {},
    };
  }
  if (a === "map" || a === "network") {
    return { nav: "map", title: "Convergence map", view: { render: mapView.map, mount: mapView.mount } };
  }
  if (a === "calc" || a === "calculator") {
    return { nav: "calc", title: "Peptide calculator", view: { render: calculatorView.calculator, mount: calculatorView.mount } };
  }

  if (a === "lab") {
    if (b === "interactions") return { nav: "interactions", title: "Interactions", view: labView.interactions };
    if (b === "taper") return { nav: "taper", title: "Taper planner", view: taperView.taper };
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
  if (a === "research" || a === "pubmed") return { nav: "research", title: "Research", view: researchView.research };
  if (a === "ask") return { nav: "ask", title: "Ask", view: askView.ask };
  if (a === "notes") return { nav: "notes", title: "Notebook", view: notesView.notesView };
  if (a === "settings") return { nav: "settings", title: "Settings", view: settingsView.settings };
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
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === navId);
  });
  // The bottom bar has no Flashcards cell — light up Learn while browsing cards.
  if (navId === "cards") {
    const learn = document.querySelector('#bottom-nav [data-nav="learn"]');
    if (learn) learn.classList.add("active");
  }
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
  document.title = match.title === "Home" ? "NeuroDifference — evidence · compounds · pathways" : `${match.title} · NeuroDifference`;

  if (lastPath !== hashKey) {
    lastPath = hashKey;
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
      if (document.querySelector(".overlay, .drawer-host, .sheet-host")) {
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
      '<span class="update-bar-txt"><b>New version ready</b><span class="tiny dim">Reload to pick up the fresh build</span></span>' +
      '<button type="button" class="btn primary xs" data-update="go">Reload</button>' +
      '<button type="button" class="icon-btn" data-update="later" aria-label="Later">' + icon("x", 14) + "</button>";
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
  // Counts today as day 1 of the streak instead of leaving the profile
  // marked active with a streak of 0.
  touchStreak();

  window.addEventListener("nd:savefail", () =>
    toast("This browser refused to save your progress — export a backup before closing", "danger", 7000)
  );

  settingsView.applyAppearance();
  window.addEventListener("nd:appearance", () => settingsView.applyAppearance());

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