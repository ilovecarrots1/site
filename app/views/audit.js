/* ==========================================================================
   Dev audit — data integrity checks that run against the shipped corpus.
   Not a test suite: a mirror for the facts that break silently at render.
   ========================================================================== */

import { esc, icon } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { CONDITIONS, CONDITION_STATS, validCompounds, SYMPTOM_INDEX } from "../data/conditions.js";
import { MARKERS, MARKER_STATS } from "../data/bloodwork.js";
import { PAIR_RULES, FLAG_RULES, EXTRA_SUBSTANCES } from "../data/interactions.js";
import { VERSION } from "../core.js";
import { REGIONS, TARGETS } from "../data/brainmap.js";

const ICD10 = /^[A-Z]\d{2}(\.\d+)?$/;
// ICD-11 stems start with a numeric chapter (6A70) or a letter chapter (MG30, NA07).
const ICD11 = /^(?:[1-9]\d?|[A-Z])[A-Z]\d{2}(\.\w+)?$/;
const ICD9 = /^\d{3}(\.\d+)?$/;

function splitCodes(list) {
  return (list || []).flatMap((c) => String(c).split("/").map((x) => x.trim())).filter(Boolean);
}

function check(name, ok, detail, severity = "fail") {
  return { name, ok, detail, severity };
}

function run() {
  const out = [];
  const dupIds = (() => {
    const seen = new Set();
    const dup = [];
    for (const c of COMPOUNDS) {
      const k = String(c.id).toLowerCase();
      if (seen.has(k)) dup.push(k);
      seen.add(k);
    }
    return dup;
  })();

  out.push(check("Compound ids unique", dupIds.length === 0, dupIds.join(", ") || `${COMPOUNDS.length} compounds`));

  const badConditionCompounds = [];
  for (const c of CONDITIONS) {
    for (const id of c.compounds || []) {
      if (!COMPOUND_BY_ID.has(id)) badConditionCompounds.push(`${c.id} → ${id}`);
    }
  }
  out.push(
    check(
      "Condition → compound links resolve",
      badConditionCompounds.length === 0,
      badConditionCompounds.length ? badConditionCompounds.slice(0, 12).join(", ") + (badConditionCompounds.length > 12 ? ` (+${badConditionCompounds.length - 12})` : "") : `${CONDITION_STATS.conditions} conditions clean`,
      "warn"
    )
  );

  const badMarkerLinks = [];
  for (const m of MARKERS) {
    for (const id of m.compounds || []) if (!COMPOUND_BY_ID.has(id)) badMarkerLinks.push(`${m.id} → ${id}`);
  }
  out.push(
    check(
      "Bloodwork → compound links resolve",
      badMarkerLinks.length === 0,
      badMarkerLinks.length ? badMarkerLinks.slice(0, 10).join(", ") : `${MARKER_STATS.markers} markers clean`,
      "warn"
    )
  );

  const badIcd = [];
  for (const c of CONDITIONS) {
    for (const code of splitCodes(c.icd10)) if (!ICD10.test(code)) badIcd.push(`${c.id}: icd10 "${code}"`);
    for (const code of splitCodes(c.icd11)) if (!ICD11.test(code)) badIcd.push(`${c.id}: icd11 "${code}"`);
    for (const code of splitCodes(c.icd9)) if (!ICD9.test(code)) badIcd.push(`${c.id}: icd9 "${code}"`);
  }
  out.push(
    check(
      "ICD-9 / ICD-10 / ICD-11 formats",
      badIcd.length === 0,
      badIcd.length ? badIcd.slice(0, 12).join(" · ") : `${CONDITION_STATS.conditions} conditions, all codes match their pattern`,
      "fail"
    )
  );

  const noDoseNote = [];
  const noPk = [];
  for (const c of COMPOUNDS) {
    const doses = c.doses || [];
    if (!doses.length) {
      noDoseNote.push(`${c.id}: no dose rows`);
      continue;
    }
    const ok = doses.every((d) => d && typeof d.note === "string" && /education only|not a recommendation/i.test(d.note));
    if (!ok) noDoseNote.push(c.id);
    if (!(Number(c.pk && c.pk.halfLife) > 0)) noPk.push(c.id);
  }
  out.push(
    check(
      "Every dose row carries the disclaimer note",
      noDoseNote.length === 0,
      noDoseNote.length ? noDoseNote.slice(0, 14).join(", ") + (noDoseNote.length > 14 ? ` (+${noDoseNote.length - 14})` : "") : "all rows annotated",
      "warn"
    )
  );
  out.push(
    check(
      "Half-life present (PK models need it)",
      noPk.length === 0,
      noPk.length ? `${noPk.length} without: ${noPk.slice(0, 12).join(", ")}` : "all compounds have t½",
      "info"
    )
  );

  const knownIds = new Set([...COMPOUND_BY_ID.keys(), ...EXTRA_SUBSTANCES.map((s) => s.id)]);
  const badRules = [];
  for (const r of PAIR_RULES) {
    if (!knownIds.has(r.a)) badRules.push(`rule ${r.a} (a)`);
    if (!knownIds.has(r.b)) badRules.push(`rule ${r.b} (b)`);
  }
  out.push(
    check("Interaction rules reference real substances", badRules.length === 0, badRules.slice(0, 10).join(", ") || `${PAIR_RULES.length} pairs · ${FLAG_RULES.length} class rules`)
  );

  const dupSymptoms = (() => {
    const seen = new Set();
    const dup = [];
    for (const s of SYMPTOM_INDEX) {
      if (seen.has(s.id)) dup.push(s.label);
      seen.add(s.id);
    }
    return dup;
  })();
  out.push(check("Symptom index has no duplicate labels", dupSymptoms.length === 0, dupSymptoms.join(", ") || `${SYMPTOM_INDEX.length} symptoms`));

  const emptyRegions = REGIONS.filter((r) => !(r.systems || []).length);
  out.push(
    check(
      "Brain regions carry a system",
      emptyRegions.length === 0,
      emptyRegions.length ? emptyRegions.map((r) => r.id).join(", ") : `${REGIONS.length} regions · ${TARGETS.length} targets`,
      "warn"
    )
  );

  const orphanTargets = TARGETS.filter((t) => !(t.regions || []).length);
  out.push(
    check(
      "Brain targets map to a region",
      orphanTargets.length === 0,
      orphanTargets.length ? orphanTargets.map((t) => t.id).join(", ") : "every target has at least one region",
      "warn"
    )
  );

  const emptyCompounds = COMPOUNDS.filter((c) => !(c.moa || []).length && !(c.targets || []).length);
  out.push(
    check(
      "Compounds have mechanism data",
      emptyCompounds.length === 0,
      emptyCompounds.length ? `${emptyCompounds.length}: ${emptyCompounds.slice(0, 10).map((c) => c.id).join(", ")}` : `all ${COMPOUNDS.length} have moa or targets`,
      "info"
    )
  );

  const unmapped = CONDITIONS.filter((c) => !(c.systems || []).length || !(c.subtypes || []).length);
  out.push(
    check(
      "Conditions have systems and subtypes",
      unmapped.length === 0,
      unmapped.length ? unmapped.slice(0, 10).map((c) => c.id).join(", ") : `${CONDITION_STATS.subtypes} subtypes mapped`,
      "warn"
    )
  );

  return out;
}

export function render() {
  const results = run();
  const fails = results.filter((r) => !r.ok && r.severity === "fail").length;
  const warns = results.filter((r) => !r.ok && r.severity === "warn").length;
  const infos = results.filter((r) => !r.ok && r.severity === "info").length;
  const tone = fails ? "bad" : warns ? "warn" : "good";

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Diagnostics</div>
        <h1 class="page-title">Data audit</h1>
        <div class="page-sub">Runs against the loaded corpus every time the page opens. It catches the failures that render silently: dead ids, malformed codes, missing disclaimers.</div>
      </div>
      <span class="chip chip-xs" data-tone="${tone}">v${esc(VERSION)} · ${fails ? `${fails} fail` : "no failures"}${warns ? ` · ${warns} warn` : ""}</span>
    </div>

    <div class="au-summary" data-tone="${tone}">
      <div class="au-big">${fails ? icon("alert", 20) : icon("check", 20)}<b>${results.length - results.filter((r) => !r.ok).length}/${results.length}</b></div>
      <div class="small dim">${fails} hard failures · ${warns} warnings · ${infos} informational</div>
    </div>

    <div class="au-list">
      ${results
        .map(
          (r, i) => `<div class="au-row" data-ok="${r.ok ? "1" : "0"}" data-sev="${esc(r.severity)}">
            <span class="au-mark">${r.ok ? icon("check", 13) : icon(r.severity === "info" ? "info" : "alert", 13)}</span>
            <div class="au-main">
              <span class="au-name">${esc(r.name)}</span>
              <span class="au-detail tiny ${r.ok ? "dim" : r.severity === "info" ? "dim" : "warn"}">${esc(r.detail)}</span>
            </div>
            <button type="button" class="chip chip-xs" data-copy-audit="${i}">${icon("copy", 11)}</button>
          </div>`
        )
        .join("")}
    </div>

    <div class="callout" style="margin-top:16px">
      <b>How to read it.</b> A hard failure means something is referencing a name that does not exist — a dead link, a broken card. Warnings are editorial gaps that render fine but leave the page thinner than it should be. Informational rows are coverage counts, not defects.
    </div>
  </div>`;
}

export function mount(root) {
  const results = run();
  root.querySelectorAll("[data-copy-audit]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = results[Number(b.getAttribute("data-copy-audit"))];
      if (!r) return;
      const text = `${r.ok ? "OK" : "FAIL"} · ${r.name}\n${r.detail}`;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
    })
  );
}

export default { render, mount };