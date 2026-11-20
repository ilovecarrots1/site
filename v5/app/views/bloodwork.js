/* ==========================================================================
   Bloodwork view — manual entry, universal reference intervals,
   red → green → red gauge, unit switching, trend history, log scale,
   and the compounds expected to move each marker.
   ========================================================================== */

import { esc, icon, store, toast, uid, dayKey } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import {
  MARKERS,
  MARKER_BY_ID,
  MARKER_GROUPS,
  MARKER_STATS,
  gaugePos,
  gaugeValue,
  refIn,
  unitsFor,
  toUnit,
  fromUnit,
  roundFor,
  zoneOf,
  markersForCompound,
} from "../data/bloodwork.js";

/* ------------------------------------------------------------------ state */

function labs() {
  if (!store.data.labs || typeof store.data.labs !== "object") store.data.labs = {};
  return store.data.labs;
}

function history(id) {
  const all = labs()[id];
  return Array.isArray(all) ? all.slice().sort((a, b) => a.t - b.t) : [];
}

function latest(id) {
  const h = history(id);
  return h.length ? h[h.length - 1] : null;
}

function pushReading(id, value, unit) {
  const map = labs();
  const arr = Array.isArray(map[id]) ? map[id] : (map[id] = []);
  const last = arr[arr.length - 1];
  const stamp = Date.now();
  // Same value twice within a minute is a typo, not a new reading.
  if (last && Math.abs(last.v - value) < 1e-9 && stamp - last.t < 60000) return;
  arr.push({ t: stamp, v: value, u: unit || MARKER_BY_ID.get(id)?.unit || "" });
  if (arr.length > 120) arr.splice(0, arr.length - 120);
  store.save();
}

/* ------------------------------------------------------------------ charts */

function spark(entries, w, h, log) {
  if (!entries.length) return "";
  const vals = entries.map((e) => e.v);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (log && lo > 0) {
    lo = Math.log10(lo);
    hi = Math.log10(hi);
  }
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const x = (i) => (entries.length === 1 ? w / 2 : (i / (entries.length - 1)) * (w - 2) + 1);
  const y = (v) => {
    const t = log && v > 0 ? Math.log10(v) : v;
    return h - 2 - ((t - lo) / (hi - lo)) * (h - 4);
  };
  const pts = entries.map((e, i) => `${x(i).toFixed(1)},${y(e.v).toFixed(1)}`).join(" ");
  const dots = entries
    .map((e, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(e.v).toFixed(1)}" r="1.8" fill="currentColor" opacity="0.85" />`)
    .join("");
  return `<svg class="bw-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" />${dots}
  </svg>`;
}

/* ------------------------------------------------------------------ gauge */

function gauge(marker, value, unit) {
  const u = unit || marker.unit;
  const ref = refIn(marker, u);
  const shown = value == null ? null : toUnit(marker, value, u);
  const p = shown == null ? null : gaugePos(marker, shown);
  const z = zoneOf(marker, shown);
  return `<div class="bw-gauge" data-tone="${esc(z.tone)}">
    <div class="bw-track" style="--p:${p == null ? 0 : p.toFixed(2)}">
      <div class="bw-band bw-band-lo"></div>
      <div class="bw-band bw-band-ok"></div>
      <div class="bw-band bw-band-hi"></div>
      ${p == null ? "" : `<div class="bw-pin" style="left:calc(var(--p) * 1%)"></div>`}
    </div>
    <div class="bw-gauge-scale tiny dim">
      <span>${esc(roundFor(marker, ref.low - (ref.high - ref.low) * 0.75))}</span>
      <span class="bw-ref">${esc(roundFor(marker, ref.low))} – ${esc(roundFor(marker, ref.high))} ${esc(u)}</span>
      <span>${esc(roundFor(marker, ref.high + (ref.high - ref.low) * 0.75))}</span>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ rows */

function row(marker) {
  const last = latest(marker.id);
  const u = (last && last.u) || marker.unit;
  const shown = last ? toUnit(marker, last.v, u) : null;
  const z = zoneOf(marker, shown);
  const h = history(marker.id);
  return `<div class="bw-row" data-marker="${esc(marker.id)}" data-search="${esc(
    [marker.name, (marker.aka || []).join(" "), marker.group, marker.unit].join(" ").toLowerCase()
  )}">
    <div class="bw-row-id">
      <a class="bw-row-name" href="#/bloodwork/${esc(marker.id)}">${esc(marker.name)}</a>
      <span class="bw-row-meta tiny dim">${esc(marker.group)} · ref ${esc(roundFor(marker, marker.ref.low))}–${esc(
    roundFor(marker, marker.ref.high)
  )} ${esc(marker.unit)}</span>
    </div>
    <div class="bw-row-entry">
      <input class="input bw-input" type="number" step="any" inputmode="decimal" placeholder="—"
        value="${shown == null ? "" : esc(roundFor(marker, shown))}"
        aria-label="${esc(marker.name)} value in ${esc(u)}" data-unit="${esc(u)}" />
      <span class="bw-unit tiny dim">${esc(u)}</span>
    </div>
    <div class="bw-row-gauge">${gauge(marker, last ? last.v : null, u)}</div>
    <div class="bw-row-tail">
      <span class="bw-zone tiny" data-tone="${esc(z.tone)}">${shown == null ? "—" : esc(z.label)}</span>
      ${h.length > 1 ? `<span class="bw-sparkwrap" title="${h.length} readings">${spark(h, 54, 18, false)}</span>` : ""}
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ index */

function indexHtml(ctx) {
  const q = (ctx && ctx.query) || {};
  const group = q.group ? String(q.group) : "";
  const filled = MARKERS.filter((m) => history(m.id).length).length;

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Personal tracking</div>
        <h1 class="page-title">Bloodwork</h1>
        <div class="page-sub">${MARKER_STATS.markers} markers in ${MARKER_STATS.groups} groups, one universal reference interval each. Type a value, watch it land on the scale, keep the history. Everything stays on this device.</div>
      </div>
      <div class="row wrap" style="gap:6px">
        <span class="chip chip-xs">${filled}/${MARKERS.length} entered</span>
      </div>
    </div>

    <div class="card tight bw-tools">
      <label class="cd-search">${icon("search", 16)}
        <input id="bw-q" type="search" inputmode="search" autocomplete="off" placeholder="Marker, alias or group…" />
      </label>
      <div class="chip-row" id="bw-groups">
        <button type="button" class="chip chip-btn ${group ? "" : "on"}" data-group="">All</button>
        ${MARKER_GROUPS.map(
          (g) =>
            `<button type="button" class="chip chip-btn ${group === g.name ? "on" : ""}" data-group="${esc(g.name)}">${esc(
              g.name
            )}</button>`
        ).join("")}
        <button type="button" class="chip chip-btn" id="bw-abnormal" aria-pressed="false">Out of range only</button>
      </div>
    </div>

    ${MARKER_GROUPS.map(
      (g) => `<section class="bw-group" data-group-block="${esc(g.name)}">
        <div class="bw-group-head">
          <h2>${esc(g.name)}</h2>
          <span class="tiny dim">${esc(g.note)}</span>
        </div>
        ${g.items.map(row).join("")}
      </section>`
    ).join("")}

    <div class="cd-empty hide" id="bw-empty">Nothing matched that filter.</div>

    <div class="callout" style="margin-top:16px">
      <b>Reference intervals, not targets.</b> Labs use different assays and intervals, and timing changes results — draw fasted, in the morning, and at least 48 h after hard training. Values here are adult general-population ranges kept universal on purpose; where male and female physiology differ the marker note says so.
    </div>
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

  const search = root.querySelector("#bw-q");
  const empty = root.querySelector("#bw-empty");
  const abnormalBtn = root.querySelector("#bw-abnormal");
  let group = ((ctx && ctx.query && ctx.query.group) || "").toString();
  let abnormal = false;

  function apply() {
    const term = (search && search.value || "").trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll(".bw-group").forEach((block) => {
      const name = block.getAttribute("data-group-block");
      const inGroup = !group || group === name;
      let n = 0;
      block.querySelectorAll(".bw-row").forEach((r) => {
        const hay = r.getAttribute("data-search") || "";
        const tone = r.querySelector(".bw-zone");
        const isAbn = tone && tone.getAttribute("data-tone") === "bad";
        const ok = inGroup && (!term || hay.includes(term)) && (!abnormal || isAbn);
        r.classList.toggle("hide", !ok);
        if (ok) n++;
      });
      block.classList.toggle("hide", n === 0);
      shown += n;
    });
    empty.classList.toggle("hide", shown > 0);
  }

  if (search) {
    let t = 0;
    search.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(apply, 80);
    });
  }

  root.querySelectorAll("[data-group]").forEach((b) =>
    b.addEventListener("click", () => {
      group = b.getAttribute("data-group") || "";
      root.querySelectorAll("[data-group]").forEach((x) => x.classList.toggle("on", x === b));
      apply();
    })
  );

  if (abnormalBtn)
    abnormalBtn.addEventListener("click", () => {
      abnormal = !abnormal;
      abnormalBtn.classList.toggle("on", abnormal);
      abnormalBtn.setAttribute("aria-pressed", String(abnormal));
      apply();
    });

  root.querySelectorAll(".bw-row").forEach((r) => {
    const markerId = r.getAttribute("data-marker");
    const marker = MARKER_BY_ID.get(markerId);
    const input = r.querySelector(".bw-input");
    if (!marker || !input) return;
    let t = 0;
    const commit = () => {
      const raw = parseFloat(String(input.value).replace(",", "."));
      if (!isFinite(raw)) return;
      const unit = input.getAttribute("data-unit") || marker.unit;
      const base = fromUnit(marker, raw, unit);
      pushReading(marker.id, base, unit);
      const z = zoneOf(marker, raw);
      const zoneEl = r.querySelector(".bw-zone");
      if (zoneEl) {
        zoneEl.textContent = z.label;
        zoneEl.setAttribute("data-tone", z.tone);
      }
      const g = r.querySelector(".bw-gauge");
      if (g) {
        const wrap = document.createElement("div");
        wrap.innerHTML = gauge(marker, base, unit);
        g.replaceWith(wrap.firstElementChild);
      }
      const tail = r.querySelector(".bw-row-tail");
      if (tail) {
        const h = history(marker.id);
        const old = tail.querySelector(".bw-sparkwrap");
        if (h.length > 1) {
          if (old) old.innerHTML = spark(h, 54, 18, false);
          else
            tail.insertAdjacentHTML("beforeend", `<span class="bw-sparkwrap" title="${h.length} readings">${spark(h, 54, 18, false)}</span>`);
        }
      }
    };
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(commit, 700);
    });
    input.addEventListener("change", () => {
      clearTimeout(t);
      commit();
    });
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      }
    });
  });

  apply();
}

/* ----------------------------------------------------------------- detail */

function pointRows(marker, entries, unit, log) {
  if (!entries.length) return `<div class="tiny dim">No readings yet.</div>`;
  return `<div class="bw-hist">
    ${entries
      .slice()
      .reverse()
      .map((e) => {
        const shown = toUnit(marker, e.v, unit);
        const z = zoneOf(marker, shown);
        const d = new Date(e.t);
        return `<div class="bw-hist-row">
          <span class="tiny dim mono">${esc(dayKey(d))}</span>
          <span class="bw-hist-val"><b>${esc(roundFor(marker, shown))}</b> <span class="tiny dim">${esc(unit)}</span></span>
          <span class="bw-zone tiny" data-tone="${esc(z.tone)}">${esc(z.label)}</span>
          <button type="button" class="icon-btn bw-del" data-del="${e.t}" aria-label="Delete reading">${icon("trash", 13)}</button>
        </div>`;
      })
      .join("")}
  </div>`;
}

function detail(id) {
  const m = MARKER_BY_ID.get(id);
  if (!m) {
    return `<div class="page-head"><div class="eyebrow">404</div><h1>No such marker</h1>
      <p>“${esc(id)}” is not in the marker index.</p></div>
      <a class="btn primary" href="#/bloodwork">Back to bloodwork</a>`;
  }
  const h = history(m.id);
  const last = h.length ? h[h.length - 1] : null;
  const unit = (last && last.u) || m.unit;
  const ref = refIn(m, unit);
  const pos = last ? gaugePos(m, toUnit(m, last.v, unit)) : 50;

  return `<div class="page">
    <a class="back-link" href="#/bloodwork">${icon("arrowLeft", 14)} All markers</a>

    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">${esc(m.group)}</div>
        <h1 class="page-title">${esc(m.name)}</h1>
        <div class="page-sub">${(m.aka || []).length ? esc((m.aka || []).join(" · ")) + " · " : ""}reference ${esc(
    roundFor(m, ref.low)
  )}–${esc(roundFor(m, ref.high))} ${esc(unit)}</div>
      </div>
      <div class="row wrap" style="gap:6px">
        ${unitsFor(m)
          .map(
            (u) =>
              `<button type="button" class="chip chip-btn ${u === unit ? "on" : ""}" data-unit="${esc(u)}">${esc(u)}</button>`
          )
          .join("")}
      </div>
    </div>

    <div class="card bw-hero">
      <div class="bw-hero-top">
        <div>
          <div class="tiny dim" style="letter-spacing:.12em;text-transform:uppercase">Latest</div>
          <div class="bw-hero-val" id="bw-val">${last ? esc(roundFor(m, toUnit(m, last.v, unit))) : "—"}<span class="tiny dim"> ${esc(
    unit
  )}</span></div>
        </div>
        <span class="bw-zone" id="bw-zone" data-tone="${esc(last ? zoneOf(m, toUnit(m, last.v, unit)).tone : "good")}">${
    last ? esc(zoneOf(m, toUnit(m, last.v, unit)).label) : "No reading"
  }</span>
      </div>

      <div class="bw-big" id="bw-big">${gauge(m, last ? last.v : null, unit)}</div>

      <div class="bw-slider">
        <input type="range" min="0" max="100" step="0.5" value="${pos == null ? 50 : pos.toFixed(1)}" id="bw-range"
          aria-label="Scrub a value on the scale" />
        <div class="bw-slider-actions">
          <span class="tiny dim">Drag to explore the scale, then save the reading.</span>
          <button type="button" class="btn soft sm" id="bw-save">${icon("plus", 13)} Save reading</button>
        </div>
      </div>
    </div>

    <div class="block">
      <div class="block-head"><h2>History</h2><div class="block-sub">${h.length} readings · kept on this device</div></div>
      <div class="card" id="bw-histcard">
        <div class="bw-chart" id="bw-chart"></div>
        <div class="row between" style="gap:8px;margin:4px 0 10px">
          <span class="tiny dim">${h.length ? "Oldest → newest" : ""}</span>
          <label class="tiny dim row" style="gap:6px;cursor:pointer">
            <input type="checkbox" id="bw-log" ${h.some((e) => e.v <= 0) ? "disabled" : ""} /> log scale
          </label>
        </div>
        <div id="bw-histlist">${pointRows(m, h, unit, false)}</div>
      </div>
    </div>

    <div class="cd-branch" style="margin-top:14px">
      <h3>${icon("zap", 14)} Compounds that move it</h3>
      <div class="cd-mini-row">
        ${(m.compounds || [])
          .map((cid) => {
            const c = COMPOUND_BY_ID.get(cid);
            if (!c) return "";
            return `<a class="chip chip-btn chip-xs" href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>`;
          })
          .join("") || `<span class="tiny dim">No compound links authored.</span>`}
      </div>
      <div class="tiny dim" style="margin-top:10px;line-height:1.55">${esc(m.note || "")}</div>
    </div>

    <div class="row" style="gap:8px;margin-top:16px">
      <a class="btn ghost sm" href="#/compounds">${icon("pill", 13)} Compounds</a>
      <a class="btn ghost sm" href="#/bloodwork">${icon("grid", 13)} All markers</a>
    </div>

    <div class="callout" style="margin-top:16px">
      <b>Education only.</b> One number never diagnoses anything. Reference intervals differ between labs and assays, and a result has to be read against symptoms, timing and other markers.
    </div>
  </div>`;
}

function mountDetail(root, ctx) {
  const m = MARKER_BY_ID.get(ctx.params.id);
  if (!m) return;
  let unit = ((latest(m.id) && latest(m.id).u) || m.unit).toString();
  const range = root.querySelector("#bw-range");
  const big = root.querySelector("#bw-big");
  const valEl = root.querySelector("#bw-val");
  const zoneEl = root.querySelector("#bw-zone");
  const histList = root.querySelector("#bw-histlist");
  const chart = root.querySelector("#bw-chart");
  const logBox = root.querySelector("#bw-log");
  let drafted = null;

  const repaint = () => {
    const h = history(m.id);
    const log = !!(logBox && logBox.checked);
    if (chart) chart.innerHTML = h.length ? spark(h, 320, 64, log) : `<div class="tiny dim">No readings yet.</div>`;
    if (histList) histList.innerHTML = pointRows(m, h, unit, log);
    if (valEl) valEl.innerHTML = `${h.length ? esc(roundFor(m, toUnit(m, h[h.length - 1].v, unit))) : "—"}<span class="tiny dim"> ${esc(unit)}</span>`;
    if (zoneEl) {
      const z = h.length ? zoneOf(m, toUnit(m, h[h.length - 1].v, unit)) : { tone: "good", label: "No reading" };
      zoneEl.textContent = z.label;
      zoneEl.setAttribute("data-tone", z.tone);
    }
    root.querySelectorAll(".bw-del").forEach((b) =>
      b.addEventListener("click", () => {
        const t = Number(b.getAttribute("data-del"));
        const map = labs();
        const arr = map[m.id] || [];
        map[m.id] = arr.filter((e) => e.t !== t);
        store.save();
        repaint();
      })
    );
  };

  const setScale = (value) => {
    const p = gaugePos(m, value);
    if (big) big.innerHTML = gauge(m, value, unit);
    if (zoneEl) {
      const z = zoneOf(m, value);
      zoneEl.textContent = z.label;
      zoneEl.setAttribute("data-tone", z.tone);
    }
    if (valEl) valEl.innerHTML = `${esc(roundFor(m, value))}<span class="tiny dim"> ${esc(unit)}</span>`;
    if (range && p != null) range.value = String(p.toFixed(1));
    drafted = value;
  };

  if (range)
    range.addEventListener("input", () => {
      const v = gaugeValue(m, Number(range.value));
      drafted = v;
      if (big) big.innerHTML = gauge(m, v, unit);
      if (valEl) valEl.innerHTML = `${esc(roundFor(m, v))}<span class="tiny dim"> ${esc(unit)}</span>`;
      if (zoneEl) {
        const z = zoneOf(m, v);
        zoneEl.textContent = z.label;
        zoneEl.setAttribute("data-tone", z.tone);
      }
    });

  const saveBtn = root.querySelector("#bw-save");
  if (saveBtn)
    saveBtn.addEventListener("click", () => {
      const v = drafted == null ? (latest(m.id) ? toUnit(m, latest(m.id).v, unit) : null) : drafted;
      if (v == null || !isFinite(v)) {
        toast("Pick a value first");
        return;
      }
      pushReading(m.id, fromUnit(m, v, unit), unit);
      toast(`Saved ${m.name} ${roundFor(m, v)} ${unit}`);
      repaint();
    });

  root.querySelectorAll("[data-unit]").forEach((b) =>
    b.addEventListener("click", () => {
      const u = b.getAttribute("data-unit");
      if (!u || u === unit) return;
      unit = u;
      root.querySelectorAll("[data-unit]").forEach((x) => x.classList.toggle("on", x === b));
      const h = history(m.id);
      const v = h.length ? toUnit(m, h[h.length - 1].v, unit) : null;
      if (v != null) setScale(v);
      repaint();
      history.replaceState(null, "", `#/bloodwork/${m.id}?u=${encodeURIComponent(unit)}`);
    })
  );

  if (logBox) logBox.addEventListener("change", repaint);

  const q = (ctx && ctx.query) || {};
  if (q.u && unitsFor(m).includes(String(q.u))) {
    unit = String(q.u);
    root.querySelectorAll("[data-unit]").forEach((x) => x.classList.toggle("on", x.getAttribute("data-unit") === unit));
  }

  repaint();
}

export default { render, mount };