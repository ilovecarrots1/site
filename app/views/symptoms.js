/* ==========================================================================
   Symptom finder — pick symptoms, get ranked conditions and the compounds
   known to cause them. Everything is derived from the condition corpus and
   the compound side-effect lists; no model, no guessing.
   ========================================================================== */

import { esc, icon, store } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYMPTOM_INDEX, SYMPTOM_COUNT, CONDITION_BY_ID, symptomsForCondition, CONDITION_COUNT } from "../data/conditions.js";
import { SYSTEM_BY_ID } from "../data/neuro.js";

const AXES = {
  psych: "Psychiatric",
  neuro: "Neurological",
  somatic: "Somatic",
};

const RE_PSYCH =
  /(mood|anxiet|anxious|panic|fear|worry|irritab|rage|guilt|shame|worthles|interest|pleasure|anhedon|suicid|hallucin|delusion|paranoi|obsess|compuls|euphori|grandios|libido|hypervigil|flashback|dissociat|deperson|self-esteem|hopeless|attention|concentrat|impuls|agitat|restless|social|avoid|hoard|tics?)/i;
const RE_NEURO =
  /(headache|migraine|seizure|convuls|tremor|tic\b|numb|tingl|dizz|vertigo|vision|blurr|gait|ataxia|balance|speech|aphas|word|coordinat|paralys|weakness|reflex|sensation|smell|hearing|tinnitus|conscious|syncop|cataplex|sleep|insomnia|somnolen|narcolep|nightmare|movement|rigid|bradykines|dyskines|restless leg|memory|confus|disorient|aphasia)/i;

function axisOf(label) {
  const s = String(label || "");
  if (RE_PSYCH.test(s)) return "psych";
  if (RE_NEURO.test(s)) return "neuro";
  return "somatic";
}

const SYM = new Map(SYMPTOM_INDEX.map((s) => [s.id, s]));
const BY_AXIS = { psych: 0, neuro: 0, somatic: 0 };
for (const s of SYMPTOM_INDEX) BY_AXIS[axisOf(s.label)]++;

/* ------------------------------------------------------------------ state */

function chosen() {
  if (!Array.isArray(store.data.symptomPick)) store.data.symptomPick = [];
  store.data.symptomPick = store.data.symptomPick.filter((id) => SYM.has(id));
  return store.data.symptomPick;
}

function conditionScore(c, picked) {
  if (!picked.length) return 0;
  const set = new Set(symptomsForCondition(c.id).map(normS));
  let n = 0;
  for (const id of picked) if (set.has(id)) n++;
  return n;
}

function normS(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ search */

function suggest(term, axis) {
  const q = normS(term);
  if (!q) return [];
  const out = [];
  for (const s of SYMPTOM_INDEX) {
    if (axis && axisOf(s.label) !== axis) continue;
    if (normS(s.label).includes(q)) {
      out.push(s);
      if (out.length >= 14) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ match */

function rankedConditions(picked) {
  const out = [];
  for (const c of CONDITION_BY_ID.values()) {
    const n = conditionScore(c, picked);
    if (!n) continue;
    out.push({ c, n, total: picked.length });
  }
  out.sort((a, b) => b.n - a.n || a.c.name.localeCompare(b.c.name));
  return out;
}

function compoundHits(picked) {
  if (!picked.length) return [];
  const labels = picked.map((id) => normS(SYM.get(id) ? SYM.get(id).label : "")).filter((l) => l.length >= 4);
  if (!labels.length) return [];
  const hits = [];
  for (const c of COMPOUNDS) {
    const bad = (c.effects && c.effects.bad) || [];
    if (!bad.length) continue;
    const text = normS(bad.join(" ; "));
    let n = 0;
    const why = [];
    for (const l of labels) {
      if (text.includes(l)) {
        n++;
        why.push(l);
      }
    }
    if (n) hits.push({ c, n, why });
  }
  hits.sort((a, b) => b.n - a.n || a.c.name.localeCompare(b.c.name));
  return hits;
}

/* ------------------------------------------------------------------ render */

function pickChip(id) {
  const s = SYM.get(id);
  if (!s) return "";
  return `<button type="button" class="chip chip-btn chip-accent" data-unpick="${esc(id)}">
    ${esc(s.label)} ${icon("x", 11)}
  </button>`;
}

function resultsHtml(picked) {
  if (!picked.length) {
    const top = SYMPTOM_INDEX.slice(0, 26);
    return `<div class="sy-hint">
        ${icon("search", 20)}
        <div>
          <b>Pick a symptom to start.</b>
          <div class="small dim" style="margin-top:4px">${SYMPTOM_COUNT} symptoms are indexed across ${CONDITION_COUNT} conditions. Add two or three and the list re-ranks by overlap.</div>
        </div>
      </div>
      <div class="block" style="margin-top:14px">
        <div class="block-head"><h2>Most shared</h2><div class="block-sub">Symptoms that appear in the most conditions</div></div>
        <div class="chip-row">
          ${top.map((s) => `<button type="button" class="chip chip-btn chip-xs" data-pick="${esc(s.id)}">${esc(s.label)} <span class="dim">${s.count}</span></button>`).join("")}
        </div>
      </div>`;
  }

  const rows = rankedConditions(picked);
  const hits = compoundHits(picked);

  return `${rows.length
      ? `<div class="sy-results">
          ${rows
            .slice(0, 24)
            .map(({ c, n, total }) => {
              const pct = Math.round((n / total) * 100);
              return `<a class="sy-row" href="#/conditions/${esc(c.id)}">
                <div class="sy-row-main">
                  <span class="sy-row-name">${esc(c.name)}</span>
                  <span class="tiny dim">${esc(c.chapter)} · ${(c.systems || []).map((s) => (SYSTEM_BY_ID.get(s) ? SYSTEM_BY_ID.get(s).name : s)).slice(0, 3).join(", ")}</span>
                </div>
                <div class="sy-row-meter" aria-hidden="true"><i style="width:${pct}%"></i></div>
                <span class="sy-row-n mono">${n}/${total}</span>
              </a>`;
            })
            .join("")}
        </div>`
      : `<div class="sy-hint">${icon("alert", 20)}<div><b>No condition in the corpus lists that combination.</b>
          <div class="small dim" style="margin-top:4px">Try fewer or broader symptoms.</div></div></div>`}

    <div class="block" style="margin-top:16px">
      <div class="block-head"><h2>Compounds that list it</h2><div class="block-sub">From the side-effect lists, matched on wording</div></div>
      ${hits.length
        ? `<div class="chip-row">
            ${hits
              .slice(0, 30)
              .map(
                (h) =>
                  `<a class="chip chip-btn chip-xs ${h.n > 1 ? "chip-warn" : ""}" href="#/compounds/${esc(h.c.id)}">${esc(h.c.name)}${
                    h.n > 1 ? ` ×${h.n}` : ""
                  }</a>`
              )
              .join("")}
          </div>`
        : `<div class="tiny dim">No compound side-effect entry matches this wording.</div>`}
    </div>`;
}

export function render(ctx) {
  const picked = chosen();
  const q = (ctx && ctx.query) || {};
  if (q.s) {
    const list = String(q.s)
      .split(",")
      .map((x) => normS(x))
      .filter((id) => SYM.has(id));
    if (list.length) {
      store.data.symptomPick = list.slice(0, 6);
      store.save();
    }
  }
  const axis = q.axis && AXES[q.axis] ? String(q.axis) : "";

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Differential</div>
        <h1 class="page-title">Symptom finder</h1>
        <div class="page-sub">${SYMPTOM_COUNT} indexed symptoms · ${CONDITION_COUNT} conditions. Pick what you actually feel and see which conditions and which compounds share that wording.</div>
      </div>
      <div class="chip-row">
        <button type="button" class="chip chip-btn ${axis ? "" : "on"}" data-axis="">All</button>
        ${Object.entries(AXES)
          .map(([k, label]) => `<button type="button" class="chip chip-btn ${axis === k ? "on" : ""}" data-axis="${k}">${esc(label)} <span class="dim">${BY_AXIS[k]}</span></button>`)
          .join("")}
      </div>
    </div>

    <div class="card tight sy-tools">
      <label class="cd-search">${icon("search", 16)}
        <input id="sy-q" type="search" inputmode="search" autocomplete="off" placeholder="Symptom, e.g. insomnia, anhedonia, tremor…" />
      </label>
      <div id="sy-suggest" class="sy-suggest"></div>
      <div id="sy-picked" class="chip-row" style="margin-top:8px">${picked.map(pickChip).join("")}</div>
    </div>

    <div id="sy-out">${resultsHtml(picked)}</div>

    <div class="callout" style="margin-top:16px">
      <b>Wording, not diagnosis.</b> This matches the symptom strings authored in the condition corpus and the side-effect lists on compound cards. It knows nothing about your history, timing or severity, so treat the ranking as a reading of this library, not a differential you can act on alone.
    </div>
  </div>`;
}

export function mount(root, ctx) {
  const input = root.querySelector("#sy-q");
  const sug = root.querySelector("#sy-suggest");
  const pickedEl = root.querySelector("#sy-picked");
  const out = root.querySelector("#sy-out");
  let axis = (ctx && ctx.query && ctx.query.axis) || "";

  const paint = () => {
    const picked = chosen();
    if (pickedEl) pickedEl.innerHTML = picked.map(pickChip).join("");
    if (out) out.innerHTML = resultsHtml(picked);
    bind();
  };

  function bind() {
    root.querySelectorAll("[data-unpick]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-unpick");
        const list = chosen();
        const i = list.indexOf(id);
        if (i >= 0) list.splice(i, 1);
        store.save();
        paint();
      })
    );
    root.querySelectorAll("[data-pick]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-pick");
        const list = chosen();
        if (list.includes(id)) return;
        if (list.length >= 6) list.shift();
        list.push(id);
        store.save();
        if (sug) sug.innerHTML = "";
        if (input) input.value = "";
        history.replaceState(null, "", `#/symptoms`);
        paint();
      })
    );
  }

  let t = 0;
  if (input)
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!sug) return;
        const list = suggest(input.value, axis);
        if (!input.value.trim()) {
          sug.innerHTML = "";
          return;
        }
        sug.innerHTML = list.length
          ? list
              .map(
                (s) => `<button type="button" class="stk-hit" data-pick="${esc(s.id)}">
                  <span class="stk-hit-name">${esc(s.label)}</span>
                  <span class="tiny dim">${s.count} cond.</span>
                  ${icon("plus", 13)}
                </button>`
              )
              .join("")
          : `<div class="tiny dim" style="padding:6px 2px">Nothing matched. Try a shorter word.</div>`;
        sug.querySelectorAll("[data-pick]").forEach((b) =>
          b.addEventListener("click", () => {
            const id = b.getAttribute("data-pick");
            const list2 = chosen();
            if (!list2.includes(id)) {
              if (list2.length >= 6) list2.shift();
              list2.push(id);
              store.save();
            }
            sug.innerHTML = "";
            if (input) input.value = "";
            paint();
          })
        );
      }, 90);
    });

  root.querySelectorAll("[data-axis]").forEach((b) =>
    b.addEventListener("click", () => {
      axis = b.getAttribute("data-axis") || "";
      root.querySelectorAll("[data-axis]").forEach((x) => x.classList.toggle("on", x === b));
      if (input && input.value.trim()) input.dispatchEvent(new Event("input"));
    })
  );

  bind();
}

export default { render, mount };