/* Lab: pharmacokinetic simulator + interaction checker */

import { esc, icon, store, fmt, toast, emptyState, evidenceChip, clamp } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID, getCompound, resolveCompound, searchCompounds, CLASSES } from "../data/compounds.js";
import { EXTRA_SUBSTANCES, SEVERITY, checkInteractions, worstSeverity, PAIR_RULES, PHENOMENA } from "../data/interactions.js";
import { pageHead, callout, backLink, lineChart, classColor, statTile } from "./ui.js";

/* ------------------------------------------------------------------ */
/* PK simulator                                                        */
/* ------------------------------------------------------------------ */

const DOSE_COMPOUNDS = COMPOUNDS.filter((c) => Number(c.pk?.halfLife) > 0).sort((a, b) => a.name.localeCompare(b.name));

const sim = {
  id: "",
  dose: 100,
  unit: "mg",
  interval: 24,
  doses: 7,
  halfLife: 0,
  vd: 100,
  compare: "",
};

function defaultDoseFor(c) {
  const d = (c.doses || [])[0];
  if (!d) return 100;
  const high = Number(d.high) || Number(d.low) || 100;
  const low = Number(d.low) || high;
  return Math.round((low + high) / 2);
}

function loadCompound(id, { keepDose = false } = {}) {
  const c = getCompound(id);
  if (!c || !(Number(c.pk?.halfLife) > 0)) return false;
  sim.id = c.id;
  sim.halfLife = Number(c.pk.halfLife);
  const first = (c.doses || [])[0];
  sim.unit = (first && first.unit) || "mg";
  if (!keepDose) sim.dose = defaultDoseFor(c);
  const hl = Number(c.pk.halfLife);
  sim.interval = hl <= 8 ? 8 : hl <= 18 ? 12 : hl <= 40 ? 24 : Math.round(hl / 24) * 24 || 24;
  return true;
}

/** Bateman-style single compartment, first-order absorption, repeated doses. */
function simulateCurve({ dose, interval, count, halfLife, vd, steps = 180 }) {
  const ke = Math.LN2 / halfLife;
  const ka = ke * 4;
  const total = interval * count + halfLife * 5;
  const scale = dose / vd;
  const pts = [];
  const n = Math.max(60, steps);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * total;
    let c = 0;
    for (let d = 0; d < count; d++) {
      const td = t - d * interval;
      if (td <= 0) continue;
      c += scale * (ka / (ka - ke)) * (Math.exp(-ke * td) - Math.exp(-ka * td));
    }
    pts.push({ x: t, y: Math.max(0, c) });
  }
  let cmax = 0;
  let tmax = 0;
  for (const p of pts) {
    if (p.y > cmax) {
      cmax = p.y;
      tmax = p.x;
    }
  }
  const acc = 1 / (1 - Math.exp(-ke * interval));
  const last = pts[pts.length - 1]?.y || 0;
  // Trough right before the final dose. Sampling must land exactly on
  // (count-1)*interval and skip the final dose itself (td <= 0), otherwise the
  // in-progress absorption of the last tablet inflates the trough.
  const trough = (() => {
    const t = (count - 1) * interval;
    let c = 0;
    for (let d = 0; d < count; d++) {
      const td = t - d * interval;
      if (td <= 0) continue;
      c += scale * (ka / (ka - ke)) * (Math.exp(-ke * td) - Math.exp(-ka * td));
    }
    return Math.max(0, c);
  })();
  return { pts, cmax, tmax, acc, trough, total, ke, halfLife };
}

function curveSeries(c, overrides) {
  if (!c || !(Number(c.pk?.halfLife) > 0)) return null;
  const halfLife = overrides.halfLife || Number(c.pk.halfLife);
  const result = simulateCurve({
    dose: overrides.dose,
    interval: overrides.interval,
    count: overrides.doses,
    halfLife,
    vd: overrides.vd,
  });
  return { c, result, halfLife };
}

function fmtH(h) {
  if (!Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round((h / 24) * 10) / 10} d`;
}

function simChartHtml() {
  const a = curveSeries(getCompound(sim.id), sim);
  if (!a) {
    return `<div class="card">${emptyState("flask", "Pick a compound", "Choose something with a known half-life to see its plasma curve.", "")}</div>`;
  }
  const series = [{ color: "var(--accent)", points: a.result.pts }];
  let b = null;
  if (sim.compare && sim.compare !== sim.id) {
    const cb = getCompound(sim.compare);
    if (cb && Number(cb.pk?.halfLife) > 0) {
      b = curveSeries(cb, { ...sim, halfLife: Number(cb.pk.halfLife) });
      if (b) series.push({ color: "var(--good)", points: b.result.pts, dash: true });
    }
  }

  const maxT = Math.max(a.result.total, b?.result.total || 0);
  const step = maxT / 4;
  const ticks = [0, step, step * 2, step * 3, step * 4].map((t) => ({ x: t, label: `${Math.round(t)}h` }));

  const legend = `
    <div class="legend">
      <span><i style="background:var(--accent)"></i>${esc(a.c.name)}</span>
      ${b ? `<span><i style="background:var(--good)"></i>${esc(b.c.name)}</span>` : ""}
      <span class="dim">schematic units · Vd ${Math.round(sim.vd)} L</span>
    </div>`;

  return `<div class="card">
    <div class="card-head">
      <h3 style="font-size:14px">Plasma concentration</h3>
      <span class="spacer"></span>
      <span class="tiny mono dim">${sim.doses} × ${esc(sim.dose)} ${esc(sim.unit)} q${Math.round(sim.interval)}h</span>
    </div>
    ${lineChart(series, { height: 190, xTicks: ticks, yLabel: `${sim.unit}/L` })}
    ${legend}
  </div>`;
}

function simMetricsHtml() {
  const a = curveSeries(getCompound(sim.id), sim);
  if (!a) return "";
  const r = a.result;
  return `
  <div class="grid grid-4" style="gap:10px">
    ${statTile({ label: "C-max", value: `${r.cmax.toFixed(2)}`, sub: `${sim.unit}/L` })}
    ${statTile({ label: "T-max", value: fmtH(r.tmax), sub: "model, not reference" })}
    ${statTile({ label: "Accumulation", value: `${r.acc.toFixed(2)}×`, sub: `q${Math.round(sim.interval)}h` })}
    ${statTile({ label: "Steady state", value: fmtH(a.halfLife * 5), sub: "≈5 half-lives" })}
  </div>`;
}

function simBody() {
  return `${simChartHtml()}
  <div style="margin-top:12px">${simMetricsHtml()}</div>`;
}

export const lab = {
  render(ctx) {
    if (ctx.query.compound && ctx.query.compound !== sim.id) loadCompound(ctx.query.compound);
    if (!sim.id) loadCompound(sim.id || store.data.stack?.[0] || "caffeine");

    const c = getCompound(sim.id);
    const compareOptions = DOSE_COMPOUNDS.filter((x) => x.id !== sim.id);

    return `
    ${pageHead(
      "Lab",
      "Model plasma levels before you touch anything. Numbers are a schematic, not a prescription.",
      `<span class="row" style="gap:6px">
        <a class="btn ghost sm" href="#/lab/interactions">${icon("shield", 14)} Interactions</a>
        <a class="btn ghost sm" href="#/lab/taper">${icon("scale", 14)} Taper</a>
      </span>`
    )}

    <div class="split">
      <div class="stack" style="gap:14px">
        <div class="card">
          <div class="stack" style="gap:12px">
            <label class="field">Compound
              <select class="select" id="sim-c">
                ${DOSE_COMPOUNDS.map((x) => `<option value="${esc(x.id)}" ${x.id === sim.id ? "selected" : ""}>${esc(x.name)} — t½ ${fmtH(Number(x.pk.halfLife))}</option>`).join("")}
              </select>
            </label>

            <div class="grid grid-2" style="gap:10px">
              <label class="field">Dose (${esc(sim.unit)})
                <input class="input" id="sim-dose" type="number" inputmode="decimal" min="1" max="20000" step="any" value="${sim.dose}">
              </label>
              <label class="field">Interval (h)
                <input class="input" id="sim-int" type="number" inputmode="numeric" min="0.5" max="168" step="0.5" value="${sim.interval}">
              </label>
              <label class="field">Number of doses
                <input class="input" id="sim-n" type="number" inputmode="numeric" min="1" max="60" step="1" value="${sim.doses}">
              </label>
              <label class="field">Half-life (h)
                <input class="input" id="sim-hl" type="number" inputmode="decimal" min="0.1" max="400" step="0.1" value="${Math.round((sim.halfLife || Number(c?.pk?.halfLife) || 5) * 10) / 10}">
              </label>
            </div>

            <label class="field">Compare with (optional)
              <select class="select" id="sim-cmp">
                <option value="">No comparison</option>
                ${compareOptions.map((x) => `<option value="${esc(x.id)}" ${sim.compare === x.id ? "selected" : ""}>${esc(x.name)} — t½ ${fmtH(Number(x.pk.halfLife))}</option>`).join("")}
              </select>
            </label>

            <div class="row wrap" style="gap:6px">
              ${[
                ["q8h", 8],
                ["q12h", 12],
                ["q24h", 24],
                ["Weekly", 168],
              ]
                .map(([label, h]) => `<button class="chip chip-btn ${sim.interval === h ? "on" : ""}" data-int="${h}">${label}</button>`)
                .join("")}
              <button class="btn ghost sm" data-act="reset" style="margin-left:auto">${icon("refresh", 13)} Reset</button>
            </div>

            ${c ? `<div class="divider"></div>
            <div class="row wrap" style="gap:6px">
              <a class="chip chip-btn" href="#/compounds/${esc(c.id)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.name)}</a>
              ${evidenceChip(c.evidence)}
              <span class="chip">${esc(c.cls)}</span>
            </div>` : ""}
          </div>
        </div>

        <div id="sim-out">${simBody()}</div>

        <div class="card tight">
          <div class="eyebrow" style="margin-bottom:6px">Model honesty</div>
          <p class="small muted" style="line-height:1.6">
            One compartment, first-order absorption and elimination, no protein binding, no active metabolites, no saturation.
            Real kinetics can differ several-fold between people — CYP polymorphisms alone move plasma levels by an order of magnitude.
          </p>
        </div>
      </div>

      <aside class="col sticky-side" style="gap:14px">
        ${c ? `<div class="card">
          <div class="eyebrow" style="margin-bottom:7px">Reference kinetics</div>
          <dl class="kv">
            <dt>Half-life</dt><dd>${c.pk.halfLife ? fmtH(Number(c.pk.halfLife)) : "—"}</dd>
            <dt>T-max</dt><dd>${c.pk.tmax ? fmtH(Number(c.pk.tmax)) : "—"}</dd>
            <dt>Duration</dt><dd>${c.pk.duration ? fmtH(Number(c.pk.duration)) : "—"}</dd>
            <dt>Metabolism</dt><dd>${esc(c.pk.metabolism || "—")}</dd>
            <dt>Excretion</dt><dd>${esc(c.pk.excretion || "—")}</dd>
          </dl>
          ${(c.doses || []).length ? `<div class="divider"></div><div class="eyebrow" style="margin-bottom:6px">Literature doses</div>
          <div class="stack" style="gap:5px">${c.doses
            .map((d) => `<div class="row between tiny"><span class="muted">${esc(d.route || "oral")}</span><span class="mono">${esc(d.low)}${d.high && d.high !== d.low ? `–${esc(d.high)}` : ""} ${esc(d.unit || "mg")}</span></div>`)
            .join("")}</div>` : ""}
        </div>` : ""}

        ${c ? `<div>${callout("warn", "Half-life is not duration", "A compound can feel active long after plasma levels fall — or feel inactive while levels are high. Effects and kinetics are different questions.")}</div>` : ""}
      </aside>
    </div>`;
  },

  mount(root) {
    const out = root.querySelector("#sim-out");
    const setVal = (sel, v) => {
      const el = root.querySelector(sel);
      if (el) el.value = String(v);
    };
    const repaint = () => {
      if (out) out.innerHTML = simBody();
      root.querySelectorAll("[data-int]").forEach((b) => b.classList.toggle("on", Number(b.dataset.int) === sim.interval));
    };

    root.querySelector("#sim-c")?.addEventListener("change", (ev) => {
      loadCompound(ev.target.value);
      const hl = root.querySelector("#sim-hl");
      if (hl) hl.value = String(Math.round(sim.halfLife * 10) / 10);
      const dose = root.querySelector("#sim-dose");
      if (dose) dose.value = String(sim.dose);
      const int = root.querySelector("#sim-int");
      if (int) int.value = String(sim.interval);
      repaint();
    });

    root.querySelector("#sim-dose")?.addEventListener("input", (ev) => {
      sim.dose = clamp(Number(ev.target.value) || 1, 1, 5000);
      repaint();
    });
    root.querySelector("#sim-int")?.addEventListener("input", (ev) => {
      sim.interval = clamp(Number(ev.target.value) || 1, 0.5, 336);
      repaint();
    });
    root.querySelector("#sim-n")?.addEventListener("input", (ev) => {
      sim.doses = Math.round(clamp(Number(ev.target.value) || 1, 1, 60));
      repaint();
    });
    root.querySelector("#sim-hl")?.addEventListener("input", (ev) => {
      sim.halfLife = clamp(Number(ev.target.value) || 1, 0.1, 400);
      repaint();
    });
    root.querySelector("#sim-cmp")?.addEventListener("change", (ev) => {
      sim.compare = ev.target.value;
      repaint();
    });

    root.addEventListener("click", (ev) => {
      const intBtn = ev.target.closest("[data-int]");
      if (intBtn) {
        sim.interval = Number(intBtn.dataset.int);
        const input = root.querySelector("#sim-int");
        if (input) input.value = String(sim.interval);
        repaint();
      }
      if (ev.target.closest('[data-act="reset"]')) {
        sim.compare = "";
        loadCompound(sim.id || "caffeine");
        setVal("#sim-cmp", "");
        setVal("#sim-dose", sim.dose);
        setVal("#sim-int", sim.interval);
        setVal("#sim-n", sim.doses);
        setVal("#sim-hl", Math.round(sim.halfLife * 10) / 10);
        repaint();
        toast("Simulator reset", "info");
      }
    });
  },
};

/* ------------------------------------------------------------------ */
/* Interaction checker                                                 */
/* ------------------------------------------------------------------ */

const PICKABLE = [...COMPOUNDS, ...EXTRA_SUBSTANCES].sort((a, b) => a.name.localeCompare(b.name));
const PICK_INDEX = new Map(PICKABLE.map((x) => [x.id, x]));
const check = { ids: [] };

function substanceOf(id) {
  return PICK_INDEX.get(id) || COMPOUND_BY_ID.get(id) || null;
}

function addSubstance(id) {
  const s = substanceOf(id);
  if (!s || check.ids.includes(s.id)) return false;
  check.ids.push(s.id);
  return true;
}

function findingsHtml() {
  const subs = check.ids.map(substanceOf).filter(Boolean);
  if (subs.length < 2) {
    return `<div class="card">${emptyState(
      "shield",
      "Add at least two substances",
      `The engine combines ${PAIR_RULES.length} explicit pair rules with class-level flag rules, so unstudied combinations still surface risk.`,
      `<a class="btn soft sm" href="#/compounds">${icon("search", 14)} Browse compounds</a>`
    )}</div>`;
  }
  const findings = checkInteractions(subs);
  if (!findings.length) {
    return `<div class="card">
      ${emptyState("check", "No known interaction", "Nothing in the rule base links these substances. That means “not documented”, not “safe” — unstudied combinations are the norm, not the exception.")}
    </div>`;
  }
  const groups = ["critical", "major", "moderate", "minor"];
  return groups
    .map((sev) => {
      const list = findings.filter((f) => f.severity === sev);
      if (!list.length) return "";
      const tone = sev === "critical" ? "crit" : sev === "major" ? "bad" : sev === "moderate" ? "warn" : "";
      return `<section class="block" style="margin-bottom:18px">
        <div class="block-head" style="margin-bottom:8px">
          <div class="row" style="gap:7px">
            <span class="chip chip-${tone}">${esc(SEVERITY[sev].label)}</span>
            <span class="tiny dim">${list.length} finding${list.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div class="stack" style="gap:8px">
          ${list
            .map(
              (f) => `<div class="card tight" style="border-left:2.5px solid var(--${sev === "critical" ? "critical" : sev === "major" ? "bad" : sev === "moderate" ? "warn" : "line"});border-radius:0 12px 12px 0">
                <div class="row between" style="align-items:flex-start;gap:8px;margin-bottom:4px">
                  <strong style="font-size:13.5px;line-height:1.35">${esc(f.title)}</strong>
                  ${f.source === "class" ? `<span class="tag nowrap" title="Derived from class flags, not a documented pair">class rule</span>` : ""}
                </div>
                <div class="tiny dim" style="margin-bottom:6px;font-family:var(--mono)">${esc(f.a)} × ${esc(f.b)}</div>
                <p class="small muted" style="line-height:1.55;margin-bottom:6px">${esc(f.mechanism)}</p>
                <div class="row top" style="gap:6px">
                  <span style="color:var(--accent);flex:none;margin-top:2px">${icon("info", 13)}</span>
                  <p class="tiny" style="color:#c3b9ff;line-height:1.5">${esc(f.advice)}</p>
                </div>
              </div>`
            )
            .join("")}
        </div>
      </section>`;
    })
    .join("");
}

function summaryHtml() {
  const subs = check.ids.map(substanceOf).filter(Boolean);
  if (subs.length < 2) return "";
  const findings = checkInteractions(subs);
  const worst = worstSeverity(findings);
  if (!worst) return `<div class="card tight"><div class="row" style="gap:8px"><span style="color:var(--good)">${icon("check", 15)}</span><span class="small muted">No findings for ${subs.length} substances.</span></div></div>`;
  const map = {
    critical: ["danger", "Do not combine", "This stack contains a contraindicated pairing."],
    major: ["warn", "High risk", "At least one pairing needs clinical supervision."],
    moderate: ["info", "Moderate risk", "Manageable, but timing and monitoring matter."],
    minor: ["info", "Minor signals", "Worth knowing; unlikely to be dangerous alone."],
  };
  const [kind, title, body] = map[worst];
  return callout(kind, title, `${findings.length} finding${findings.length === 1 ? "" : "s"} across ${subs.length} substances. ${body}`);
}

export const interactions = {
  render(ctx) {
    const add = ctx.query.add ? String(ctx.query.add).toLowerCase() : "";
    if (add && check.lastAdd !== add) {
      addSubstance(add);
      check.lastAdd = add;
    }

    return `
    <div class="row" style="margin-bottom:12px">${backLink("#/lab", "Lab")}</div>
    ${pageHead(
      "Interaction checker",
      "Two layers: documented pair rules, then class-flag rules for everything unstudied.",
      `<button class="btn ghost sm" data-act="stack">${icon("plus", 14)} Load my stack</button>`
    )}

    <div class="card" style="margin-bottom:14px">
      <div class="stack" style="gap:10px">
        <div class="search-input">
          ${icon("search", 16)}
          <input class="input" id="int-q" type="search" placeholder="Type a compound name…" autocomplete="off" enterkeyhint="add">
        </div>
        <div class="row wrap" id="int-suggest" style="gap:5px"></div>
        <div class="row wrap" id="int-chips" style="gap:6px">
          ${check.ids
            .map((id) => {
              const s = substanceOf(id);
              if (!s) return "";
              const extra = EXTRA_SUBSTANCES.some((x) => x.id === id);
              return `<button class="chip chip-btn on" data-remove="${esc(id)}" title="Remove">${esc(s.name)} ${icon("x", 11)}${extra ? "" : ""}</button>`;
            })
            .join("") || `<span class="tiny dim">Nothing selected yet.</span>`}
        </div>
        <div class="divider" style="margin:2px 0"></div>
        <div class="eyebrow">Quick add</div>
        <div class="row wrap" style="gap:5px" id="int-quick">
          ${EXTRA_SUBSTANCES.map((s) => `<button class="chip chip-btn ${check.ids.includes(s.id) ? "on" : ""}" data-add="${esc(s.id)}">${esc(s.name)}</button>`).join("")}
          ${(store.data.stack || [])
            .map((id) => {
              const s = substanceOf(id);
              return s ? `<button class="chip chip-btn ${check.ids.includes(id) ? "on" : ""}" data-add="${esc(id)}"><span class="dot" style="background:${classColor(s.cls)}"></span>${esc(s.name)}</button>` : "";
            })
            .join("")}
        </div>
        <div class="row" style="gap:8px">
          <button class="btn ghost sm" data-act="clear">${icon("trash", 13)} Clear all</button>
          <span class="tiny dim">${check.ids.length} selected</span>
        </div>
      </div>
    </div>

    <div id="int-out" class="stack" style="gap:14px">
      <div id="int-summary">${summaryHtml()}</div>
      <div id="int-findings">${findingsHtml()}</div>
    </div>

    <div style="margin-top:20px">
      <div class="card tight">
        <div class="row top" style="gap:8px">
          <span style="color:var(--warn);flex:none;margin-top:1px">${icon("alert", 15)}</span>
          <p class="tiny dim" style="line-height:1.6">
            This engine encodes well-described pharmacology. It cannot see your genetics, kidneys, liver, blood pressure or the drug you forgot to mention.
            A clean result is a starting point for a conversation, not a clearance to combine anything.
          </p>
        </div>
      </div>
    </div>

    <section class="block" style="margin-top:22px">
      <div class="row between" style="margin-bottom:10px;gap:8px">
        <div>
          <div class="eyebrow">Reference</div>
          <strong style="font-size:16px">Phenomena glossary</strong>
        </div>
        <span class="tiny dim nowrap">${PHENOMENA.length} terms</span>
      </div>
      <div class="search-input" style="margin-bottom:10px">
        ${icon("search", 16)}
        <input class="input" id="phen-q" type="search" placeholder="Filter terms — withdrawal, QT, CYP…" autocomplete="off">
      </div>
      <div class="stack" id="phen-list" style="gap:8px">
        ${PHENOMENA.map(
          (p) => `<details class="card tight phen" data-phen="${esc((p.name + " " + p.tags.join(" ") + " " + p.body).toLowerCase())}">
            <summary class="row between" style="gap:8px;cursor:pointer">
              <strong style="font-size:13.5px;line-height:1.4">${esc(p.name)}</strong>
              <span class="row wrap" style="gap:4px;justify-content:flex-end">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</span>
            </summary>
            <p class="small muted" style="line-height:1.6;margin-top:8px">${esc(p.body)}</p>
          </details>`
        ).join("")}
      </div>
      <div class="tiny dim" id="phen-none" hidden style="margin-top:8px">No matching term.</div>
    </section>`;
  },

  mount(root) {
    const outSummary = root.querySelector("#int-summary");
    const outFindings = root.querySelector("#int-findings");
    const chips = root.querySelector("#int-chips");
    const quick = root.querySelector("#int-quick");
    const suggest = root.querySelector("#int-suggest");
    const input = root.querySelector("#int-q");

    const paint = () => {
      outSummary.innerHTML = summaryHtml();
      outFindings.innerHTML = findingsHtml();
      chips.innerHTML =
        check.ids
          .map((id) => {
            const s = substanceOf(id);
            return s ? `<button class="chip chip-btn on" data-remove="${esc(id)}">${esc(s.name)} ${icon("x", 11)}</button>` : "";
          })
          .join("") || `<span class="tiny dim">Nothing selected yet.</span>`;
      quick.querySelectorAll("[data-add]").forEach((b) => b.classList.toggle("on", check.ids.includes(b.dataset.add)));
      const count = root.querySelector("[data-act=clear]")?.parentElement?.querySelector(".tiny");
      if (count) count.textContent = `${check.ids.length} selected`;
    };

    input?.addEventListener("input", () => {
      const q = input.value.trim();
      if (!q) {
        suggest.innerHTML = "";
        return;
      }
      const hits = searchCompounds(q).slice(0, 6);
      suggest.innerHTML = hits
        .map((c) => `<button class="chip chip-btn" data-add="${esc(c.id)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.name)}</button>`)
        .join("") || `<span class="tiny dim">No match</span>`;
    });

    input?.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      const s = resolveCompound(input.value);
      if (s && addSubstance(s.id)) {
        input.value = "";
        suggest.innerHTML = "";
        paint();
      }
    });

    root.addEventListener("click", (ev) => {
      const add = ev.target.closest("[data-add]");
      if (add) {
        if (addSubstance(add.dataset.add)) paint();
        return;
      }
      const rm = ev.target.closest("[data-remove]");
      if (rm) {
        check.ids = check.ids.filter((x) => x !== rm.dataset.remove);
        paint();
        return;
      }
      if (ev.target.closest('[data-act="clear"]')) {
        check.ids = [];
        paint();
        return;
      }
      if (ev.target.closest('[data-act="stack"]')) {
        const stack = store.data.stack || [];
        if (!stack.length) {
          toast("Your stack is empty", "warn");
          return;
        }
        for (const id of stack) addSubstance(id);
        paint();
        toast(`Loaded ${stack.length} from your stack`, "success");
      }
    });

    const phenQ = root.querySelector("#phen-q");
    phenQ?.addEventListener("input", () => {
      const q = phenQ.value.trim().toLowerCase();
      let shown = 0;
      root.querySelectorAll("[data-phen]").forEach((el) => {
        const hit = !q || el.dataset.phen.includes(q);
        el.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      const none = root.querySelector("#phen-none");
      if (none) none.hidden = shown > 0;
    });
  },
};