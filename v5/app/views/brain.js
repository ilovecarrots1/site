/* ==========================================================================
   Brain map v3 — the flagship screen.
   2.5D layered SVG: shell / limbic / brainstem with pointer parallax,
   target-driven lighting, receptor clusters, impulses along tracts,
   pinch-zoom and pan, and a live PubMed strip under the map.
   ========================================================================== */

import { esc, icon } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "../data/neuro.js";
import {
  REGIONS,
  REGION_MAP,
  TARGETS,
  TARGET_MAP,
  CLUSTER_DOTS,
  SILHOUETTE,
  CEREBELLUM,
  SULCI,
  GYRI,
  CEREBELLUM_FOLIA,
  BRAINSTEM,
  CORPUS_CALLOSUM,
  NEURON_LINKS,
  NEURON_SOMAS,
  NEURON_MAP,
  NEURON_PULSES,
  LAYERS,
  STATS,
  targetsForRegion,
  regionsForTarget,
  compoundRegions,
  compoundTargets,
  targetColor,
  regionColor,
} from "../data/brainmap.js";
import { searchPapers } from "../lib/pubmed.js";
import { mountBrain3D } from "../lib/brain3d.js";
import {
  OUTLINE, SURFACE_REGIONS, MEDIAL_REGIONS, SULCI_A, FOLIA_A, CALLOSUM_A, MEDIAL_LINES,
} from "../data/brain-anatomy.js";

/* --------------------------------------------------------------------------
   View state (module-local, reset on navigation)
   -------------------------------------------------------------------------- */

const S = {
  view: "anat",
  cut: false,
  mode: "targets",
  q: "",
  kind: null,
  id: null,
  zoom: 1,
  tx: 0,
  ty: 0,
  papers: [],
  pLoading: false,
  pError: null,
  pKey: "",
};

let paperSeq = 0;
const paperCache = new Map(); // session-only, never persisted
let live3d = null; // previous 3D instance — destroyed on re-mount so loops never stack

/* Neuroanatomically plausible tracts for the impulse animation. */
const TRACTS = [
  ["vta", "nucleus-accumbens"],
  ["vta", "prefrontal-cortex"],
  ["vta", "amygdala"],
  ["substantia-nigra", "striatum"],
  ["raphe", "prefrontal-cortex"],
  ["raphe", "hippocampus"],
  ["locus-coeruleus", "prefrontal-cortex"],
  ["basal-forebrain", "hippocampus"],
];

function tractPath(a, b) {
  const A = REGION_MAP.get(a);
  const B = REGION_MAP.get(b);
  if (!A || !B) return "";
  const mx = (A.x + B.x) / 2 + (B.y - A.y) * 0.18;
  const my = (A.y + B.y) / 2 - (B.x - A.x) * 0.18;
  return `M${A.x} ${A.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${B.x} ${B.y}`;
}

/* --------------------------------------------------------------------------
   SVG fragments
   -------------------------------------------------------------------------- */

function regionSvg(r) {
  const col = regionColor(r);
  const halo = Math.max(r.rx, r.ry) * 1.45;
  const inside = r.rx >= 20;
  const lx = r.x;
  const ly = inside ? r.y + 2 : r.y + r.ry + 6.5;
  const name = esc(r.name);
  return `<g class="bm-region" data-region="${esc(r.id)}" data-lit="0" style="color:${col}" tabindex="0" role="button" aria-label="${name}">
      <circle class="bm-halo" cx="${r.x}" cy="${r.y}" r="${halo.toFixed(1)}"></circle>
      <ellipse class="bm-core" cx="${r.x}" cy="${r.y}" rx="${r.rx}" ry="${r.ry}"></ellipse>
      <circle class="bm-dot" cx="${r.x}" cy="${r.y}" r="1.6"></circle>
      <ellipse class="bm-ring" cx="${r.x}" cy="${r.y}" rx="${r.rx + 3}" ry="${r.ry + 3}"></ellipse>
      <ellipse class="bm-hit" cx="${r.x}" cy="${r.y}" rx="${r.rx + 7}" ry="${r.ry + 7}"></ellipse>
      <text class="bm-label" x="${lx}" y="${ly}">${esc(r.short)}</text>
    </g>`;
}

function layerSvg(layerId, extra) {
  const items = REGIONS.filter((r) => r.layer === layerId);
  return `<g class="bm-layer bm-layer-${layerId}">${extra || ""}${items.map(regionSvg).join("")}</g>`;
}

function mapSvg() {
  const shell = `<path class="bm-shell" d="${SILHOUETTE}"></path>
    <path class="bm-callosal" d="${CORPUS_CALLOSUM}"></path>
    ${GYRI.map((d) => `<path class="bm-gyrus" d="${d}"></path>`).join("")}
    ${SULCI.map((d) => `<path class="bm-sulcus" d="${d}"></path>`).join("")}
    <path class="bm-brainstem" d="${BRAINSTEM}"></path>
    <path class="bm-shell bm-cerebellum" d="${CEREBELLUM}"></path>
    ${CEREBELLUM_FOLIA.map((d) => `<path class="bm-folium" d="${d}"></path>`).join("")}`;

  const clusters = CLUSTER_DOTS.map(
    (d) => `<circle cx="${d.x}" cy="${d.y}" r="1.05" style="--d:${d.d}s"></circle>`
  ).join("");

  const tracts = TRACTS.map(([a, b]) => `<path class="bm-tract" d="${tractPath(a, b)}"></path>`).join("");

  /* Neuron overlay: axons, travelling pulses, somas with dendrite crosses. */
  const axons = NEURON_LINKS.map(([a, b]) => {
    const A = NEURON_MAP.get(a);
    const B = NEURON_MAP.get(b);
    if (!A || !B) return "";
    return `<line class="bm-axon" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"></line>`;
  }).join("");
  const pulses = NEURON_PULSES.map(
    (p) => `<circle class="bm-pulse" r="1.5" style="--x1:${p.x1}px;--y1:${p.y1}px;--x2:${p.x2}px;--y2:${p.y2}px;--d:${p.d}s;--t:${p.t}s"></circle>`
  ).join("");
  const somas = NEURON_SOMAS.map((r) => {
    const col = regionColor(r);
    return `<g class="bm-soma" style="color:${col}"><path d="M${r.x - 4.5} ${r.y} L${r.x + 4.5} ${r.y} M${r.x} ${r.y - 4.5} L${r.x} ${r.y + 4.5}"></path><circle cx="${r.x}" cy="${r.y}" r="2.1"></circle></g>`;
  }).join("");
  const neurons = `<g class="bm-neurons">${axons}${pulses}${somas}</g>`;

  return `<svg class="bm-svg" id="bm-svg" viewBox="0 0 ${420} 320" data-focus="off" role="img"
      aria-label="Interactive map of brain regions, neurotransmitter targets and compounds">
      <defs>
        <radialGradient id="bm-shell-grad" cx="42%" cy="30%" r="85%">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.17"></stop>
          <stop offset="55%" stop-color="var(--accent)" stop-opacity="0.07"></stop>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"></stop>
        </radialGradient>
        <linearGradient id="bm-stem-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32"></stop>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.10"></stop>
        </linearGradient>
      </defs>
      <g id="bm-cam">
        ${layerSvg("shell", shell)}
        ${layerSvg("deep", `<g class="bm-cluster">${clusters}</g>${tracts}${neurons}`)}
        ${layerSvg("mid")}
      </g>
    </svg>`;
}

/* --------------------------------------------------------------------------
   Side lists
   -------------------------------------------------------------------------- */

function tabRow() {
  const tabs = [
    ["targets", "Мишени", TARGETS.length],
    ["compounds", "Препараты", COMPOUNDS.length],
    ["regions", "Регионы", REGIONS.length],
  ];
  return `<div class="bm-tabs">${tabs
    .map(
      ([id, label, n]) =>
        `<button type="button" data-tab="${id}" class="${S.mode === id ? "on" : ""}">${esc(label)} <span class="dim">${n}</span></button>`
    )
    .join("")}</div>`;
}

function listHtml() {
  const q = S.q.trim().toLowerCase();
  let rows = [];

  if (S.mode === "targets") {
    rows = TARGETS.filter((t) => !q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        id: t.id,
        label: t.short,
        sub: t.name,
        count: t.regions.length,
        color: targetColor(t),
        kind: "target",
      }));
  } else if (S.mode === "compounds") {
    rows = COMPOUNDS.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.aliases || []).some((a) => String(a).toLowerCase().includes(q))
    )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        id: c.id,
        label: c.name,
        sub: c.cls,
        count: compoundRegions(c.id).length,
        color: "var(--accent)",
        kind: "compound",
      }));
  } else {
    rows = REGIONS.filter((r) => !q || r.name.toLowerCase().includes(q) || r.short.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({
        id: r.id,
        label: r.name,
        sub: r.short,
        count: targetsForRegion(r.id).length,
        color: regionColor(r),
        kind: "region",
      }));
  }

  if (!rows.length) return `<div class="bm-empty">Ничего не найдено по «${esc(S.q)}».</div>`;

  return `<div class="bm-list" id="bm-list">${rows
    .map(
      (r) => `<button type="button" class="bm-item ${S.kind === r.kind && S.id === r.id ? "on" : ""}"
        data-pick="${esc(r.kind)}" data-id="${esc(r.id)}"
        title="${esc(r.label)} — ${esc(r.sub || "")}">
        <span class="dot" style="background:${r.color}"></span>
        <span class="name">${esc(r.label)}</span>
        <span class="count">${r.count}</span>
      </button>`
    )
    .join("")}</div>`;
}

function sideHtml() {
  return `<div class="bm-side">
    ${tabRow()}
    <label class="bm-search">${icon("search", 14)}
      <input id="bm-q" type="search" inputmode="search" placeholder="Фильтр: ${S.mode === "targets" ? "мишени" : S.mode === "compounds" ? "препараты" : "регионы"}" value="${esc(S.q)}" autocomplete="off" />
    </label>
    ${listHtml()}
    <div class="card tight">
      <div class="tiny dim" style="line-height:1.5">
        ${STATS.regions} регионов · ${STATS.targets} мишеней · ${STATS.connections} рецепторных узлов.
        Цвет — основная нейромедиаторная система. Яркость подсветки — плотность рецепторов.
      </div>
    </div>
  </div>`;
}

/* --------------------------------------------------------------------------
   Detail panel + live papers
   -------------------------------------------------------------------------- */

function systemChips(ids) {
  return (ids || [])
    .map((id) => {
      const s = SYSTEM_BY_ID.get(id);
      if (!s) return "";
      return `<span class="chip chip-xs"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</span>`;
    })
    .join("");
}

function compoundChips(ids, limit) {
  const list = (ids || []).slice(0, limit || 14);
  const rest = (ids || []).length - list.length;
  return (
    list
      .map((id) => {
        const c = COMPOUND_BY_ID.get(id);
        if (!c) return "";
        return `<a class="chip chip-btn chip-xs" href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>`;
      })
      .join("") + (rest > 0 ? `<span class="chip chip-xs">+${rest}</span>` : "")
  );
}

function detailHtml() {
  if (!S.kind || !S.id) {
    return `<div class="card">
      <div class="bm-empty">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:4px">Выбери мишень, препарат или регион</div>
        <div class="tiny dim">Тапни по карте или по списку справа — здесь появится описание.</div>
      </div>
    </div>`;
  }

  if (S.kind === "region") {
    const r = REGION_MAP.get(S.id);
    if (!r) return "";
    const tg = targetsForRegion(r.id).slice(0, 10);
    const drugs = (r.drugs || []).filter((id) => COMPOUND_BY_ID.has(id));
    return `<div class="card">
      <div class="bm-region-head">
        <div style="flex:1 1 auto;min-width:0">
          <div class="bm-region-title">${esc(r.name)}</div>
          <div class="bm-region-sub">${esc(r.short)} · ${r.layer === "shell" ? "кора" : r.layer === "mid" ? "лимбический слой" : "глубокий слой"}</div>
        </div>
        <span class="chip chip-xs">${tg.length} мишеней</span>
      </div>
      <p class="small" style="margin:10px 0 0">${esc(r.note)}</p>
      <div class="bm-tagrow">${systemChips(r.systems)}</div>
      <div class="divider"></div>
      <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Мишени здесь</div>
      <div class="bm-tagrow">${tg
        .map(
          (x) =>
            `<button type="button" class="chip chip-btn chip-xs" data-pick="target" data-id="${esc(x.target.id)}">
              <span class="dot" style="background:${targetColor(x.target)}"></span>${esc(x.target.short)}
              <span class="dim">${Math.round(x.weight * 100)}%</span>
            </button>`
        )
        .join("") || `<span class="tiny dim">Пока нет размеченных мишеней.</span>`}</div>
      <div class="divider"></div>
      <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Препараты, действующие здесь</div>
      <div class="bm-tagrow">${compoundChips(drugs) || `<span class="tiny dim">—</span>`}</div>
    </div>`;
  }

  if (S.kind === "target") {
    const t = TARGET_MAP.get(S.id);
    if (!t) return "";
    const regs = regionsForTarget(t.id);
    const comps = COMPOUNDS.filter((c) => compoundTargets(c.id).some((x) => x.id === t.id)).slice(0, 12);
    return `<div class="card">
      <div class="bm-region-head">
        <div style="flex:1 1 auto;min-width:0">
          <div class="bm-region-title">${esc(t.name)}</div>
          <div class="bm-region-sub">${esc(t.short)} · ${regs.length} регионов</div>
        </div>
        <span class="chip chip-xs"><span class="dot" style="background:${targetColor(t)}"></span>${esc(
      (SYSTEM_BY_ID.get(t.system) || {}).name || t.system
    )}</span>
      </div>
      <div class="divider"></div>
      <div class="bars" style="margin:0">
        ${regs
          .map(
            (x) => `<div class="bar-row">
              <span class="bar-label" style="cursor:pointer" data-pick="region" data-id="${esc(x.region.id)}">${esc(
              x.region.short
            )}</span>
              <span class="bar-track"><i style="width:${Math.round(x.weight * 100)}%;background:${targetColor(t)}"></i></span>
              <span class="bar-val">${Math.round(x.weight * 100)}</span>
            </div>`
          )
          .join("")}
      </div>
      <div class="divider"></div>
      <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Препараты, затрагивающие мишень</div>
      <div class="bm-tagrow">${compoundChips(comps.map((c) => c.id)) || `<span class="tiny dim">—</span>`}</div>
    </div>`;
  }

  const c = COMPOUND_BY_ID.get(S.id);
  if (!c) return "";
  const regs = compoundRegions(c.id).slice(0, 10);
  const tgs = compoundTargets(c.id);
  return `<div class="card">
    <div class="bm-region-head">
      <div style="flex:1 1 auto;min-width:0">
        <div class="bm-region-title">${esc(c.name)}</div>
        <div class="bm-region-sub">${esc(c.cls || "")}${c.subcls ? " · " + esc(c.subcls) : ""}</div>
      </div>
      <a class="chip chip-btn chip-xs" href="#/compounds/${esc(c.id)}">Открыть монографию</a>
    </div>
    <p class="small" style="margin:10px 0 0">${esc(c.summary || "")}</p>
    <div class="bm-tagrow">${(tgs || []).slice(0, 8).map((t) => `<span class="chip chip-xs"><span class="dot" style="background:${targetColor(
      t
    )}"></span>${esc(t.short)}</span>`).join("")}</div>
    <div class="divider"></div>
    <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Задействованные регионы</div>
    <div class="bars" style="margin:0">
      ${regs
        .map(
          (x) => `<div class="bar-row">
            <span class="bar-label" style="cursor:pointer" data-pick="region" data-id="${esc(x.region.id)}">${esc(
            x.region.short
          )}</span>
            <span class="bar-track"><i style="width:${Math.round(x.weight * 100)}%"></i></span>
            <span class="bar-val">${Math.round(x.weight * 100)}</span>
          </div>`
        )
        .join("") || `<div class="tiny dim">Нет размеченных регионов.</div>`}
    </div>
  </div>`;
}

function papersHtml() {
  if (!S.kind || !S.id) return "";
  const head = `<div class="row between" style="margin-bottom:8px;min-width:0">
      <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase">Живые исследования</div>
      <span class="live-dot tiny dim" title="Загружается с PubMed прямо на устройстве"></span>
    </div>`;

  if (S.pLoading && !S.papers.length) {
    return `<div class="card">${head}
      <div class="skeleton" style="height:11px;border-radius:4px;margin:8px 0"></div>
      <div class="skeleton" style="height:11px;border-radius:4px;margin:8px 0;width:82%"></div>
      <div class="skeleton" style="height:11px;border-radius:4px;margin:8px 0;width:64%"></div>
    </div>`;
  }

  if (S.pError) {
    return `<div class="card">${head}
      <div class="small dim">Живой поиск сейчас недоступен — ${esc(S.pError)}. Сама карта работает офлайн.</div>
    </div>`;
  }

  if (!S.papers.length) {
    return `<div class="card">${head}<div class="small dim">По этому запросу статей не найдено. Попробуй вкладку «Исследования» с более широким запросом.</div></div>`;
  }

  return `<div class="card">${head}${S.papers
    .slice(0, 4)
    .map((p) => {
      const pmid = p.pmid || p.uid || "";
      const title = p.title || p.ti || "Untitled";
      const meta = [p.journal || p.journalTitle || p.jt || "", p.year || p.pubdate || ""].filter(Boolean).join(" · ");
      return `<a class="paper-row" href="https://pubmed.ncbi.nlm.nih.gov/${esc(pmid)}/" target="_blank" rel="noopener noreferrer"
          style="display:block;padding:8px 0;border-bottom:1px solid color-mix(in srgb,var(--text) 6%,transparent)">
          <div class="small" style="line-height:1.35;overflow-wrap:anywhere">${esc(title)}</div>
          <div class="tiny dim" style="margin-top:3px">${esc(meta)}${pmid ? " · PMID " + esc(pmid) : ""}</div>
        </a>`;
    })
    .join("")}</div>`;
}

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */

/* Anatomical pink brain: lateral surface or medial cutaway. */
function anatomySvg() {
  const regs = S.cut ? MEDIAL_REGIONS : SURFACE_REGIONS;
  const aria = (r) => esc((REGION_MAP.get(r.id) || {}).name || r.id);
  const shape = (r) =>
    r.e
      ? `<ellipse class="ba-region ba-tone-${r.tone}" data-region="${esc(r.id)}" cx="${r.e[0]}" cy="${r.e[1]}" rx="${r.e[2]}" ry="${r.e[3]}" tabindex="0" role="button" aria-label="${aria(r)}"></ellipse>`
      : `<path class="ba-region ba-tone-${r.tone}" data-region="${esc(r.id)}" d="${r.d}" tabindex="0" role="button" aria-label="${aria(r)}"></path>`;
  const labels = regs
    .map((r) => {
      const reg = REGION_MAP.get(r.id);
      return `<text class="ba-label" data-label-for="${esc(r.id)}" x="${r.lx}" y="${r.ly}">${esc(reg ? reg.short : r.id)}</text>`;
    })
    .join("");
  return `<svg id="bm-anat-svg" class="bm-svg ba-svg" viewBox="0 0 420 320" role="img" aria-label="Anatomical brain map">
    <path class="${S.cut ? "ba-cut" : "ba-outline"}" d="${OUTLINE}"></path>
    ${S.cut ? `<path class="ba-callosal" d="${CALLOSUM_A}"></path>` : ""}
    ${regs.map(shape).join("")}
    ${(S.cut ? MEDIAL_LINES : SULCI_A).map((d) => `<path class="ba-sulcus" d="${d}"></path>`).join("")}
    ${FOLIA_A.map((d) => `<path class="ba-folium" d="${d}"></path>`).join("")}
    ${labels}
  </svg>`;
}

export function render(ctx) {
  S.q = "";
  S.kind = null;
  S.id = null;
  S.zoom = 1;
  S.tx = 0;
  S.ty = 0;
  S.papers = [];
  S.pError = null;
  S.pLoading = false;

  const q = (ctx && ctx.query) || {};
  if (q.target && TARGET_MAP.has(String(q.target))) {
    S.kind = "target";
    S.id = String(q.target);
    S.mode = "targets";
  } else if (q.compound && COMPOUND_BY_ID.has(String(q.compound))) {
    S.kind = "compound";
    S.id = String(q.compound);
    S.mode = "compounds";
  } else if (q.region && REGION_MAP.has(String(q.region))) {
    S.kind = "region";
    S.id = String(q.region);
    S.mode = "regions";
  }

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Флагман · анатомия</div>
        <h1 class="page-title">Карта мозга</h1>
        <div class="page-sub">${STATS.regions} регионов · ${STATS.targets} мишеней · ${STATS.compounds} препаратов. Где именно действует каждое вещество.</div>
      </div>
      <div class="bm-legend" style="margin:0;padding:0;border:0;justify-content:flex-end">
        ${SYSTEMS.map((s) => `<span class="chip chip-xs"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</span>`).join("")}
      </div>
    </div>

    <div class="bm-wrap">
      <div style="min-width:0">
        <div class="bm-canvas">
          <div class="bm-bar">
            <span class="bm-bar-label" id="bm-mode-note">Тапни по зоне мозга — откроется её описание</span>
            <span class="spacer"></span>
            <button type="button" class="chip chip-btn chip-xs${S.cut ? " on" : ""}" data-act="cut" id="bm-cut"${S.view === "anat" ? "" : " hidden"}>Глубокие структуры</button>
            <span class="bm-view-toggle">
              <button type="button" class="chip chip-btn chip-xs${S.view === "anat" ? " on" : ""}" data-view="anat">Анатомия</button>
              <button type="button" class="chip chip-btn chip-xs${S.view === "3d" ? " on" : ""}" data-view="3d">3D</button>
              <button type="button" class="chip chip-btn chip-xs${S.view === "svg" ? " on" : ""}" data-view="svg">Схема</button>
            </span>
            <button type="button" class="chip chip-btn chip-xs" data-act="reset" id="bm-reset">Сброс</button>
          </div>
          <div class="bm-stage bm-stage-anat" id="bm-stage-anat"${S.view === "anat" ? "" : " hidden"}>
            ${anatomySvg()}
            <div class="bm-hint">тапни по зоне · «Глубокие структуры» — внутренние ядра и лимбическая система</div>
          </div>
          <div class="bm-stage" id="bm-stage" style="--px:0;--py:0"${S.view === "svg" ? "" : " hidden"}>
            ${mapSvg()}
            <div class="bm-ctrls">
              <button type="button" data-zoom="in" aria-label="Приблизить">+</button>
              <button type="button" data-zoom="out" aria-label="Отдалить">−</button>
              <button type="button" data-zoom="reset" aria-label="Сбросить зум">⌂</button>
            </div>
            <div class="bm-hint">тяни — панорама · колесо/щипок — зум · ← → — переход по регионам</div>
          </div>
          <div class="bm-stage bm-stage-3d" id="bm-stage-3d"${S.view === "3d" ? "" : " hidden"}>
            <canvas id="bm-3d" class="bm-3d" aria-label="Вращаемая 3D-модель мозга с зонами-указателями"></canvas>
            <div class="bm-ctrls">
              <button type="button" id="bm-auto" aria-label="Автоповорот">⟳</button>
              <button type="button" id="bm-reset3d" aria-label="Сбросить ориентацию">⌂</button>
            </div>
            <div class="bm-hint">тяни — вращение · щипок/колесо — зум · тап по точке — регион · двойной тап — сброс</div>
          </div>
        </div>

        <div class="bm-panel">
          <div id="bm-detail">${detailHtml()}</div>
          <div id="bm-papers">${papersHtml()}</div>
        </div>
      </div>
      <div id="bm-side">${sideHtml()}</div>
    </div>
  </div>`;
}

/* --------------------------------------------------------------------------
   Behaviour
   -------------------------------------------------------------------------- */

export function mount(root) {
  const stage = root.querySelector("#bm-stage");
  const svg = root.querySelector("#bm-svg");
  const cam = root.querySelector("#bm-cam");
  const side = root.querySelector("#bm-side");
  const detail = root.querySelector("#bm-detail");
  const papers = root.querySelector("#bm-papers");
  const modeNote = root.querySelector("#bm-mode-note");
  if (!stage || !svg || !cam) return;

  /* ---- 3D model ---------------------------------------------------------- */

  const stage3d = root.querySelector("#bm-stage-3d");
  const canvas3d = root.querySelector("#bm-3d");
  const stageAnat = root.querySelector("#bm-stage-anat");

  /* Right-click on a brain zone must not open the browser's native context
     menu. Suppress it on the interactive SVG stages; the 3D canvas handles its
     own contextmenu inside mountBrain3D. Side-panel text stays right-clickable. */
  for (const el of [stage, stageAnat]) {
    if (el) el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function litState() {
    const lit = new Map();
    let focus = false;
    if (S.kind === "region") {
      const r = REGION_MAP.get(S.id);
      if (r) {
        lit.set(r.id, 2);
        targetsForRegion(r.id).forEach((x) =>
          x.target.regions.forEach(([rid, w]) => {
            if (rid !== r.id && w >= 0.6 && !lit.has(rid)) lit.set(rid, 1);
          })
        );
      }
    } else if (S.kind === "target") {
      focus = true;
      regionsForTarget(S.id).forEach((x) => lit.set(x.region.id, x.weight >= 0.8 ? 2 : 1));
    } else if (S.kind === "compound") {
      focus = true;
      compoundRegions(S.id).forEach((x) => lit.set(x.region.id, x.weight >= 0.8 ? 2 : 1));
    }
    return { lit, focus };
  }

  if (live3d) {
    live3d.destroy();
    live3d = null;
  }
  let b3d = null;
  if (canvas3d) {
    b3d = mountBrain3D(canvas3d, {
      regions: REGIONS.map((r) => ({ ...r, color: regionColor(r) })),
      palette: { cortex: "#b8b4a8", cerebellum: "#8a867c", stem: "#9c988c" },
      getLit: litState,
      onSelect: (id) => select("region", id),
    });
    live3d = b3d;
  }

  root.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      S.view = b.getAttribute("data-view");
      root.querySelectorAll("[data-view]").forEach((x) => x.classList.toggle("on", x === b));
      stage.hidden = S.view !== "svg";
      if (stage3d) stage3d.hidden = S.view !== "3d";
      if (stageAnat) stageAnat.hidden = S.view !== "anat";
      const cb = root.querySelector("#bm-cut");
      if (cb) cb.hidden = S.view !== "anat";
      if (b3d) {
        b3d.sync();
        b3d.kick();
      }
    })
  );

  /* Anatomy: tap a zone -> existing region card; cutaway toggle. */
  if (stageAnat) {
    stageAnat.addEventListener("click", (e) => {
      const g = e.target.closest("[data-region]");
      if (g) select("region", g.getAttribute("data-region"));
    });
    stageAnat.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const g = e.target.closest ? e.target.closest("[data-region]") : null;
      if (g) {
        e.preventDefault();
        select("region", g.getAttribute("data-region"));
      }
    });
  }
  const cutBtn = root.querySelector("#bm-cut");
  if (cutBtn) {
    cutBtn.addEventListener("click", () => {
      S.cut = !S.cut;
      cutBtn.classList.toggle("on", S.cut);
      const cur = stageAnat && stageAnat.querySelector("svg");
      if (cur) {
        cur.outerHTML = anatomySvg();
        paintAnat();
      }
    });
  }
  const autoBtn = root.querySelector("#bm-auto");
  if (autoBtn && b3d) {
    autoBtn.classList.toggle("on", b3d.isAuto());
    autoBtn.addEventListener("click", () => {
      autoBtn.classList.toggle("on", b3d.setAuto(!b3d.isAuto()));
    });
  }
  const reset3d = root.querySelector("#bm-reset3d");
  if (reset3d && b3d) reset3d.addEventListener("click", () => b3d.reset());

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  let raf = 0;

  /* ---- camera ---------------------------------------------------------- */

  function applyCam() {
    cam.setAttribute(
      "transform",
      `translate(${(210 * (1 - S.zoom) + S.tx).toFixed(2)} ${(160 * (1 - S.zoom) + S.ty).toFixed(2)}) scale(${S.zoom.toFixed(3)})`
    );
    svg.setAttribute("data-zoom", S.zoom > 1.3 ? "in" : "out");
  }

  function zoomBy(f, cx, cy) {
    const next = clamp(S.zoom * f, 0.85, 4);
    if (next === S.zoom) return;
    S.zoom = next;
    applyCam();
    if (cx != null) void cy;
  }

  stage.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.12 : 0.89);
    },
    { passive: false }
  );

  /* ---- pointer: pan + pinch ------------------------------------------- */

  const ptrs = new Map();
  let dragging = false;
  let moved = 0;
  let startX = 0;
  let startY = 0;
  let pinchDist = 0;

  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".bm-ctrls")) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) {
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
    } else if (ptrs.size === 2) {
      const [a, b] = Array.from(ptrs.values());
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });

  stage.addEventListener("pointermove", (e) => {
    const prev = ptrs.get(e.pointerId);
    if (!prev) {
      // parallax only when idle-hovering (mouse)
      if (e.pointerType === "mouse" && !dragging) parallax(e);
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size >= 2) {
      const [a, b] = Array.from(ptrs.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) {
        const f = dist / pinchDist;
        if (Math.abs(f - 1) > 0.01) zoomBy(f);
      }
      pinchDist = dist;
      return;
    }

    if (!dragging) return;
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved < 6) return;
    const rect = stage.getBoundingClientRect();
    const k = 420 / (rect.width || 420);
    S.tx += dx * k;
    S.ty += dy * k;
    applyCam();
  });

  function endPointer(e) {
    if (ptrs.has(e.pointerId)) ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinchDist = 0;
    if (ptrs.size === 0) {
      const wasDrag = moved >= 6;
      dragging = false;
      if (!wasDrag) {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const g = hit && hit.closest ? hit.closest("[data-region]") : null;
        if (g) select("region", g.getAttribute("data-region"));
      }
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") {
      stage.style.setProperty("--px", "0");
      stage.style.setProperty("--py", "0");
    }
  });

  function parallax(e) {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      const px = ((e.clientX - r.left) / (r.width || 1) - 0.5) * 2;
      const py = ((e.clientY - r.top) / (r.height || 1) - 0.5) * 2;
      stage.style.setProperty("--px", px.toFixed(3));
      stage.style.setProperty("--py", py.toFixed(3));
    });
  }

  /* ---- lighting -------------------------------------------------------- */

  function light(regionId, level) {
    const g = svg.querySelector(`[data-region="${regionId}"]`);
    if (g) g.setAttribute("data-lit", String(level));
  }

  function clearLight() {
    svg.querySelectorAll(".bm-region").forEach((g) => {
      g.setAttribute("data-lit", "0");
      g.classList.remove("on");
    });
    svg.setAttribute("data-focus", "off");
  }

  function paintAnat() {
    const a = root.querySelector("#bm-anat-svg");
    if (!a) return;
    const { lit } = litState();
    a.querySelectorAll("[data-region]").forEach((g) => {
      const id = g.getAttribute("data-region");
      const isSel = S.kind === "region" && id === S.id;
      g.classList.toggle("on", isSel);
      g.classList.toggle("lit", (lit.get(id) || 0) > 0 && !isSel);
    });
    a.querySelectorAll("[data-label-for]").forEach((t) => {
      const id = t.getAttribute("data-label-for");
      t.classList.toggle("on", S.kind === "region" && id === S.id);
    });
  }

  function paintSelection() {
    clearLight();
    paintAnat();
    if (b3d) b3d.sync();
    if (!S.kind) return;

    if (S.kind === "region") {
      const r = REGION_MAP.get(S.id);
      if (r) {
        light(r.id, 2);
        const g = svg.querySelector(`[data-region="${r.id}"]`);
        if (g) g.classList.add("on");
        (r.systems || []).forEach(() => void 0);
        targetsForRegion(r.id).forEach((x) => {
          x.target.regions.forEach(([rid, w]) => {
            if (rid !== r.id && w >= 0.6) light(rid, 1);
          });
        });
      }
      return;
    }

    if (S.kind === "target") {
      svg.setAttribute("data-focus", "on");
      regionsForTarget(S.id).forEach((x) => light(x.region.id, x.weight >= 0.8 ? 2 : 1));
      return;
    }

    if (S.kind === "compound") {
      svg.setAttribute("data-focus", "on");
      compoundRegions(S.id).forEach((x) => light(x.region.id, x.weight >= 0.8 ? 2 : 1));
    }
  }

  /* ---- selection ------------------------------------------------------- */

  function select(kind, id) {
    if (!kind || !id) return;
    S.kind = kind;
    S.id = id;
    if (kind === "region") S.mode = "regions";
    if (kind === "target") S.mode = "targets";
    if (kind === "compound") S.mode = "compounds";

    paintSelection();
    detail.innerHTML = detailHtml();
    papers.innerHTML = papersHtml();
    side.innerHTML = sideHtml();
    bindSide();
    bindDetail();

    if (modeNote) {
      const label =
        kind === "region"
          ? (REGION_MAP.get(id) || {}).name
          : kind === "target"
          ? (TARGET_MAP.get(id) || {}).name
          : (COMPOUND_BY_ID.get(id) || {}).name;
      const kindRu = kind === "region" ? "регион" : kind === "target" ? "мишень" : "препарат";
      modeNote.textContent = `${kindRu}: ${label || id}`;
    }

    history.replaceState(null, "", `#/brain?${kind}=${encodeURIComponent(id)}`);
    loadPapers(kind, id);
  }

  /* ---- live literature ------------------------------------------------- */

  function paperTerm(kind, id) {
    if (kind === "region") return `${(REGION_MAP.get(id) || {}).name || id} neuropharmacology`;
    if (kind === "target") return `${(TARGET_MAP.get(id) || {}).name || id} receptor pharmacology`;
    return `${(COMPOUND_BY_ID.get(id) || {}).name || id} mechanism`;
  }

  function loadPapers(kind, id) {
    const key = `${kind}:${id}`;
    S.pKey = key;
    const cached = paperCache.get(key);
    if (cached) {
      S.papers = cached;
      S.pError = null;
      S.pLoading = false;
      papers.innerHTML = papersHtml();
      return;
    }

    S.papers = [];
    S.pError = null;
    S.pLoading = true;
    papers.innerHTML = papersHtml();

    const seq = ++paperSeq;
    searchPapers(paperTerm(kind, id), { retmax: 4 })
      .then((res) => {
        if (seq !== paperSeq) return;
        S.papers = (res && res.papers) || [];
        S.pError = null;
        paperCache.set(key, S.papers);
      })
      .catch((err) => {
        if (seq !== paperSeq) return;
        if (err && err.kind === "aborted") return;
        S.pError = (err && err.message) || "network error";
      })
      .then(() => {
        if (seq !== paperSeq) return;
        S.pLoading = false;
        papers.innerHTML = papersHtml();
      });
  }

  /* ---- side + detail wiring -------------------------------------------- */

  function bindSide() {
    side.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        S.mode = b.getAttribute("data-tab");
        S.q = "";
        side.innerHTML = sideHtml();
        bindSide();
      })
    );

    const q = side.querySelector("#bm-q");
    if (q) {
      let t = 0;
      q.addEventListener("input", () => {
        S.q = q.value;
        clearTimeout(t);
        t = setTimeout(() => {
          const caret = q.selectionStart;
          side.innerHTML = sideHtml();
          bindSide();
          const nq = side.querySelector("#bm-q");
          if (nq) {
            nq.focus();
            try {
              nq.setSelectionRange(caret, caret);
            } catch (_) {}
          }
        }, 140);
      });
    }

    side.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => select(b.getAttribute("data-pick"), b.getAttribute("data-id")))
    );
  }

  function bindDetail() {
    detail.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => select(b.getAttribute("data-pick"), b.getAttribute("data-id")))
    );
  }

  /* ---- zoom buttons + reset -------------------------------------------- */

  root.querySelectorAll("[data-zoom]").forEach((b) =>
    b.addEventListener("click", () => {
      const act = b.getAttribute("data-zoom");
      if (act === "reset") {
        S.zoom = 1;
        S.tx = 0;
        S.ty = 0;
        applyCam();
        return;
      }
      zoomBy(act === "in" ? 1.25 : 0.8);
    })
  );

  const reset = root.querySelector("#bm-reset");
  if (reset) {
    reset.addEventListener("click", () => {
      S.zoom = 1;
      S.tx = 0;
      S.ty = 0;
      applyCam();
      S.kind = null;
      S.id = null;
      clearLight();
      paintAnat();
      if (b3d) {
        b3d.reset();
        b3d.sync();
      }
      detail.innerHTML = detailHtml();
      papers.innerHTML = papersHtml();
      side.innerHTML = sideHtml();
      bindSide();
      bindDetail();
      if (modeNote) modeNote.textContent = "Тапни по зоне мозга — откроется её описание";
    });
  }

  /* ---- keyboard -------------------------------------------------------- */

  function onKey(e) {
    if (e.target && /input|textarea|select/i.test(e.target.tagName || "")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const pool = REGIONS;
    const i = Math.max(0, pool.findIndex((r) => r.id === S.id));
    const next = e.key === "ArrowRight" ? (i + 1) % pool.length : (i - 1 + pool.length) % pool.length;
    e.preventDefault();
    select("region", pool[next].id);
  }
  root.addEventListener("keydown", onKey);

  /* ---- boot ------------------------------------------------------------ */

  applyCam();
  bindSide();
  bindDetail();
  paintSelection();
  if (S.kind && S.id) loadPapers(S.kind, S.id);

  // Freeze the decorative loops when the tab is hidden.
  document.addEventListener("visibilitychange", onVis);
  function onVis() {
    svg.style.animationPlayState = document.hidden ? "paused" : "running";
    svg.querySelectorAll(".bm-tract, .bm-cluster circle").forEach((n) => {
      n.style.animationPlayState = document.hidden ? "paused" : "running";
    });
  }
}

export default { render, mount };