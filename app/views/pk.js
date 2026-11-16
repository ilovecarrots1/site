/* ==========================================================================
   PK timeline — build a dose schedule, watch the plasma curve accumulate,
   overlay several compounds and read the steady-state numbers.
   ========================================================================== */

import { esc, icon, store, toast } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { scheduleCurve, doseTimes, accumulation, timeToSteady, readHalfLife } from "../lib/pk.js";

const COLORS = ["#F2B23E", "#59D3A8", "#8EA0FF", "#F27A5E", "#C79BF2", "#7FD1E8"];
const MAX_ROWS = 5;

function pkState() {
  if (!store.data.pk || typeof store.data.pk !== "object") store.data.pk = { days: 7, rows: [] };
  const s = store.data.pk;
  s.days = s.days || 7;
  if (!Array.isArray(s.rows)) s.rows = [];
  return s;
}

/* ------------------------------------------------------------------ chart */

function chartSvg(series, days, opts) {
  const w = 720;
  const h = 300;
  const pad = { l: 36, r: 12, t: 14, b: 26 };
  const totalH = days * 24;
  const flat = series.flatMap((s) => s.points);
  const yMax = Math.max(1.05, ...flat.map((p) => p.c));
  const x = (t) => pad.l + (t / totalH) * (w - pad.l - pad.r);
  const y = (c) => h - pad.b - (c / yMax) * (h - pad.t - pad.b);

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const gridX = [];
  for (let d = 0; d <= Math.ceil(days); d++) gridX.push(d * 24);

  const paths = series
    .map((s, i) => {
      const step = Math.max(1, Math.ceil(s.points.length / 700));
      let d = "";
      for (let k = 0; k < s.points.length; k += step) {
        const p = s.points[k];
        d += (d ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p.c).toFixed(1);
      }
      const last = s.points[s.points.length - 1];
      d += "L" + x(last.t).toFixed(1) + " " + y(last.c).toFixed(1);
      const pk = s.points.reduce((best, p) => (p.c > best.c ? p : best), s.points[0]);
      return `<g class="pk-series" data-i="${i}">
        <path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.95" />
        <circle cx="${x(pk.t).toFixed(1)}" cy="${y(pk.c).toFixed(1)}" r="3" fill="${s.color}" />
      </g>`;
    })
    .join("");

  const yLabels = gridY
    .map(
      (v) =>
        `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="currentColor" stroke-opacity="0.08" />
         <text x="${pad.l - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="currentColor" fill-opacity="0.45">${v === 0 ? "0" : v.toFixed(2)}</text>`
    )
    .join("");

  const xLabels = gridX
    .map(
      (t) =>
        `<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${pad.t}" y2="${h - pad.b}" stroke="currentColor" stroke-opacity="0.06" />
         <text x="${x(t).toFixed(1)}" y="${h - pad.b + 14}" text-anchor="middle" font-size="9" fill="currentColor" fill-opacity="0.45">d${Math.round(t / 24)}</text>`
    )
    .join("");

  const ss = opts && opts.steadyAt != null
    ? `<line x1="${x(opts.steadyAt).toFixed(1)}" x2="${x(opts.steadyAt).toFixed(1)}" y1="${pad.t}" y2="${h - pad.b}"
         stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 4" />
       <text x="${(x(opts.steadyAt) + 4).toFixed(1)}" y="${pad.t + 10}" font-size="9" fill="currentColor" fill-opacity="0.5">steady state</text>`
    : "";

  return `<div class="pk-chart">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Modelled plasma concentration over ${days} days">
      ${yLabels}${xLabels}${ss}${paths}
      <line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b}" y2="${h - pad.b}" stroke="currentColor" stroke-opacity="0.2" />
      <line x1="${pad.l}" x2="${pad.l}" y1="${pad.t}" y2="${h - pad.b}" stroke="currentColor" stroke-opacity="0.2" />
    </svg>
  </div>`;
}

/* ------------------------------------------------------------------ rows */

function compoundOptions(selected) {
  const groups = new Map();
  for (const c of COMPOUNDS) {
    if (!groups.has(c.cls)) groups.set(c.cls, []);
    groups.get(c.cls).push(c);
  }
  const out = [`<option value="">Add a compound…</option>`];
  for (const [cls, list] of Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push(`<optgroup label="${esc(cls)}">`);
    for (const c of list.slice().sort((a, b) => a.name.localeCompare(b.name))) {
      out.push(
        `<option value="${esc(c.id)}" ${selected === c.id ? "selected" : ""}>${esc(c.name)}${c.pk && c.pk.halfLife != null ? ` · t½ ${esc(String(c.pk.halfLife))} h` : " · t½ —"}</option>`
      );
    }
    out.push("</optgroup>");
  }
  return out.join("");
}

function rowHtml(row, i) {
  const c = COMPOUND_BY_ID.get(row.cid);
  const hl = c ? readHalfLife(c.pk) : { halfLife: null, known: false };
  return `<div class="pk-row" data-i="${i}" style="--c:${COLORS[i % COLORS.length]}">
    <div class="pk-row-head">
      <span class="pk-dot"></span>
      <a class="pk-row-name" href="#/compounds/${esc(row.cid)}">${esc(c ? c.name : row.cid)}</a>
      <span class="pk-hl tiny ${hl.known ? "dim" : "warn"}">${hl.known ? `t½ ${esc(String(hl.halfLife))} h` : "no t½ data"}</span>
      <button type="button" class="icon-btn pk-rm" data-rm="${i}" aria-label="Remove">${icon("x", 13)}</button>
    </div>
    <div class="pk-row-fields">
      <label class="pk-field"><span class="tiny dim">Dose</span>
        <input class="input" type="number" step="any" min="0" value="${esc(String(row.dose))}" data-f="dose" data-i="${i}" />
      </label>
      <label class="pk-field"><span class="tiny dim">Per day</span>
        <select class="select" data-f="perDay" data-i="${i}">
          ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(row.perDay) === n ? "selected" : ""}>${n}×</option>`).join("")}
        </select>
      </label>
      <label class="pk-field"><span class="tiny dim">First dose</span>
        <select class="select" data-f="firstHour" data-i="${i}">
          ${Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${Number(row.firstHour) === h ? "selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}
        </select>
      </label>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ build */

function buildSeries(state) {
  const days = Math.max(1, Math.min(30, Number(state.days) || 7));
  const series = [];
  const skipped = [];
  state.rows.forEach((row, i) => {
    const c = COMPOUND_BY_ID.get(row.cid);
    if (!c) return;
    const hl = readHalfLife(c.pk);
    if (!hl.known) {
      skipped.push(c.name);
      return;
    }
    const doseTimesArr = doseTimes({ days, perDay: row.perDay, firstHour: row.firstHour });
    const curve = scheduleCurve({
      halfLife: hl.halfLife,
      tmax: c.pk.tmax != null ? c.pk.tmax : undefined,
      dose: 1,
      doseTimes: doseTimesArr,
      days,
      step: (days * 24) / 700,
    });
    // Normalise to this compound's own single-dose peak so shapes compare.
    const single = scheduleCurve({
      halfLife: hl.halfLife,
      tmax: c.pk.tmax != null ? c.pk.tmax : undefined,
      dose: 1,
      doseTimes: [0],
      days: 1,
      step: 0.05,
    });
    const ref = single.cmax || 1;
    const points = curve.points.map((p) => ({ t: p.t, c: p.c / ref }));
    const every = 24 / Math.max(1, Number(row.perDay) || 1);
    series.push({
      id: c.id,
      name: c.name,
      color: COLORS[i % COLORS.length],
      halfLife: hl.halfLife,
      dose: Number(row.dose) || 0,
      unit: (c.doses && c.doses[0] && c.doses[0].unit) || "mg",
      points,
      cmax: curve.cmax / ref,
      tmax: curve.tmax,
      trough: curve.trough / ref,
      accumulation: accumulation(hl.halfLife, every),
      steadyAt: timeToSteady(hl.halfLife),
      every,
    });
  });
  return { series, skipped, days };
}

/* ------------------------------------------------------------------ view */

function outHtml(state) {
  const { series, skipped, days } = buildSeries(state);

  if (!state.rows.length) {
    return `<div class="pk-empty">
      ${icon("trend", 22)}
      <div>
        <b>No doses scheduled yet.</b>
        <div class="small dim" style="margin-top:4px">Pick a compound above. The curve is modelled from the half-life and tmax in its card, normalised so one single dose peaks at 1.00.</div>
      </div>
    </div>`;
  }

  if (!series.length) {
    return `<div class="pk-empty">
      ${icon("alert", 22)}
      <div><b>No half-life data for ${esc(skipped.join(", "))}.</b>
      <div class="small dim" style="margin-top:4px">A plasma curve needs an elimination half-life. Add a compound whose card carries one.</div></div>
    </div>`;
  }

  const legend = series
    .map(
      (s) => `<button type="button" class="chip chip-btn chip-xs" data-legend="${esc(s.id)}" style="--c:${s.color}">
        <span class="dot" style="background:${s.color}"></span>${esc(s.name)}
      </button>`
    )
    .join("");

  const rows = series
    .map(
      (s) => `<tr>
        <td><span class="dot" style="background:${s.color}"></span> ${esc(s.name)}</td>
        <td class="mono">${esc(s.dose)} <span class="tiny dim">${esc(s.unit)}</span></td>
        <td class="mono">${s.accumulation.toFixed(2)}×</td>
        <td class="mono">${s.cmax.toFixed(2)}</td>
        <td class="mono">${s.trough.toFixed(2)}</td>
        <td class="mono">${(s.steadyAt / 24).toFixed(1)} d</td>
      </tr>`
    )
    .join("");

  return `${chartSvg(series, days, { steadyAt: Math.max(...series.map((s) => s.steadyAt)) } as any)}
    <div class="row between wrap" style="gap:8px;margin-top:8px">
      <div class="chip-row">${legend}</div>
      <span class="tiny dim">y = relative to one single-dose peak</span>
    </div>

    <div class="table-wrap" style="margin-top:12px">
      <table class="pk-table">
        <thead><tr><th>Compound</th><th>Dose</th><th>Accumulation</th><th>Peak (steady)</th><th>Trough</th><th>Steady in</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${skipped.length ? `<div class="tiny warn" style="margin-top:8px">Skipped (no half-life in the data): ${esc(skipped.join(", "))}.</div>` : ""}

    <div class="callout" style="margin-top:12px">
      <b>A shape, not a lab value.</b> This is a one-compartment model with first-order absorption. It shows accumulation, troughs and how long a schedule takes to flatten out. Absolute concentrations need volume of distribution, bioavailability and formulation data that no card here carries, and real bodies are never one compartment.
    </div>`;
}

export function render(ctx) {
  const state = pkState();
  const q = (ctx && ctx.query) || {};
  if (q.add && COMPOUND_BY_ID.has(String(q.add)) && state.rows.length < MAX_ROWS) {
    if (!state.rows.some((r) => r.cid === String(q.add))) {
      const c = COMPOUND_BY_ID.get(String(q.add));
      const d = (c.doses && c.doses[0]) || {};
      state.rows.push({
        cid: c.id,
        dose: d.high != null ? d.high : d.low != null ? d.low : 100,
        perDay: 1,
        firstHour: 8,
      });
      store.save();
    }
  }

  const examples = ["caffeine", "sertraline", "lamotrigine", "melatonin"]
    .map((id) => COMPOUND_BY_ID.get(id))
    .filter(Boolean);

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Pharmacokinetics</div>
        <h1 class="page-title">PK timeline</h1>
        <div class="page-sub">Lay out a dose schedule, see the plasma curve build toward steady state, and overlay up to ${MAX_ROWS} compounds. Modelled from each card's half-life and tmax.</div>
      </div>
      <div class="chip-row">
        ${[3, 7, 14, 30].map((d) => `<button type="button" class="chip chip-btn ${Number(state.days) === d ? "on" : ""}" data-days="${d}">${d} d</button>`).join("")}
      </div>
    </div>

    <div class="pk-wrap">
      <div class="pk-side">
        <div class="card tight">
          <label class="pk-field" style="margin-bottom:10px">
            <span class="tiny dim">Add to the schedule</span>
            <select class="select" id="pk-add">${compoundOptions("")}</select>
          </label>

          <div id="pk-rows">${state.rows.map(rowHtml).join("") || `<div class="tiny dim">Nothing scheduled.</div>`}</div>

          <div class="pk-side-foot">
            <button type="button" class="btn ghost sm" id="pk-clear">${icon("trash", 13)} Clear</button>
            ${state.rows.length < MAX_ROWS ? `<span class="tiny dim">${MAX_ROWS - state.rows.length} slots free</span>` : `<span class="tiny warn">Schedule full</span>`}
          </div>
        </div>

        ${examples.length
          ? `<div class="card tight" style="margin-top:10px">
              <div class="tiny dim" style="margin-bottom:8px">Quick examples</div>
              <div class="chip-row">
                ${examples.map((c) => `<a class="chip chip-btn chip-xs" href="#/pk?add=${esc(c.id)}">${esc(c.name)}</a>`).join("")}
              </div>
            </div>`
          : ""}
      </div>

      <div class="pk-main">
        <div class="card" id="pk-out">${outHtml(state)}</div>
      </div>
    </div>
  </div>`;
}

export function mount(root) {
  const state = pkState();
  const out = root.querySelector("#pk-out");

  const repaint = () => {
    if (out) out.innerHTML = outHtml(state);
    const rowsEl = root.querySelector("#pk-rows");
    if (rowsEl) {
      rowsEl.innerHTML = state.rows.map(rowHtml).join("") || `<div class="tiny dim">Nothing scheduled.</div>`;
      bindRows();
    }
    const free = root.querySelector(".pk-side-foot .tiny");
    if (free && state.rows.length < MAX_ROWS) free.textContent = `${MAX_ROWS - state.rows.length} slots free`;
  };

  function bindRows() {
    root.querySelectorAll(".pk-rm").forEach((b) =>
      b.addEventListener("click", () => {
        state.rows.splice(Number(b.getAttribute("data-rm")), 1);
        store.save();
        repaint();
      })
    );
    root.querySelectorAll("[data-f]").forEach((el) => {
      const handler = () => {
        const i = Number(el.getAttribute("data-i"));
        const field = el.getAttribute("data-f");
        const row = state.rows[i];
        if (!row) return;
        row[field] = field === "dose" ? Math.max(0, parseFloat(el.value) || 0) : Number(el.value);
        store.save();
        if (field !== "dose") repaint();
        else {
          const o = root.querySelector("#pk-out");
          if (o) o.innerHTML = outHtml(state);
        }
      };
      el.addEventListener("change", handler);
      if (el.tagName === "INPUT") {
        let t = 0;
        el.addEventListener("input", () => {
          clearTimeout(t);
          t = setTimeout(handler, 400);
        });
      }
    });
  }

  bindRows();

  const add = root.querySelector("#pk-add");
  if (add)
    add.addEventListener("change", () => {
      const id = add.value;
      if (!id || !COMPOUND_BY_ID.has(id)) return;
      if (state.rows.some((r) => r.cid === id)) {
        toast("Already on the schedule");
        add.value = "";
        return;
      }
      if (state.rows.length >= MAX_ROWS) {
        toast(`Max ${MAX_ROWS} compounds`);
        add.value = "";
        return;
      }
      const c = COMPOUND_BY_ID.get(id);
      const d = (c.doses && c.doses[0]) || {};
      state.rows.push({ cid: id, dose: d.high != null ? d.high : d.low != null ? d.low : 100, perDay: 1, firstHour: 8 });
      store.save();
      add.value = "";
      repaint();
    });

  const clear = root.querySelector("#pk-clear");
  if (clear)
    clear.addEventListener("click", () => {
      state.rows = [];
      store.save();
      repaint();
    });

  root.querySelectorAll("[data-days]").forEach((b) =>
    b.addEventListener("click", () => {
      state.days = Number(b.getAttribute("data-days"));
      root.querySelectorAll("[data-days]").forEach((x) => x.classList.toggle("on", x === b));
      store.save();
      const o = root.querySelector("#pk-out");
      if (o) o.innerHTML = outHtml(state);
    })
  );
}

export default { render, mount };