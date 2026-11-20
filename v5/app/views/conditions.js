/* ==========================================================================
   Conditions view — ICD-9 / ICD-10 / ICD-11 reference with a
   diagnosis → subtype → symptoms → causes hub.
   ========================================================================== */

import { esc, icon, copyText, toast } from "../core.js";
import { COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "../data/neuro.js";
import {
  CONDITIONS,
  CONDITION_BY_ID,
  CONDITION_CHAPTERS,
  CONDITION_STATS,
  SYMPTOM_INDEX,
  symptomsForCondition,
  validCompounds,
} from "../data/conditions.js";

/* ------------------------------------------------------------------ bits */

function codeChip(label, codes, blurb) {
  if (!codes || !codes.length) {
    return `<span class="cd-code" title="${esc(blurb || "")}"><b>${esc(label)}</b><span class="dim">—</span></span>`;
  }
  return `<span class="cd-code" title="${esc(blurb || "")}"><b>${esc(label)}</b><span>${codes
    .map((c) => esc(c))
    .join(" · ")}</span><button type="button" class="cd-copy" data-copy="${esc(codes.join(", "))}" aria-label="Copy ${esc(
    label
  )} code">${icon("copy", 12)}</button></span>`;
}

function systemChips(ids) {
  return (ids || [])
    .map((id) => {
      const s = SYSTEM_BY_ID.get(id);
      if (!s) return "";
      return `<a class="chip chip-xs" href="#/brain/${esc(s.id)}"><span class="dot" style="background:${esc(
        s.color
      )}"></span>${esc(s.name)}</a>`;
    })
    .join("");
}

function compoundChips(c) {
  const ids = validCompounds(c);
  if (!ids.length) return `<span class="tiny dim">No compounds mapped yet.</span>`;
  return ids
    .map((id) => {
      const x = COMPOUND_BY_ID.get(id);
      return `<a class="chip chip-btn chip-xs" href="#/compounds/${esc(x.id)}">${esc(x.name)}</a>`;
    })
    .join("");
}

function symptomLinks(list, limit) {
  const items = (list || []).slice(0, limit || 30);
  return items
    .map(
      (s) =>
        `<a class="chip chip-xs" href="#/symptoms?s=${encodeURIComponent(String(s).toLowerCase())}">${esc(s)}</a>`
    )
    .join("");
}

/* ------------------------------------------------------------------ index */

function row(c) {
  const top = (c.symptoms || []).slice(0, 4).join(" · ");
  return `<a class="cd-row" href="#/conditions/${esc(c.id)}" data-search="${esc(
    [c.name, (c.aka || []).join(" "), c.chapter, (c.icd10 || []).join(" "), (c.icd11 || []).join(" "), (c.symptoms || []).join(" ")].join(" ")
  ).toLowerCase()}">
      <span class="cd-row-main">
        <span class="cd-row-name">${esc(c.name)}</span>
        <span class="cd-row-sub">${esc(top)}</span>
      </span>
      <span class="cd-row-codes">
        ${(c.icd10 || []).slice(0, 1).map((x) => `<span class="cd-mini">${esc(x)}</span>`).join("")}
        ${(c.icd11 || []).slice(0, 1).map((x) => `<span class="cd-mini cd-mini-11">${esc(x)}</span>`).join("")}
        ${(c.legacy || []).length ? `<span class="cd-mini cd-mini-legacy" title="Legacy codes">L</span>` : ""}
      </span>
    </a>`;
}

function indexHtml(ctx) {
  const q = (ctx && ctx.query) || {};
  const chapter = q.chapter ? String(q.chapter) : "";

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Clinical reference</div>
        <h1 class="page-title">Conditions</h1>
        <div class="page-sub">${CONDITION_STATS.conditions} diagnoses · ${CONDITION_STATS.subtypes} subtypes · ${CONDITION_STATS.symptoms} distinct symptoms. ICD-9, ICD-10 and ICD-11 codes side by side, legacy codes kept where nothing replaced them.</div>
      </div>
      <div class="row wrap" style="gap:6px">
        <a class="btn soft sm" href="#/symptoms">${icon("search", 14)} Symptom finder</a>
      </div>
    </div>

    <div class="card tight cd-tools">
      <label class="cd-search">${icon("search", 16)}
        <input id="cd-q" type="search" inputmode="search" autocomplete="off" placeholder="Name, alias, symptom or ICD code…" />
      </label>
      <div class="chip-row" id="cd-chapters">
        <button type="button" class="chip chip-btn ${chapter ? "" : "on"}" data-chapter="">All</button>
        ${CONDITION_CHAPTERS.map(
          (ch) =>
            `<button type="button" class="chip chip-btn ${chapter === ch.name ? "on" : ""}" data-chapter="${esc(
              ch.name
            )}">${esc(ch.name)} <span class="dim">${ch.items.length}</span></button>`
        ).join("")}
      </div>
      <div class="tiny dim" id="cd-count">${CONDITIONS.length} shown</div>
    </div>

    <div id="cd-list">
      ${CONDITION_CHAPTERS.map(
        (ch) => `<section class="cd-chapter" data-chapter-block="${esc(ch.name)}">
          <div class="cd-chapter-head">
            <h2>${esc(ch.name)}</h2>
            <span class="tiny dim">${esc(ch.note)}</span>
          </div>
          <div class="cd-rows">${ch.items.map(row).join("")}</div>
        </section>`
      ).join("")}
    </div>

    <div class="cd-empty hide" id="cd-empty">Nothing matched. Try a symptom word like “tremor” or a code like “F31”.</div>
  </div>`;
}

export function render(ctx) {
  const id = ctx && ctx.params && ctx.params.id;
  if (id) return detail(String(id));
  return indexHtml(ctx);
}

export function mount(root, ctx) {
  const id = ctx && ctx.params && ctx.params.id;
  if (id) return mountDetail(root, ctx);

  const q = root.querySelector("#cd-q");
  const count = root.querySelector("#cd-count");
  const empty = root.querySelector("#cd-empty");
  let chapter = ((ctx && ctx.query && ctx.query.chapter) || "").toString();

  function apply() {
    const term = (q && q.value || "").trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll(".cd-chapter").forEach((block) => {
      const name = block.getAttribute("data-chapter-block");
      const inChapter = !chapter || chapter === name;
      let blockShown = 0;
      block.querySelectorAll(".cd-row").forEach((r) => {
        const hay = r.getAttribute("data-search") || "";
        const ok = inChapter && (!term || hay.includes(term));
        r.classList.toggle("hide", !ok);
        if (ok) blockShown++;
      });
      block.classList.toggle("hide", blockShown === 0);
      shown += blockShown;
    });
    if (count) count.textContent = `${shown} shown`;
    if (empty) empty.classList.toggle("hide", shown > 0);
  }

  if (q) {
    let t = 0;
    q.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(apply, 90);
    });
  }

  root.querySelectorAll("[data-chapter]").forEach((b) =>
    b.addEventListener("click", () => {
      chapter = b.getAttribute("data-chapter") || "";
      root.querySelectorAll("[data-chapter]").forEach((x) => x.classList.toggle("on", x === b));
      const url = chapter ? `#/conditions?chapter=${encodeURIComponent(chapter)}` : "#/conditions";
      history.replaceState(null, "", url);
      apply();
    })
  );

  apply();
}

/* ----------------------------------------------------------------- detail */

function relatedBySymptoms(c) {
  const mine = new Set(symptomsForCondition(c.id).map((s) => String(s).toLowerCase()));
  const scored = CONDITIONS.filter((x) => x.id !== c.id)
    .map((x) => {
      const theirs = symptomsForCondition(x.id).map((s) => String(s).toLowerCase());
      const shared = theirs.filter((s) => mine.has(s));
      return { x, shared: shared.length };
    })
    .filter((s) => s.shared >= 2)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 5);
  return scored;
}

function detail(id) {
  const c = CONDITION_BY_ID.get(id);
  if (!c) {
    return `<div class="page-head"><div class="eyebrow">404</div><h1>No such condition</h1>
      <p>“${esc(id)}” is not in the condition index.</p></div>
      <a class="btn primary" href="#/conditions">Back to conditions</a>`;
  }

  const symptoms = symptomsForCondition(c.id);
  const related = relatedBySymptoms(c);

  return `<div class="page">
    <a class="back-link" href="#/conditions">${icon("arrowLeft", 14)} All conditions</a>

    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">${esc(c.chapter)}</div>
        <h1 class="page-title">${esc(c.name)}</h1>
        <div class="page-sub">${(c.aka || []).length ? "Also: " + esc((c.aka || []).join(" · ")) : ""}</div>
      </div>
      <div class="cd-codes">
        ${codeChip("ICD-9", c.icd9, "ICD-9-CM clinical modification")}
        ${codeChip("ICD-10", c.icd10, "ICD-10 / ICD-10-CM")}
        ${codeChip("ICD-11", c.icd11, "ICD-11 MMS linearisation")}
      </div>
    </div>

    <div class="cd-meta">
      <div class="cd-meta-cell"><div class="tiny dim">Onset</div><div class="small">${esc(c.onset || "—")}</div></div>
      <div class="cd-meta-cell"><div class="tiny dim">Course</div><div class="small">${esc(c.course || "—")}</div></div>
      <div class="cd-meta-cell"><div class="tiny dim">Systems</div><div class="small">${systemChips(c.systems) || "—"}</div></div>
    </div>

    ${(c.legacy || []).length
      ? `<div class="callout cd-legacy">
          <div class="tiny" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Legacy codes</div>
          ${c.legacy
            .map(
              (l) =>
                `<div class="cd-legacy-row"><span class="mono small">${esc(l.code)}</span><span class="small">${esc(
                  l.label
                )}</span><span class="tiny dim">${esc(l.note || "")}</span></div>`
            )
            .join("")}
        </div>`
      : ""}

    <div class="cd-hub">
      <div class="cd-hub-core">
        <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase">Diagnosis</div>
        <div class="cd-hub-name">${esc(c.name)}</div>
        <div class="tiny dim">${(c.subtypes || []).length} subtypes · ${symptoms.length} symptoms · ${validCompounds(c).length} compounds</div>
      </div>

      <div class="cd-branch">
        <h3>${icon("layers", 14)} Subtypes</h3>
        ${(c.subtypes || [])
          .map(
            (st) => `<div class="cd-sub">
              <div class="cd-sub-head">
                <span class="cd-sub-name">${esc(st.name)}</span>
                <span class="cd-sub-codes mono tiny">${[st.icd10, st.icd11].filter(Boolean).map(esc).join(" · ")}</span>
              </div>
              <div class="cd-sub-body">
                <div><span class="tiny dim">Symptoms</span><div class="cd-mini-row">${(st.symptoms || [])
                  .map((s) => `<span class="chip chip-xs">${esc(s)}</span>`)
                  .join("")}</div></div>
                <div><span class="tiny dim">Causes</span><div class="cd-mini-row">${(st.causes || [])
                  .map((s) => `<span class="chip chip-xs chip-ghost">${esc(s)}</span>`)
                  .join("")}</div></div>
              </div>
            </div>`
          )
          .join("") || `<div class="tiny dim">No subtypes coded.</div>`}
      </div>

      <div class="cd-branch">
        <h3>${icon("activity", 14)} Symptoms</h3>
        <div class="cd-mini-row">${symptomLinks(symptoms, 40)}</div>
      </div>

      <div class="cd-branch">
        <h3>${icon("zap", 14)} Causes</h3>
        <div class="cd-mini-row">${(c.causes || []).map((s) => `<span class="chip chip-xs">${esc(s)}</span>`).join("")}</div>
        ${(c.risk || []).length
          ? `<div style="margin-top:10px"><span class="tiny dim">Risk factors</span><div class="cd-mini-row">${(c.risk || [])
              .map((s) => `<span class="chip chip-xs chip-ghost">${esc(s)}</span>`)
              .join("")}</div></div>`
          : ""}
      </div>

      <div class="cd-branch">
        <h3>${icon("pill", 14)} Compounds used here</h3>
        <div class="cd-mini-row">${compoundChips(c)}</div>
        <div class="tiny dim" style="margin-top:10px;line-height:1.5">Reference list of agents studied or used in this condition. Nothing here is a dosing recommendation.</div>
      </div>
    </div>

    ${(c.redFlags || []).length
      ? `<div class="callout cd-red">
          <div class="tiny" style="letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px">Red flags</div>
          <ul class="clean">${c.redFlags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </div>`
      : ""}

    ${related.length
      ? `<div class="block">
          <div class="block-head"><h2>Overlapping conditions</h2><div class="block-sub">Sharing at least two symptoms</div></div>
          <div class="card">
            ${related
              .map(
                (r) => `<a class="list-row" href="#/conditions/${esc(r.x.id)}">
                  <span>${esc(r.x.name)}</span>
                  <span class="tiny dim">${r.shared} shared</span>
                </a>`
              )
              .join("")}
          </div>
        </div>`
      : ""}

    <div class="callout">
      <b>Education only.</b> Codes drift between revisions and national modifications; always verify against the current ICD edition in force where you practise.
    </div>
  </div>`;
}

function mountDetail(root) {
  root.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = b.getAttribute("data-copy") || "";
      copyText(v).then(
        () => toast("Copied " + v),
        () => toast("Copy failed")
      );
    })
  );
}

export default { render, mount };