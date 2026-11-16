/* Taper planner — a stepwise reduction schedule derived from elimination half-life.
 *
 * The maths is deliberately boring and honest:
 *   · after a dose change the plasma level moves toward the new steady state
 *     with a half-life of t½, so ~5 × t½ is where it actually arrives;
 *   · a 10% step keeps the *drop* smaller than what the nervous system adapts
 *     to between steps — that is why hyperbolic tapers work better than
 *     straight-line ones;
 *   · the plan never pretends to know your tablets: every dose is rounded to a
 *     granule you can actually measure (whole tablet, half, quarter, eighth).
 */

import { esc, icon, store, fmt, toast, uid, copyText, awardXP, emptyState } from "../core.js";
import { COMPOUNDS, getCompound } from "../data/compounds.js";
import { pageHead, callout, backLink, statTile, classColor } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Which compounds actually need a taper                               */
/* ------------------------------------------------------------------ */

const DEPENDENCE_FLAGS = ["dependence-risk", "addictive", "withdrawal-severe", "gabaergic", "gaba-modulator", "opioid", "serotonergic", "sedative"];

const COMMON_TAPERS = ["alprazolam", "diazepam", "zolpidem", "sertraline", "venlafaxine", "pregabalin", "phenibut", "tramadol"];

const TAPERABLE = COMPOUNDS.filter(
  (c) => Number(c.pk?.halfLife) > 0 && (c.flags || []).some((f) => DEPENDENCE_FLAGS.includes(f))
).sort((a, b) => a.name.localeCompare(b.name));

const OTHERS = COMPOUNDS.filter((c) => Number(c.pk?.halfLife) > 0 && !TAPERABLE.includes(c)).sort((a, b) => a.name.localeCompare(b.name));

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const TARGETS = [50, 25, 12.5, 5];

const state = {
  id: "alprazolam",
  dose: 1,
  freq: 1,
  unit: "mg",
  stepPct: 10,
  holdDays: 14,
  finalPct: 12.5,
};

let appliedQuery = "";

/** Adopt a compound's unit, typical dose and dosing frequency. */
function useCompound(c) {
  if (!c) return;
  state.id = c.id;
  const first = (c.doses || [])[0];
  state.unit = (first && first.unit) || "mg";
  state.dose = defaultDose(c);
  state.freq = 1;
}

/* ------------------------------------------------------------------ */
/* Dose maths                                                          */
/* ------------------------------------------------------------------ */

/** Smallest dose change a person can realistically measure at this dose. */
function granuleFor(dose) {
  if (dose >= 100) return 5;
  if (dose >= 20) return 1;
  if (dose >= 5) return 0.5;
  if (dose >= 1) return 0.25;
  return 0.125;
}

function roundTo(value, step) {
  return Number((Math.round(value / step) * step).toFixed(3));
}

function doseText(value, unit) {
  const n = Number(Number(value).toFixed(3));
  return `${n} ${unit}`;
}

function defaultDose(c) {
  const d = (c?.doses || [])[0];
  if (!d) return 1;
  const lo = Number(d.low) || Number(d.high) || 1;
  const hi = Number(d.high) || lo;
  return roundTo(lo + (hi - lo) / 2, granuleFor(hi));
}

/**
 * Build the reduction ladder.
 * @returns {{steps:Array, totalDays:number, finalDose:number, floor:number, overshoot:boolean}}
 */
export function buildPlan({ startDose, freq, stepPct, holdDays, finalPct, halfLife }) {
  if (!(Number(startDose) > 0)) return { steps: [], totalDays: 0, finalDose: 0, floor: 0 };
  const floor = Number(((startDose * finalPct) / 100).toFixed(4));
  const steps = [];
  let current = startDose;
  let guard = 0;

  while (current > floor + 1e-9 && guard++ < 80) {
    const g = granuleFor(current);
    let next = roundTo(current * (1 - stepPct / 100), g);
    if (next >= current) next = roundTo(current - g, g); // guarantee forward progress
    if (next < 0) next = 0;

    steps.push({
      n: steps.length + 1,
      dose: next,
      prev: current,
      drop: Number((current - next).toFixed(3)),
      dropPct: Number((((current - next) / current) * 100).toFixed(1)),
      perDose: Number((next / Math.max(1, freq)).toFixed(3)),
      settleHours: Number.isFinite(halfLife) && halfLife > 0 ? halfLife * 5 : null,
    });

    current = next;
    if (next <= 0) break;
  }

  return {
    steps,
    totalDays: steps.length * holdDays,
    finalDose: steps.length ? steps[steps.length - 1].dose : startDose,
    floor,
  };
}

/* ------------------------------------------------------------------ */
/* View fragments                                                      */
/* ------------------------------------------------------------------ */

function planText(c, plan, cfg) {
  const lines = [];
  lines.push(`Taper plan — ${c.name}${Number(c.pk?.halfLife) > 0 ? ` (t½ ${fmt.duration(Number(c.pk.halfLife))})` : ""}`);
  lines.push(
    `Start ${doseText(cfg.dose, cfg.unit)} per day (${cfg.freq}×/day) → target ${doseText(plan.finalDose, cfg.unit)}, −${cfg.stepPct}% every ${cfg.holdDays} days`
  );
  lines.push("");
  let day = 1;
  for (const s of plan.steps) {
    const last = day + cfg.holdDays - 1;
    lines.push(
      `Step ${s.n} · days ${day}–${last} · ${doseText(s.dose, cfg.unit)}/day (${doseText(s.perDose, cfg.unit)} ${cfg.freq === 1 ? "once" : `${cfg.freq}×`} daily) · −${s.dropPct}%`
    );
    day = last + 1;
  }
  lines.push("");
  lines.push(`Total: ${plan.totalDays} days (${(plan.totalDays / 7).toFixed(1)} weeks)`);
  lines.push("Generated with NeuroDifference. Educational estimate — not medical advice.");
  return lines.join("\n");
}

function rowsHtml(c, plan, cfg) {
  if (!plan.steps.length) {
    return `<div class="card">${emptyState(
      "check",
      "Nothing to taper",
      "The starting dose is already at or below your target. Lower the target, raise the start dose, or pick another compound.",
      ""
    )}</div>`;
  }

  const rows = plan.steps
    .map((s) => {
      const width = Math.max(2, Math.round((s.dose / Math.max(cfg.dose, 1e-9)) * 100));
      const settle = s.settleHours ? fmt.duration(s.settleHours) : "—";
      return `<li class="taper-row">
        <span class="taper-n" aria-hidden="true">${s.n}</span>
        <div class="taper-body">
          <div class="row between" style="gap:8px">
            <b class="mono" style="font-size:13.5px">${esc(doseText(s.dose, cfg.unit))}<span class="dim" style="font-weight:400"> / day</span></b>
            <span class="tiny dim">−${esc(String(s.dropPct))}%</span>
          </div>
          <div class="meter" style="margin:6px 0 5px"><i style="width:${width}%"></i></div>
          <div class="tiny dim">
            ${cfg.freq > 1 ? `${esc(doseText(s.perDose, cfg.unit))} × ${cfg.freq}/day` : "once daily"}
            · level settles in ~${esc(settle)}
          </div>
        </div>
      </li>`;
    })
    .join("");

  const stopNote =
    plan.finalDose > 0
      ? `<li class="taper-row taper-stop">
          <span class="taper-n" aria-hidden="true">${icon("flag", 13)}</span>
          <div class="taper-body">
            <b style="font-size:13px">Step off from ${esc(doseText(plan.finalDose, cfg.unit))}</b>
            <div class="tiny dim" style="margin-top:3px">The rest clears over ~${esc(fmt.duration(5 * (Number(c.pk?.halfLife) || 0) || 24))}. Expect a few uneven nights — that is the last of the drug leaving, not a relapse.</div>
          </div>
        </li>`
      : "";

  return `<ol class="taper-plan">${rows}${stopNote}</ol>`;
}

function summaryHtml(c, plan, cfg) {
  const hl = Number(c.pk?.halfLife) || 0;
  const weeks = plan.totalDays / 7;
  return `<div class="grid grid-2 grid-4" style="gap:10px">
    ${statTile({ label: "Steps", value: String(plan.steps.length), sub: `−${cfg.stepPct}% each`, iconName: "list" })}
    ${statTile({
      label: "Duration",
      value: plan.totalDays >= 14 ? `${fmt.num(weeks, 1)} w` : `${plan.totalDays} d`,
      sub: `${plan.totalDays} days total`,
      iconName: "clock",
    })}
    ${statTile({
      label: "Final dose",
      value: doseText(plan.finalDose, cfg.unit),
      sub: `${Math.round((plan.finalDose / Math.max(cfg.dose, 1e-9)) * 100)}% of start`,
      iconName: "target",
    })}
    ${statTile({
      label: "Half-life",
      value: hl > 0 ? fmt.duration(hl) : "—",
      sub: hl > 0 ? `steady state in ~${fmt.duration(hl * 5)}` : "no PK data",
      iconName: "activity",
    })}
  </div>`;
}

function warningsHtml(c, cfg) {
  const out = [];
  const hl = Number(c.pk?.halfLife) || 0;
  const flags = new Set(c.flags || []);

  if (cfg.stepPct > 25) {
    out.push(
      callout(
        "warn",
        `${cfg.stepPct}% per step is steep`,
        "Above ~10% the drop usually outruns adaptation. For benzodiazepines, alcohol-like sedatives and antidepressants, 5–10% steps are the tolerated range."
      )
    );
  }
  if (flags.has("withdrawal-severe") || flags.has("gabaergic") || flags.has("dependence-risk")) {
    out.push(
      callout(
        "danger",
        "Do not do this alone",
        `${c.name} withdrawal can include rebound anxiety, insomnia and — with sedatives — seizures. A prescriber should own the schedule; abrupt stops are more dangerous than the drug.`
      )
    );
  }
  if (flags.has("serotonergic")) {
    out.push(
      callout(
        "info",
        "Antidepressant discontinuation",
        "Expect dizziness, 'brain zaps', irritability and flu-like aches if steps are too big. A 10% step every 4 weeks is the slow end; some people need the last milligrams removed in liquid or by bead counting."
      )
    );
  }
  if (hl > 0 && cfg.holdDays < hl * 4) {
    out.push(
      callout(
        "warn",
        "The next step comes before the level settles",
        `With a ${fmt.duration(hl)} half-life the new steady state needs about ${fmt.duration(hl * 5)}. Holding only ${cfg.holdDays} days stacks withdrawal on top of withdrawal.`
      )
    );
  }
  if (!flags.has("dependence-risk") && !flags.has("addictive") && !flags.has("withdrawal-severe") && !flags.has("serotonergic")) {
    out.push(
      callout(
        "ok",
        "No dependence signal in this database",
        "There is no pharmacological reason to taper this compound slowly. Stopping is usually fine — check the warning list in the monograph first."
      )
    );
  }
  return out.join("");
}

/** Single entry point so the view and its buttons always agree on the plan. */
function planFor(c, cfg) {
  return buildPlan({
    startDose: Number(cfg.dose) || 0,
    freq: Math.max(1, Number(cfg.freq) || 1),
    stepPct: Number(cfg.stepPct) || 10,
    holdDays: Math.max(1, Number(cfg.holdDays) || 14),
    finalPct: Number(cfg.finalPct) || 12.5,
    halfLife: Number(c?.pk?.halfLife) || 0,
  });
}

function planHtml(c, cfg) {
  const plan = planFor(c, cfg);
  return `<div class="stack" style="gap:14px">
    ${summaryHtml(c, plan, cfg)}
    <div class="card">
      <div class="card-head">
        <h3>Reduction ladder</h3>
        <span class="spacer"></span>
        <span class="row" style="gap:6px">
          <button class="btn ghost sm" data-act="copy">${icon("copy", 13)} Copy</button>
          <button class="btn soft sm" data-act="save">${icon("pin", 13)} Save</button>
        </span>
      </div>
      <p class="small muted" style="margin-bottom:12px">
        Each step holds ${cfg.holdDays} days before the next drop. Doses are rounded to something you can actually measure.
      </p>
      ${rowsHtml(c, plan, cfg)}
    </div>
    <div class="stack" style="gap:10px">${warningsHtml(c, cfg)}</div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

function compoundOptions() {
  const selected = (c) => (c.id === state.id ? "selected" : "");
  return `<optgroup label="Commonly tapered">
    ${TAPERABLE.map((c) => `<option value="${esc(c.id)}" ${selected(c)}>${esc(c.name)} — t½ ${esc(fmt.duration(Number(c.pk.halfLife)))}</option>`).join("")}
  </optgroup>
  <optgroup label="Everything else">
    ${OTHERS.map((c) => `<option value="${esc(c.id)}" ${selected(c)}>${esc(c.name)} — t½ ${esc(fmt.duration(Number(c.pk.halfLife)))}</option>`).join("")}
  </optgroup>`;
}

export const taper = {
  render(ctx) {
    const wanted = String(ctx.query.compound || "").toLowerCase();
    if (wanted && wanted !== appliedQuery) {
      appliedQuery = wanted;
      const next = getCompound(wanted);
      if (next && Number(next.pk?.halfLife) > 0) useCompound(next);
    }

    const c = getCompound(state.id) || TAPERABLE[0] || COMPOUNDS[0];

    const cfg = {
      dose: state.dose,
      freq: state.freq,
      unit: state.unit,
      stepPct: state.stepPct,
      holdDays: state.holdDays,
      finalPct: state.finalPct,
    };

    return `${pageHead(
      "Taper planner",
      "Turn a half-life into a schedule: how fast to step down, how long each step holds, and when the level actually settles.",
      `<a class="btn ghost sm" href="#/lab">${icon("flask", 14)} Dose lab</a>`
    )}

    ${backLink("#/lab", "Lab")}

    <div class="split">
      <div class="stack" style="gap:14px" id="taper-out">${planHtml(c, cfg)}</div>

      <aside class="stack sticky-side" style="gap:14px">
        <div class="card">
          <div class="card-head"><h3>Inputs</h3></div>
          <div class="stack" style="gap:12px">
            <label class="field">Compound
              <select class="select" id="tp-c">${compoundOptions()}</select>
            </label>

            <div class="grid grid-2" style="gap:10px">
              <label class="field">Daily dose (${esc(state.unit)})
                <input class="input" id="tp-dose" type="number" inputmode="decimal" min="0.01" max="20000" step="any" value="${state.dose}">
              </label>
              <label class="field">Doses per day
                <input class="input" id="tp-freq" type="number" inputmode="numeric" min="1" max="4" step="1" value="${state.freq}">
              </label>
              <label class="field">Step size (%)
                <input class="input" id="tp-step" type="number" inputmode="numeric" min="1" max="50" step="1" value="${state.stepPct}">
              </label>
              <label class="field">Hold (days)
                <input class="input" id="tp-hold" type="number" inputmode="numeric" min="1" max="120" step="1" value="${state.holdDays}">
              </label>
            </div>

            <div class="field">Stop at (% of start)
              <div class="row wrap" style="gap:6px;margin-top:2px">
                ${TARGETS.map(
                  (t) => `<button class="chip chip-btn ${state.finalPct === t ? "on" : ""}" data-target="${t}">${t}%</button>`
                ).join("")}
              </div>
            </div>

            <div class="row wrap" style="gap:6px;padding-top:2px">
              ${COMMON_TAPERS.map((id) => {
                const x = getCompound(id);
                if (!x) return "";
                return `<button class="chip chip-btn ${x.id === state.id ? "on" : ""}" data-pick="${esc(x.id)}">
                  <span class="dot" style="background:${classColor(x.cls)}"></span>${esc(x.name)}
                </button>`;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="card tight">
          <div class="stack-3">
            <b style="font-size:13px">Why hyperbolic</b>
            <p class="tiny muted" style="line-height:1.6">
              The same 1 mg is a 50% cut at 2 mg and a 5% cut at 20 mg. Fixed-percent steps therefore remove more drug early and
              smaller amounts later, which is what receptor adaptation can follow. Time between steps is set by the half-life:
              about five of them and the plasma level has finished moving.
            </p>
          </div>
        </div>

        <div class="card tight">
          <p class="tiny dim" style="line-height:1.6">
            Educational model. It knows the half-life and the arithmetic — not your kidneys, your dose form or your history.
            Anyone on benzodiazepines, opioids, antipsychotics or antidepressants should taper with a prescriber.
          </p>
        </div>
      </aside>
    </div>`;
  },

  mount(root, ctx) {
    const current = () => getCompound(state.id) || COMPOUNDS[0];

    const cfgOf = () => ({
      dose: state.dose,
      freq: state.freq,
      unit: state.unit,
      stepPct: state.stepPct,
      holdDays: state.holdDays,
      finalPct: state.finalPct,
    });

    function repaint() {
      const host = root.querySelector("#taper-out");
      if (host) host.innerHTML = planHtml(current(), cfgOf());
      root.querySelectorAll("[data-pick]").forEach((el) => el.classList.toggle("on", el.dataset.pick === state.id));
      root.querySelectorAll("[data-target]").forEach((el) => el.classList.toggle("on", Number(el.dataset.target) === state.finalPct));
    }

    function setVal(sel, value) {
      const el = root.querySelector(sel);
      if (el) el.value = String(value);
    }

    root.querySelector("#tp-c")?.addEventListener("change", (ev) => {
      const c = getCompound(ev.target.value);
      if (!c) return;
      useCompound(c);
      ctx.rerender?.();
    });

    const bindNumber = (sel, key, min, max, { integer = false } = {}) => {
      root.querySelector(sel)?.addEventListener("change", (ev) => {
        let v = Number(ev.target.value);
        if (!Number.isFinite(v)) v = state[key];
        v = Math.min(max, Math.max(min, v));
        if (integer) v = Math.round(v);
        state[key] = v;
        ev.target.value = String(v);
        repaint();
      });
    };

    bindNumber("#tp-dose", "dose", 0.01, 20000);
    bindNumber("#tp-freq", "freq", 1, 4, { integer: true });
    bindNumber("#tp-step", "stepPct", 1, 50, { integer: true });
    bindNumber("#tp-hold", "holdDays", 1, 120, { integer: true });

    root.addEventListener("click", (ev) => {
      const pick = ev.target.closest("[data-pick]");
      if (pick) {
        const c = getCompound(pick.dataset.pick);
        if (!c) return;
        useCompound(c);
        ctx.rerender?.();
        return;
      }

      const target = ev.target.closest("[data-target]");
      if (target) {
        state.finalPct = Number(target.dataset.target);
        repaint();
        return;
      }

      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (!act) return;

      const c = current();
      const cfg = cfgOf();
      const plan = planFor(c, cfg);

      if (act === "copy") {
        copyText(planText(c, plan, cfg), "Taper plan copied");
        return;
      }

      if (act === "save") {
        const body = planText(c, plan, cfg);
        const now = new Date().toISOString();
        store.data.notes.unshift({
          id: uid(),
          title: `Taper — ${c.name}`,
          body,
          tags: ["taper", c.id],
          compoundId: c.id,
          createdAt: now,
          updatedAt: now,
        });
        if (store.save()) {
          awardXP(8, "taper plan saved");
          toast("Saved to notebook", "ok");
          ctx.refreshCounts?.();
        } else {
          toast("Could not save — storage is full", "error");
        }
      }
    });
  },
};

export default taper;