/* Compound convergence map — every compound on the right, a neuron thread
 * running left into the brain region or body part it acts on.
 * Several compounds may converge on one region; nothing is capped.
 */

import { esc, icon, debounce } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { BRAIN_REGIONS, REGION_BY_ID, SYSTEM_BY_ID, SYSTEMS } from "../data/neuro.js";
import { ORGANS, ORGAN_BY_ID } from "../data/organs.js";

import { pageHead, chipRow, callout } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Build the target graph once                                         */
/* ------------------------------------------------------------------ */

const regionTargets = BRAIN_REGIONS.map((r) => ({
  key: `region:${r.id}`,
  kind: "region",
  id: r.id,
  name: r.name,
  short: r.short || r.name,
  x: r.x,
  y: r.y,
  rx: r.rx,
  ry: r.ry,
  color: (SYSTEM_BY_ID.get((r.systems || [])[0]) || {}).color || "var(--accent)",
  drugs: (r.drugs || []).filter((id) => COMPOUND_BY_ID.get(id)),
}));

const organTargets = ORGANS.filter((o) => (o.drugs || []).some((id) => COMPOUND_BY_ID.get(id))).map((o) => ({
  key: `organ:${o.id}`,
  kind: "organ",
  id: o.id,
  name: o.name,
  short: o.name,
  x: o.x,
  y: o.y,
  rx: o.rx,
  ry: o.ry,
  color: "#6fb3ff",
  drugs: (o.drugs || []).filter((id) => COMPOUND_BY_ID.get(id)),
}));

const ALL_TARGETS = [...regionTargets, ...organTargets];

/* compound id → [target keys] */
const TARGETS_OF = new Map();
ALL_TARGETS.forEach((t) => {
  t.drugs.forEach((id) => {
    if (!TARGETS_OF.has(id)) TARGETS_OF.set(id, []);
    TARGETS_OF.get(id).push(t.key);
  });
});

const TARGET_BY_KEY = new Map(ALL_TARGETS.map((t) => [t.key, t]));

function targetsOf(id) {
  return TARGETS_OF.get(id) || [];
}

/** The region a compound is filed under in the list. */
function primaryTarget(id) {
  const keys = targetsOf(id);
  const region = keys.find((k) => k.startsWith("region:"));
  return region || keys[0] || "";
}

const groups = new Map();
ALL_TARGETS.forEach((t) => groups.set(t.key, []));
COMPOUNDS.forEach((c) => {
  const k = primaryTarget(c.id);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(c);
});

const ORDERED_GROUPS = ALL_TARGETS.map((t) => ({ target: t, items: groups.get(t.key) || [] })).filter(
  (g) => g.items.length
);
const unsortedCount = (groups.get("") || []).length;

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

function brainCanvas(activeRegion, mode) {
  return `<svg class="nm-brain" viewBox="0 0 420 320" role="img" aria-label="Brain regions with compound convergence">
    <defs>
      <radialGradient id="nmGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".5"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="nmClip"><path d="M198 24 C120 24 62 82 60 150 C58 214 108 258 176 262 C214 264 246 250 264 226 C300 230 344 214 350 176 C356 138 330 112 300 108 C292 66 250 24 198 24 Z"/></clipPath>
    </defs>
    <g class="nm-brain-shape">
      <path d="M198 24 C120 24 62 82 60 150 C58 214 108 258 176 262 C214 264 246 250 264 226 C300 230 344 214 350 176 C356 138 330 112 300 108 C292 66 250 24 198 24 Z"/>
      <path class="nm-cb" d="M264 226 C288 232 320 226 336 208 C348 194 344 176 330 172 C316 186 292 200 264 204 Z"/>
    </g>
    ${BRAIN_REGIONS.map((r) => {
      const t = TARGET_BY_KEY.get(`region:${r.id}`);
      const n = t ? t.drugs.length : 0;
      const on = activeRegion === r.id;
      return `<g class="nm-region${on ? " on" : ""}${n ? "" : " empty"}" data-anchor="region:${esc(r.id)}" data-region="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.name)}">
        <ellipse class="nm-region-hit" cx="${r.x}" cy="${r.y}" rx="${Math.max(14, r.rx * 0.62)}" ry="${Math.max(11, r.ry * 0.6)}"/>
        <circle class="nm-region-dot" cx="${r.x}" cy="${r.y}" r="5.5"/>
        <text class="nm-region-t" x="${r.x}" y="${r.y - 11}" text-anchor="middle">${esc(r.short || r.name)}</text>
        ${n ? `<text class="nm-region-n" x="${r.x}" y="${r.y + 16}" text-anchor="middle">${n}</text>` : ""}
      </g>`;
    }).join("")}
  </svg>`;
}

function bodyCanvas() {
  return `<svg class="nm-body" viewBox="0 0 300 640" role="img" aria-label="Body targets">
    <g class="nm-body-shape">
      <ellipse cx="150" cy="52" rx="30" ry="34"/>
      <rect x="140" y="80" width="20" height="28" rx="8"/>
      <path d="M104 118 Q150 100 196 118 L190 250 Q190 268 176 276 L124 276 Q110 268 110 250 Z"/>
      <ellipse cx="150" cy="286" rx="32" ry="20"/>
    </g>
    <g class="nm-body-limb">
      <path d="M108 126 L94 214 L98 300"/>
      <path d="M192 126 L206 214 L202 300"/>
      <path d="M134 298 L128 430 L130 566"/>
      <path d="M166 298 L172 430 L170 566"/>
    </g>
    ${organTargets.map(
      (o) => `<g class="nm-organ" data-anchor="organ:${esc(o.id)}" data-organ="${esc(o.id)}" tabindex="0" role="button" aria-label="${esc(o.name)}">
        <circle class="nm-organ-hit" cx="${o.x}" cy="${o.y}" r="${Math.max(o.rx, o.ry) + 9}"/>
        <ellipse class="nm-organ-dot" cx="${o.x}" cy="${o.y}" rx="${Math.max(4, o.rx)}" ry="${Math.max(4, o.ry)}"/>
        <text class="nm-organ-t" x="${o.x + Math.max(o.rx, o.ry) + 6}" y="${o.y + 3}">${esc(o.name)}</text>
      </g>`
    ).join("")}
  </svg>`;
}

function rowHtml(c, active) {
  const keys = targetsOf(c.id);
  const badges = keys
    .map((k) => {
      const t = TARGET_BY_KEY.get(k);
      if (!t) return "";
      return `<span class="nm-badge" style="--bc:${t.color}">${esc(t.short)}</span>`;
    })
    .join("");
  return `<a class="nm-row${active ? " hl" : ""}" href="#/compounds/${esc(c.id)}" data-cid="${esc(c.id)}" data-targets="${esc(keys.join(" "))}">
    <span class="nm-thread-anchor" aria-hidden="true"></span>
    <span class="nm-row-body">
      <span class="nm-row-name">${esc(c.name)}</span>
      <span class="nm-row-meta">${esc(c.cls || "")}</span>
    </span>
    <span class="nm-badges">${badges || '<span class="nm-badge none">unmapped</span>'}</span>
  </a>`;
}

export function map(ctx) {
  const mode = ctx.query.view === "body" ? "body" : "brain";
  const activeRegion = ctx.query.region || "";
  const activeCompound = ctx.query.c || "";

  return `${pageHead(
    "Compound convergence map",
    `All ${COMPOUNDS.length} compounds on the right; a thread from each one into the brain region or body part where it acts. Where several compounds share a target they converge on the same node.`,
    `<a class="btn soft sm" href="#/brain">${icon("brain", 15)} Brain map</a>`,
    "Network"
  )}
  <div class="netmap" id="netmap">
    <svg class="nm-threads" id="nm-threads" aria-hidden="true"></svg>

    <aside class="nm-canvas">
      <div class="card nm-canvas-card">
        <div class="row between wrap" style="gap:8px;margin-bottom:6px">
          <div class="row" style="gap:4px">
            <a class="chip chip-btn ${mode === "brain" ? "on" : ""}" href="#/map?view=brain${activeRegion ? `&region=${esc(activeRegion)}` : ""}">${icon("brain", 12)} Brain</a>
            <a class="chip chip-btn ${mode === "body" ? "on" : ""}" href="#/map?view=body${activeRegion ? `&region=${esc(activeRegion)}` : ""}">${icon("activity", 12)} Body</a>
          </div>
          <button class="btn ghost xs" data-act="toggle-threads">Hide threads</button>
        </div>
        ${mode === "brain" ? brainCanvas(activeRegion, mode) : bodyCanvas()}
        ${
          mode === "brain"
            ? `<div class="nm-organ-chips">${organTargets
                .map(
                  (o) =>
                    `<a class="chip chip-xs" data-anchor="organ:${esc(o.id)}" href="#/map?view=body&organ=${esc(o.id)}">${esc(o.name)}</a>`
                )
                .join("")}</div>`
            : `<p class="tiny dim" style="margin-top:6px">Organ markers show where a compound's effects are documented. Brain targets are listed as chips on the brain view.</p>`
        }
      </div>
      <div class="card tight nm-legend">
        <div class="row between" style="margin-bottom:6px"><span class="tiny dim">Legend</span><span class="tiny dim mono">${ALL_TARGETS.length} nodes</span></div>
        <div class="row wrap" style="gap:5px">
          ${SYSTEMS.slice(0, 10)
            .map((s) => `<span class="chip chip-xs"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</span>`)
            .join("")}
        </div>
        ${unsortedCount ? `<p class="tiny dim" style="margin-top:6px">${unsortedCount} compounds have no mapped target yet — they still appear in the list.</p>` : ""}
      </div>
    </aside>

    <div class="nm-list-wrap">
      <div class="card nm-list-card">
        <div class="row between wrap" style="gap:8px">
          <div class="nm-search">
            ${icon("search", 15)}
            <input class="input" id="nm-filter" type="search" placeholder="Filter ${COMPOUNDS.length} compounds…" autocomplete="off" />
          </div>
          ${activeRegion ? `<a class="chip chip-btn on" href="#/map?view=${esc(mode)}">${esc((TARGET_BY_KEY.get(`region:${activeRegion}`) || TARGET_BY_KEY.get(`organ:${activeRegion}`) || {}).name || activeRegion)} ✕</a>` : ""}
        </div>

        <div class="nm-groups" id="nm-groups">
          ${ORDERED_GROUPS.map((g) =>
            `<div class="nm-group" data-target="${esc(g.target.key)}">
              <div class="nm-group-head">
                <span class="nm-group-dot" style="background:${g.target.color}"></span>
                <span class="nm-group-name">${esc(g.target.name)}</span>
                <span class="nm-group-count">${g.items.length}</span>
              </div>
              ${g.items.map((c) => rowHtml(c, c.id === activeCompound)).join("")}
            </div>`
          ).join("")}
        </div>
        <p class="tiny dim hide" id="nm-empty">Nothing matches that filter.</p>
      </div>
    </div>
  </div>
  <div class="stack" style="margin-top:12px">
    ${callout(
      "info",
      "Reading the map",
      "A thread is an assignment, not a promise: it says a region or organ lists this compound among its documented actors. Convergence on one node means several compounds share a mechanism there — GABA-A is the classic case."
    )}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Threads                                                             */
/* ------------------------------------------------------------------ */

function curve(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x1 - x2) * 0.45);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 - dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 + dx * 0.6).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function mount(root, ctx) {
  const wrap = root.querySelector("#netmap");
  const svg = root.querySelector("#nm-threads");
  if (!wrap || !svg) return;

  let anchors = new Map();
  let drawing = true;

  const draw = () => {
    const w = wrap.getBoundingClientRect();
    if (!w.width) return;
    anchors = new Map();
    wrap.querySelectorAll("[data-anchor]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const key = el.dataset.anchor;
      if (anchors.has(key)) {
        // prefer the element that is actually painted in the canvas
        const prev = anchors.get(key);
        if (prev.area >= r.width * r.height) return;
      }
      anchors.set(key, {
        x: r.left - w.left + r.width / 2,
        y: r.top - w.top + r.height / 2,
        area: r.width * r.height,
      });
    });

    const parts = [];
    wrap.querySelectorAll(".nm-row").forEach((row) => {
      const r = row.getBoundingClientRect();
      if (!r.width) return;
      const x1 = r.left - w.left + 2;
      const y1 = r.top - w.top + r.height / 2;
      (row.dataset.targets || "")
        .split(" ")
        .filter(Boolean)
        .forEach((key) => {
          const a = anchors.get(key);
          if (!a) return;
          const t = TARGET_BY_KEY.get(key);
          parts.push(
            `<path class="nm-thread" data-cid="${esc(row.dataset.cid)}" data-target="${esc(key)}" d="${curve(x1, y1, a.x, a.y)}" stroke="${t ? t.color : "var(--accent)"}"/>`
          );
        });
    });

    svg.setAttribute("viewBox", `0 0 ${Math.round(w.width)} ${Math.round(w.height)}`);
    svg.setAttribute("width", String(Math.round(w.width)));
    svg.setAttribute("height", String(Math.round(w.height)));
    svg.innerHTML = drawing ? parts.join("") : "";
    highlight(root.dataset.focus || "");
  };

  const highlight = (cid) => {
    if (!svg) return;
    svg.querySelectorAll(".nm-thread").forEach((p) => {
      const on = Boolean(cid) && p.dataset.cid === cid;
      p.classList.toggle("hl", on);
      p.classList.toggle("dim", Boolean(cid) && !on);
    });
    root.querySelectorAll(".nm-row").forEach((r) => r.classList.toggle("hl", Boolean(cid) && r.dataset.cid === cid));
  };

  requestAnimationFrame(() => {
    draw();
    requestAnimationFrame(draw);
  });

  const redraw = debounce(draw, 140);
  window.addEventListener("resize", redraw);

  root.addEventListener("pointerover", (ev) => {
    const row = ev.target.closest(".nm-row");
    if (!row) return;
    highlight(row.dataset.cid);
  });
  root.addEventListener("pointerleave", () => highlight(""));
  root.addEventListener("focusin", (ev) => {
    const row = ev.target.closest(".nm-row");
    if (row) highlight(row.dataset.cid);
  });

  root.addEventListener("click", (ev) => {
    const toggle = ev.target.closest('[data-act="toggle-threads"]');
    if (toggle) {
      drawing = !drawing;
      toggle.textContent = drawing ? "Hide threads" : "Show threads";
      svg.innerHTML = "";
      if (drawing) draw();
      return;
    }
    const region = ev.target.closest("[data-region]");
    if (region) {
      ev.preventDefault();
      const id = region.dataset.region;
      const next = ctx.query.region === id ? "#/map?view=brain" : `#/map?view=brain&region=${encodeURIComponent(id)}`;
      location.hash = next.replace(/^#/, "");
    }
  });

  const input = root.querySelector("#nm-filter");
  if (input) {
    input.addEventListener(
      "input",
      debounce(() => {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        root.querySelectorAll(".nm-group").forEach((g) => {
          let inGroup = 0;
          g.querySelectorAll(".nm-row").forEach((row) => {
            const txt = row.dataset.cid.replace(/-/g, " ");
            const name = row.querySelector(".nm-row-name").textContent.toLowerCase();
            const ok = !q || name.includes(q) || txt.includes(q);
            row.classList.toggle("hide", !ok);
            if (ok) inGroup += 1;
          });
          g.classList.toggle("hide", inGroup === 0);
          shown += inGroup;
        });
        const empty = root.querySelector("#nm-empty");
        if (empty) empty.classList.toggle("hide", shown > 0);
        draw();
      }, 160)
    );
  }
}

export default { render: map, mount };