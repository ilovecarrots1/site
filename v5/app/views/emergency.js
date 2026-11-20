/* ==========================================================================
   Red flags — the escalate-now list pulled straight from the condition
   corpus. Searchable, grouped, no triage advice beyond "get help".
   ========================================================================== */

import { esc, icon } from "../core.js";
import { CONDITIONS, CONDITION_CHAPTERS } from "../data/conditions.js";
import { COMPOUNDS } from "../data/compounds.js";
import { severityChip } from "./ui.js";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function buildIndex() {
  const flags = [];
  for (const c of CONDITIONS) {
    for (const f of c.redFlags || []) {
      const label = typeof f === "string" ? f : f && f.label ? f.label : String(f);
      if (!label || label === "[object Object]") continue;
      flags.push({ label, condition: c });
    }
  }
  flags.sort((a, b) => a.condition.name.localeCompare(b.condition.name) || a.label.localeCompare(b.label));
  return flags;
}

const FLAGS = buildIndex();

function flaggedCompounds() {
  const out = [];
  for (const c of COMPOUNDS) {
    const w = (c.warnings || []).filter(Boolean);
    const hard = w.filter((x) => /(never|do not|avoid|fatal|emergency|risk of death|serotonin syndrome|seizure|respiratory)/i.test(String(x)));
    if (hard.length) out.push({ compound: c, warnings: hard });
  }
  return out.sort((a, b) => a.compound.name.localeCompare(b.compound.name));
}

const COMPOUND_FLAGS = flaggedCompounds();

const BY_CHAPTER = CONDITION_CHAPTERS.map((ch) => ({
  chapter: ch.name,
  flags: FLAGS.filter((f) => f.condition.chapter === ch.name),
})).filter((x) => x.flags.length);

function listHtml(list) {
  if (!list.length) return `<div class="tiny dim">Nothing matched.</div>`;
  return `<div class="rf-list">
    ${list
      .map(
        (f) => `<a class="rf-row" href="#/conditions/${esc(f.condition.id)}" data-search="${esc(
          norm(f.label + " " + f.condition.name)
        )}">
          <span class="rf-flag">${icon("alert", 12)} ${esc(f.label)}</span>
          <span class="rf-where tiny dim">${esc(f.condition.name)}</span>
        </a>`
      )
      .join("")}
  </div>`;
}

export function render() {
  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Escalation</div>
        <h1 class="page-title">Red flags</h1>
        <div class="page-sub">${FLAGS.length} escalation signs across ${BY_CHAPTER.reduce((n, x) => n + x.flags.length, 0)} entries, plus the warnings on compound cards that mean stop and get help. This is a reading aid for the library, not a triage service.</div>
      </div>
      <span class="chip chip-xs chip-crit">${icon("alert", 12)} Emergency: local services</span>
    </div>

    <div class="callout" style="border-color:color-mix(in srgb, var(--bad) 40%, transparent)">
      <b>If someone is unresponsive, seizing, struggling to breathe, overheating, or you are worried about an overdose — call emergency services now.</b>
      Nothing on this page replaces that call, and no dose adjustment belongs in an emergency.
    </div>

    <div class="card tight" style="margin-top:14px">
      <label class="cd-search">${icon("search", 16)}
        <input id="rf-q" type="search" inputmode="search" autocomplete="off" placeholder="Filter red flags, e.g. seizure, suicidal, chest pain…" />
      </label>
    </div>

    <div id="rf-out">
      ${BY_CHAPTER.map(
        (g) => `<section class="block rf-group" data-chapter="${esc(g.chapter)}" style="margin-top:16px">
          <div class="block-head"><h2>${esc(g.chapter)}</h2><div class="block-sub">${g.flags.length} signs</div></div>
          ${listHtml(g.flags)}
        </section>`
      ).join("")}

      <section class="block" style="margin-top:20px">
        <div class="block-head"><h2>Compounds with hard warnings</h2><div class="block-sub">Card text that names a stop condition</div></div>
        <div class="rf-list">
          ${COMPOUND_FLAGS.slice(0, 40)
            .map(
              (x) => `<div class="rf-row rf-compound">
                <a class="rf-flag" href="#/compounds/${esc(x.compound.id)}">${icon("flask", 12)} ${esc(x.compound.name)}</a>
                <span class="rf-where tiny dim">${esc(x.warnings[0])}</span>
              </div>`
            )
            .join("") || `<div class="tiny dim">No hard warnings authored.</div>`}
        </div>
      </section>
    </div>

    <div class="callout" style="margin-top:16px">
      <b>Why this exists.</b> Every condition card already carries a red-flag list; collecting them in one searchable place means you can check a symptom against the corpus without opening twelve pages. It does not know your situation.
    </div>
  </div>`;
}

export function mount(root) {
  const input = root.querySelector("#rf-q");
  if (!input) return;
  let t = 0;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const term = norm(input.value);
      root.querySelectorAll(".rf-group").forEach((g) => {
        let shown = 0;
        g.querySelectorAll(".rf-row").forEach((r) => {
          const hay = r.getAttribute("data-search") || norm(r.textContent);
          const ok = !term || hay.includes(term);
          r.classList.toggle("hide", !ok);
          if (ok) shown++;
        });
        g.classList.toggle("hide", shown === 0);
      });
    }, 90);
  });
}

export default { render, mount };