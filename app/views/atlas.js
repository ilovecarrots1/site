/* Biochemical atlas — pathways, enzymes and molecular targets.
 * Pathway cards → pathway detail (step by step cascade) → compound cross-links.
 */

import { esc, icon, emptyState, copyText, toast } from "../core.js";
import {
  PATHWAYS,
  PATHWAY_BY_ID,
  TARGETS,
  TARGET_BY_ID,
  ATLAS_GROUPS,
  TARGET_KINDS,
  pathwaysForSystem,
  pathwaysForCompound,
  targetsForCompound,
} from "../data/atlas.js";
import { SYSTEM_BY_ID, SYSTEMS } from "../data/neuro.js";
import { COMPOUND_BY_ID } from "../data/compounds.js";
import { ORGAN_BY_ID } from "../data/organs.js";
import { pageHead, backLink, chipRow, callout, mechFlow, liveBadge } from "./ui.js";

const KIND_ICON = {
  GPCR: "target",
  "Ion channel": "zap",
  Enzyme: "atom",
  Transporter: "repeat",
  "Nuclear receptor": "dna",
  Kinase: "activity",
  Other: "circle",
};

function systemDots(ids) {
  return `<span class="row" style="gap:4px">${(ids || [])
    .map((id) => {
      const s = SYSTEM_BY_ID.get(id);
      if (!s) return "";
      return `<span class="dot" title="${esc(s.name)}" style="background:${s.color};box-shadow:0 0 8px ${s.color}66"></span>`;
    })
    .join("")}</span>`;
}

function systemChips(ids) {
  return (ids || [])
    .map((id) => {
      const s = SYSTEM_BY_ID.get(id);
      if (!s) return "";
      return `<a class="chip chip-btn" href="#/brain/${esc(id)}" style="border-color:${s.color}55"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</a>`;
    })
    .join("");
}

function organChips(ids) {
  return (ids || [])
    .map((id) => {
      const o = ORGAN_BY_ID.get(id);
      if (!o) return "";
      return `<a class="chip chip-btn" href="#/organs/${esc(id)}">${icon("activity", 12)} ${esc(o.name)}</a>`;
    })
    .join("");
}

function compoundChips(ids, { limit = 0 } = {}) {
  const list = (ids || []).filter((id) => COMPOUND_BY_ID.get(id));
  const shown = limit ? list.slice(0, limit) : list;
  const rest = list.length - shown.length;
  return (
    shown
      .map((id) => {
        const c = COMPOUND_BY_ID.get(id);
        return `<a class="chip chip-btn chip-accent" href="#/compounds/${esc(id)}">${esc(c.name)}</a>`;
      })
      .join("") + (rest > 0 ? `<span class="chip chip-xs dim">+${rest}</span>` : "")
  );
}

function pubmedLink(query, label = "Live literature") {
  return `<a class="btn ghost sm" href="#/research?q=${encodeURIComponent(query)}">${icon("microscope", 14)} ${esc(label)}</a>`;
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

function pathwayCard(p) {
  const stepCount = (p.steps || []).length;
  const drugCount = new Set((p.steps || []).flatMap((s) => s.drugs || [])).size;
  return `<a class="card hoverable path-card" href="#/atlas/${esc(p.id)}" data-group="${esc(p.group)}" style="display:block">
    <div class="row between" style="align-items:flex-start;gap:10px">
      <div style="min-width:0">
        <div class="eyebrow">${esc(p.group)}</div>
        <h3 class="pc-title">${esc(p.name)}</h3>
      </div>
      ${systemDots(p.systems)}
    </div>
    <p class="pc-sum">${esc(p.summary)}</p>
    <div class="pc-foot">
      <span class="chip chip-xs">${icon("activity", 11)} ${stepCount} steps</span>
      <span class="chip chip-xs">${icon("pill", 11)} ${drugCount} linked</span>
      ${p.rateLimiting && p.rateLimiting !== "—" ? `<span class="chip chip-xs pc-enzyme" title="Rate limiting">${esc(p.rateLimiting.split(" (")[0])}</span>` : ""}
    </div>
  </a>`;
}

export function index(ctx) {
  const group = ctx.query.group || "";
  const totalSteps = PATHWAYS.reduce((n, p) => n + (p.steps || []).length, 0);
  const linked = new Set(PATHWAYS.flatMap((p) => (p.steps || []).flatMap((s) => s.drugs || [])));

  return `${pageHead(
    "Biochemical atlas",
    "Twenty real pathways, step by step — the enzymes, cofactors and rate-limiting reactions that every compound in this library ultimately touches.",
    `<a class="btn soft sm" href="#/organs">${icon("activity", 15)} Organ map</a>`,
    "Atlas"
  )}
  <div class="split split-mobile-first">
    <div class="stack">
      <div class="grid-auto" style="gap:8px">
        <div class="card tight"><div class="stat-label">Pathways</div><div class="stat-value">${PATHWAYS.length}</div></div>
        <div class="card tight"><div class="stat-label">Enzymatic steps</div><div class="stat-value">${totalSteps}</div></div>
        <div class="card tight"><div class="stat-label">Targets</div><div class="stat-value">${TARGETS.length}</div></div>
        <div class="card tight"><div class="stat-label">Linked compounds</div><div class="stat-value">${linked.size}</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Filter by family</h3></div>
        ${chipRow(ATLAS_GROUPS, group, "group", { allLabel: "All pathways" })}
      </div>

      <div id="path-grid" class="grid-2 atlas-grid">
        ${PATHWAYS.map(pathwayCard).join("")}
      </div>
      <p class="tiny dim hide" id="path-empty">No pathways in this family.</p>
    </div>

    <aside class="stack sticky-side">
      ${callout(
        "info",
        "How to read this",
        "Each pathway is a chain of actual enzymatic events. The rate-limiting step sets overall flux, so it is normally where drugs act. Cofactors matter too: a pathway can stall on a vitamin deficiency with no drug involved at all."
      )}
      <section class="card">
        <div class="card-head"><h3>Molecular targets</h3><span class="spacer"></span><span class="tiny dim">${TARGETS.length}</span></div>
        <div class="target-list">
          ${TARGETS.map((t) => {
            const k = KIND_ICON[t.kind] || "circle";
            return `<a class="target-row" href="#/atlas/target/${esc(t.id)}">
              <span class="tr-ic">${icon(k, 14)}</span>
              <span class="tr-body"><span class="tr-name">${esc(t.name)}</span><span class="tr-meta">${esc(t.kind)}${t.gene ? ` · ${esc(t.gene)}` : ""}</span></span>
              ${icon("chevronRight", 14)}
            </a>`;
          }).join("")}
        </div>
      </section>
      <section class="card">
        <div class="card-head"><h3>Neurotransmitter systems</h3></div>
        <div class="row wrap" style="gap:6px">
          ${SYSTEMS.map((s) => `<a class="chip chip-btn" href="#/brain/${esc(s.id)}"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</a>`).join("")}
        </div>
      </section>
    </aside>
  </div>`;
}

export function mountIndex(root) {
  root.addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-group]");
    if (!chip || !chip.classList.contains("chip-btn")) return;
    const val = chip.dataset.group || "";
    root.querySelectorAll("[data-group].chip-btn").forEach((el) => el.classList.toggle("on", (el.dataset.group || "") === val));
    let shown = 0;
    root.querySelectorAll("#path-grid [data-group]").forEach((card) => {
      const ok = !val || card.dataset.group === val;
      card.classList.toggle("hide", !ok);
      if (ok) shown += 1;
    });
    const empty = root.querySelector("#path-empty");
    if (empty) empty.classList.toggle("hide", shown > 0);
  });
}

/* ------------------------------------------------------------------ */
/* Pathway detail                                                      */
/* ------------------------------------------------------------------ */

function stepCard(s, i) {
  return `<div class="card step-card">
    <div class="row between" style="align-items:flex-start;gap:10px">
      <div class="row" style="gap:9px;align-items:flex-start;min-width:0">
        <span class="step-num">${i + 1}</span>
        <div style="min-width:0">
          <div class="step-label">${esc(s.label)}</div>
          <div class="step-enzyme">${esc(s.enzyme || "—")}</div>
        </div>
      </div>
      ${s.cofactor && s.cofactor !== "—" ? `<span class="chip chip-xs step-cof" title="Cofactors">${esc(s.cofactor)}</span>` : ""}
    </div>
    <p class="step-detail">${esc(s.detail)}</p>
    ${(s.drugs || []).length ? `<div class="row wrap" style="gap:6px;margin-top:9px">${compoundChips(s.drugs)}</div>` : ""}
  </div>`;
}

export function pathway(ctx) {
  const p = PATHWAY_BY_ID.get(String(ctx.params.id || "").toLowerCase());
  if (!p) {
    return `${pageHead("Pathway not found", "", backLink("#/atlas", "Atlas"))}
      ${emptyState("atom", "No such pathway", "That pathway is not in the atlas. Browse the full list instead.", '<a class="btn soft sm" href="#/atlas">Open atlas</a>')}`;
  }

  const drugIds = Array.from(new Set((p.steps || []).flatMap((s) => s.drugs || []))).filter((id) => COMPOUND_BY_ID.get(id));
  const related = (p.links || []).map((l) => ({ ...l, p: PATHWAY_BY_ID.get(l.id) })).filter((x) => x.p);

  return `${pageHead(
    p.name,
    esc(p.summary),
    `<button class="btn ghost sm" data-copy="${esc(p.pubmed || p.name)}">${icon("quote", 14)} Copy query</button>`,
    p.group
  )}
  <div class="split split-mobile-first">
    <div class="stack">
      <div class="card">
        <div class="row wrap" style="gap:8px;margin-bottom:2px">
          ${p.rateLimiting && p.rateLimiting !== "—" ? `<span class="chip chip-accent">${icon("sliders", 12)} Rate limiting: ${esc(p.rateLimiting)}</span>` : ""}
          <span class="chip">${icon("globe", 12)} ${esc(p.location)}</span>
        </div>
        <div class="row wrap" style="gap:6px;margin-top:10px">
          ${systemChips(p.systems)}
          ${organChips(p.organs)}
        </div>
      </div>

      <section class="card">
        <div class="card-head"><h3>Flow</h3><span class="spacer"></span><span class="tiny dim">${(p.steps || []).length} steps</span></div>
        ${mechFlow(
          (p.steps || []).map((s) => ({ title: s.label, sub: s.enzyme || "", icon: "activity" }))
        )}
      </section>

      <div class="stack" style="gap:10px">
        ${(p.steps || []).map(stepCard).join("")}
      </div>

      <div class="row wrap" style="gap:8px">${pubmedLink(p.pubmed || p.name, "PubMed for this pathway")}</div>

      ${(() => {
        const extra = Array.from(new Set((p.steps || []).flatMap((s) => s.drugs || [])))
          .filter((id) => COMPOUND_BY_ID.get(id))
          .flatMap((id) => targetsForCompound(id).map((t) => t.id));
        const uniq = Array.from(new Set(extra)).slice(0, 8);
        if (!uniq.length) return "";
        return `<section class="card">
          <div class="card-head"><h3>Targets these compounds touch</h3></div>
          <div class="row wrap" style="gap:6px">${uniq
            .map((id) => {
              const t = TARGET_BY_ID.get(id);
              return `<a class="chip chip-btn" href="#/atlas/target/${esc(id)}">${icon(KIND_ICON[t.kind] || "target", 12)} ${esc(t.name)}</a>`;
            })
            .join("")}</div>
        </section>`;
      })()}
    </div>

    <aside class="stack sticky-side">
      <section class="card">
        <div class="card-head"><h3>Compounds on this pathway</h3><span class="spacer"></span><span class="live-dot"></span></div>
        ${drugIds.length ? `<div class="row wrap" style="gap:6px">${compoundChips(drugIds)}</div>` : `<p class="small dim">No compound in the library acts directly on this chain.</p>`}
      </section>
      ${related.length ? `<section class="card">
        <div class="card-head"><h3>Connected pathways</h3></div>
        <div class="stack" style="gap:8px">
          ${related
            .map(
              (r) => `<a class="ghost-link" href="#/atlas/${esc(r.id)}">
                <div class="gl-t">${esc(r.p.name)}</div>
                <div class="gl-s">${esc(r.note || "")}</div>
              </a>`
            )
            .join("")}
        </div>
      </section>` : ""}
      <section class="card tight">
        <p class="small dim" style="line-height:1.6">Reference point for study, not a dosing guide. Enzymatic detail here describes normal physiology — individual variation in enzyme activity can be several-fold.</p>
      </section>
    </aside>
  </div>`;
}

export function mountPathway(root) {
  root.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-copy]");
    if (!btn) return;
    const ok = await copyText(btn.dataset.copy);
    toast(ok ? "Query copied" : "Copy failed", ok ? "ok" : "danger");
  });
}

/* ------------------------------------------------------------------ */
/* Target detail                                                       */
/* ------------------------------------------------------------------ */

export function target(ctx) {
  const t = TARGET_BY_ID.get(String(ctx.params.id || "").toLowerCase());
  if (!t) {
    return `${pageHead("Target not found", "", backLink("#/atlas", "Atlas"))}
      ${emptyState("target", "No such target", "That receptor or enzyme is not in the atlas.", '<a class="btn soft sm" href="#/atlas">Open atlas</a>')}`;
  }
  const comps = (t.compounds || []).filter((id) => COMPOUND_BY_ID.get(id));
  const paths = comps.flatMap((id) => pathwaysForCompound(id)).filter((p, i, a) => a.indexOf(p) === i).slice(0, 6);

  return `${pageHead(t.name, esc(t.function), pubmedLink(t.pubmed || t.name, "Live papers"), t.kind)}
  <div class="split split-mobile-first">
    <div class="stack">
      <div class="card">
        <div class="row wrap" style="gap:8px">
          <span class="chip chip-accent">${icon(KIND_ICON[t.kind] || "target", 12)} ${esc(t.kind)}</span>
          ${t.gene ? `<span class="chip mono">${esc(t.gene)}</span>` : ""}
          <span class="chip">${icon("globe", 12)} ${esc(t.location)}</span>
        </div>
        <div class="row wrap" style="gap:6px;margin-top:10px">${systemChips(t.systems)}</div>
      </div>

      <section class="card">
        <div class="card-head"><h3>Compounds acting here</h3></div>
        ${
          comps.length
            ? `<div class="row wrap" style="gap:6px">${compoundChips(comps)}</div>`
            : `<p class="small dim">No compound page in the library lists this target yet.</p>`
        }
      </section>

      ${
        (t.drugClasses || []).length
          ? `<section class="card">
              <div class="card-head"><h3>Drug classes (clinical context)</h3></div>
              <ul class="clean">${t.drugClasses.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
            </section>`
          : ""
      }

      ${
        paths.length
          ? `<section class="card">
              <div class="card-head"><h3>Pathways involved</h3></div>
              <div class="stack" style="gap:8px">${paths
                .map(
                  (p) => `<a class="ghost-link" href="#/atlas/${esc(p.id)}">
                    <div class="gl-t">${esc(p.name)}</div>
                    <div class="gl-s">${esc(p.group)}</div>
                  </a>`
                )
                .join("")}</div>
            </section>`
          : ""
      }
    </div>
    <aside class="stack sticky-side">
      ${callout("info", "Why this matters", esc(t.note || ""))}
      <section class="card tight">
        <p class="small dim" style="line-height:1.6">Receptor names describe families, not single proteins. Subtype selectivity is usually partial, which is why side effects cross over between drug classes.</p>
      </section>
    </aside>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Exports used by the router                                          */
/* ------------------------------------------------------------------ */

export function mount(root, ctx) {
  if (!ctx.params || !ctx.params.id) mountIndex(root);
  else mountPathway(root);
}

export { pathwaysForSystem, targetsForCompound };
export default { render: index, mount };