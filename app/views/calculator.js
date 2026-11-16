/* Peptide reconstitution calculator.
 * Pure arithmetic on vial strength and diluent volume — no recommendation is implied.
 */

import { esc, icon, toast, copyText } from "../core.js";
import { COMPOUND_BY_ID } from "../data/compounds.js";
import { pageHead, sectionCard, callout } from "./ui.js";

/* Popular peptides with the vial size that is normally sold. */
const PRESETS = [
  { id: "bpc-157", vial: 5, diluent: 2 },
  { id: "tb-500", vial: 5, diluent: 2 },
  { id: "ipamorelin", vial: 5, diluent: 2 },
  { id: "cjc-1295", vial: 2, diluent: 2 },
  { id: "sermorelin", vial: 5, diluent: 2 },
  { id: "tesamorelin", vial: 2, diluent: 1 },
  { id: "hexarelin", vial: 5, diluent: 2 },
  { id: "ghrp-2", vial: 5, diluent: 2 },
  { id: "ghrp-6", vial: 5, diluent: 2 },
  { id: "ghk-cu", vial: 50, diluent: 5 },
  { id: "melanotan-ii", vial: 10, diluent: 2 },
  { id: "aod-9604", vial: 5, diluent: 2 },
  { id: "dsip", vial: 5, diluent: 2 },
  { id: "kisspeptin-10", vial: 5, diluent: 2 },
  { id: "bremelanotide", vial: 10, diluent: 2 },
  { id: "hgh-fragment-176-191", vial: 5, diluent: 2 },
  { id: "semaglutide", vial: 5, diluent: 2 },
  { id: "tirzepatide", vial: 10, diluent: 2 },
];

const SYRINGES = [
  { id: "u100-100", label: "U-100 · 1 mL (100 units)", unitsPerMl: 100, capacity: 100 },
  { id: "u100-50", label: "U-100 · 0.5 mL (50 units)", unitsPerMl: 100, capacity: 50 },
  { id: "u100-30", label: "U-100 · 0.3 mL (30 units)", unitsPerMl: 100, capacity: 30 },
  { id: "u40-100", label: "U-40 · 1 mL (40 units)", unitsPerMl: 40, capacity: 40 },
  { id: "ml", label: "Millilitre scale (1 mL)", unitsPerMl: 1, capacity: 1 },
];

const FREQ = [
  { id: "1", label: "Once daily", perDay: 1 },
  { id: "2", label: "Twice daily", perDay: 2 },
  { id: "3", label: "Three times daily", perDay: 3 },
  { id: "7", label: "Once weekly", perDay: 1 / 7 },
];

function refDoseMcg(id) {
  const c = COMPOUND_BY_ID.get(id);
  const d = (c && c.doses && c.doses[0]) || null;
  if (!d) return null;
  const low = Number(d.low);
  if (!isFinite(low) || low <= 0) return null;
  const unit = String(d.unit || "").toLowerCase();
  if (unit.includes("mcg") || unit === "µg" || unit === "ug") return Math.round(low);
  if (unit.includes("mg")) return Math.round(low * 1000);
  if (unit.includes("iu")) return null;
  return null;
}

function presetOptions() {
  return PRESETS.map((p) => {
    const c = COMPOUND_BY_ID.get(p.id);
    const name = c ? c.name : p.id;
    return `<option value="${esc(p.id)}" data-vial="${p.vial}" data-diluent="${p.diluent}" data-dose="${refDoseMcg(p.id) || ""}">${esc(name)} · ${p.vial} mg vial</option>`;
  }).join("");
}

export function calculator(ctx) {
  const first = PRESETS[0];
  const firstC = COMPOUND_BY_ID.get(first.id);
  return `${pageHead(
    "Peptide calculator",
    "Reconstitution arithmetic for the peptides people actually buy: vial strength, diluent volume, syringe units and how long a vial lasts. Pure maths — the reference dose is a literature anchor, never an instruction.",
    `<a class="btn soft sm" href="#/compounds?tag=peptide">${icon("pill", 15)} Peptides</a>`,
    "Tools"
  )}
  <div class="split calc-layout">
    <div class="stack">
      <section class="card">
        <div class="card-head"><h3>1 · Vial</h3><span class="spacer"></span><span class="tiny dim">lyophilised powder</span></div>
        <label class="field">
          <span>Preset peptide</span>
          <select class="select" id="calc-preset">${presetOptions()}</select>
        </label>
        <div class="grid-2" style="gap:10px;margin-top:10px">
          <label class="field">
            <span>Peptide mass (mg)</span>
            <input class="input" id="calc-vial" type="number" inputmode="decimal" min="0.1" step="0.5" value="${first.vial}" />
          </label>
          <label class="field">
            <span>Diluent added (mL)</span>
            <input class="input" id="calc-diluent" type="number" inputmode="decimal" min="0.1" step="0.1" value="${first.diluent}" />
          </label>
        </div>
        <div class="row wrap" style="gap:6px;margin-top:10px">
          <button class="chip chip-btn" data-diluent="1">1 mL</button>
          <button class="chip chip-btn" data-diluent="2">2 mL</button>
          <button class="chip chip-btn" data-diluent="2.5">2.5 mL</button>
          <button class="chip chip-btn" data-diluent="3">3 mL</button>
          <button class="chip chip-btn" data-diluent="5">5 mL</button>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>2 · Dose and syringe</h3></div>
        <div class="grid-2" style="gap:10px">
          <label class="field">
            <span>Target dose (mcg)</span>
            <input class="input" id="calc-dose" type="number" inputmode="decimal" min="1" step="10" value="${refDoseMcg(first.id) || 250}" />
          </label>
          <label class="field">
            <span>Injections per week</span>
            <select class="select" id="calc-freq">
              ${FREQ.map((f) => `<option value="${f.perDay * 7}"${f.id === "1" ? " selected" : ""}>${esc(f.label)}</option>`).join("")}
            </select>
          </label>
        </div>
        <label class="field" style="margin-top:10px">
          <span>Syringe</span>
          <select class="select" id="calc-syringe">
            ${SYRINGES.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join("")}
          </select>
        </label>
      </section>

      ${callout(
        "warn",
        "This is arithmetic, not advice",
        "The preset dose comes from the reference range quoted on the compound page for study purposes. It is not a recommendation, not a starting dose, and not validated for any person. Peptides sold online are frequently mislabelled or unsterile."
      )}
    </div>

    <aside class="stack sticky-side">
      <section class="card calc-out">
        <div class="card-head"><h3>Result</h3><span class="spacer"></span><button class="btn ghost xs" id="calc-copy">${icon("quote", 13)} Copy</button></div>

        <div class="calc-hero">
          <div class="calc-hero-l">
            <div class="stat-label">Draw to</div>
            <div class="calc-units"><span id="out-units">—</span><span class="cu-suffix" id="out-suffix">units</span></div>
            <div class="tiny dim" id="out-ml">— mL</div>
          </div>
          <div class="calc-syringe" id="calc-syringe-viz">
            <div class="cs-bar"><i id="cs-fill"></i></div>
            <div class="cs-ticks"><span>0</span><span>50</span><span>100</span></div>
          </div>
        </div>

        <div class="calc-rows">
          <div class="calc-row"><span>Concentration</span><b id="out-conc">—</b></div>
          <div class="calc-row"><span>Dose in volume</span><b id="out-vol">—</b></div>
          <div class="calc-row"><span>Doses per vial</span><b id="out-doses">—</b></div>
          <div class="calc-row"><span>Vial lasts</span><b id="out-days">—</b></div>
          <div class="calc-row"><span>Units per mcg</span><b id="out-upm">—</b></div>
        </div>

        <p class="tiny dim" id="out-warn" style="margin-top:8px;line-height:1.55"></p>
      </section>

      <section class="card tight">
        <div class="row between" style="margin-bottom:6px"><span class="tiny dim">Quick reference</span><span class="tiny dim mono">1 mg = 1000 mcg</span></div>
        <ul class="clean tiny">
          <li>U-100 means 100 units per mL — 1 unit = 0.01 mL.</li>
          <li>Adding less water makes every unit stronger, not the vial bigger.</li>
          <li>Reconstitute by running the diluent down the glass wall, then swirl — never shake a peptide.</li>
          <li>Most reconstituted peptides are kept cold; check the specific compound page.</li>
        </ul>
      </section>
    </aside>
  </div>`;
}

export function mount(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const vial = $("calc-vial");
  const diluent = $("calc-diluent");
  const dose = $("calc-dose");
  const syringe = $("calc-syringe");
  const freq = $("calc-freq");
  const preset = $("calc-preset");
  if (!vial || !diluent || !dose || !syringe || !freq) return;

  const num = (el, fallback = 0) => {
    const v = Number(String(el.value).replace(",", "."));
    return isFinite(v) && v > 0 ? v : fallback;
  };

  const syringeMeta = () => SYRINGES.find((s) => s.id === syringe.value) || SYRINGES[0];

  const fmt = (n, d = 1) => {
    if (!isFinite(n)) return "—";
    if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
    return Number(n.toFixed(d)).toString();
  };

  const compute = () => {
    const mg = num(vial, 1);
    const ml = num(diluent, 1);
    const mcg = num(dose, 100);
    const s = syringeMeta();
    const perWeek = num(freq, 7);

    const concMcgPerMl = (mg * 1000) / ml;
    const volumeMl = mcg / concMcgPerMl;
    const units = volumeMl * s.unitsPerMl;
    const dosesPerVial = (mg * 1000) / mcg;
    const perDay = perWeek / 7;
    const days = dosesPerVial / (perDay || 1);
    const upm = s.unitsPerMl / concMcgPerMl;

    const set = (id, text) => {
      const el = $(id);
      if (el) el.textContent = text;
    };

    set("out-units", s.unitsPerMl === 1 ? fmt(volumeMl, 3) : fmt(units, 1));
    set("out-suffix", s.unitsPerMl === 1 ? "mL" : "units");
    set("out-ml", `${fmt(volumeMl, 3)} mL drawn`);
    set("out-conc", `${fmt(concMcgPerMl, concMcgPerMl >= 100 ? 0 : 1)} mcg/mL`);
    set("out-vol", `${fmt(volumeMl, 3)} mL`);
    set("out-doses", fmt(dosesPerVial, dosesPerVial >= 10 ? 0 : 1));
    set("out-days", Number.isFinite(days) && days > 0 ? `${fmt(days, days >= 20 ? 0 : 1)} days` : "—");
    set("out-upm", `${fmt(upm, 3)} ${s.unitsPerMl === 1 ? "mL" : "units"}/mcg`);

    const fill = $("cs-fill");
    if (fill) {
      const ratio = s.unitsPerMl === 1 ? volumeMl / s.capacity : units / s.capacity;
      fill.style.width = `${Math.max(1.5, Math.min(100, ratio * 100))}%`;
      fill.classList.toggle("over", ratio > 1);
    }

    let warn = "";
    if (units > s.capacity) warn = "That dose needs more than this syringe holds. Use a larger syringe or a stronger concentration.";
    else if (units < 1 && s.unitsPerMl > 1) warn = "Under one unit cannot be measured accurately on this syringe. Add less diluent or use a smaller syringe.";
    else if (concMcgPerMl > 20000) warn = "Concentration is very high; small measurement errors become large dose errors.";
    const warnEl = $("out-warn");
    if (warnEl) warnEl.textContent = warn || "Reference arithmetic only. Verify your own numbers twice before anything else.";
  };

  ["input", "change"].forEach((evt) => {
    [vial, diluent, dose].forEach((el) => el && el.addEventListener(evt, compute));
    syringe.addEventListener(evt, compute);
    freq.addEventListener(evt, compute);
  });

  if (preset) {
    preset.addEventListener("change", () => {
      const opt = preset.selectedOptions[0];
      if (!opt) return;
      if (opt.dataset.vial) vial.value = opt.dataset.vial;
      if (opt.dataset.diluent) diluent.value = opt.dataset.diluent;
      if (opt.dataset.dose) dose.value = opt.dataset.dose;
      compute();
    });
  }

  root.addEventListener("click", async (ev) => {
    const d = ev.target.closest("[data-diluent]");
    if (d) {
      diluent.value = d.dataset.diluent;
      compute();
      return;
    }
    if (ev.target.closest("#calc-copy")) {
      const s = syringeMeta();
      const text = [
        `Vial: ${num(vial, 1)} mg in ${num(diluent, 1)} mL`,
        `Concentration: ${(($("out-conc") || {}).textContent || "").trim()}`,
        `Dose: ${num(dose, 0)} mcg → ${(($("out-units") || {}).textContent || "").trim()} ${s.unitsPerMl === 1 ? "mL" : "units"} on ${s.label}`,
        `Doses per vial: ${(($("out-doses") || {}).textContent || "").trim()}`,
        "Reference arithmetic only — not a dosing recommendation.",
      ].join("\n");
      const ok = await copyText(text);
      toast(ok ? "Calculation copied" : "Copy failed", ok ? "ok" : "danger");
    }
  });

  compute();
}

export default { render: calculator, mount };