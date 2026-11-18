/* Shared view helpers: page headers, cards, tiles, chips. */

import { esc, icon, evidenceChip, store } from "../core.js";
import { SEVERITY } from "../data/interactions.js";

export function pageHead(title, sub, action = "", eyebrow = "") {
  return `<header class="page-head">
    ${eyebrow ? `<div class="eyebrow" style="margin-bottom:6px">${esc(eyebrow)}</div>` : ""}
    <div class="row between top" style="gap:14px">
      <div style="min-width:0">
        <h1>${esc(title)}</h1>
        ${sub ? `<p>${sub}</p>` : ""}
      </div>
      ${action ? `<div class="row" style="flex:none">${action}</div>` : ""}
    </div>
  </header>`;
}

export function backLink(href, label = "Назад") {
  return `<a class="btn ghost sm" href="${esc(href)}" data-back="1">${icon("arrowLeft", 15)} ${esc(label)}</a>`;
}

export function statTile({ label, value, sub = "", iconName = "", tone = "" }) {
  return `<div class="card tight">
    <div class="row between" style="align-items:flex-start">
      <div class="stack-3" style="min-width:0">
        <div class="stat-label">${esc(label)}</div>
        <div class="stat-value ${tone}">${value}</div>
        ${sub ? `<div class="tiny dim" style="margin-top:2px">${sub}</div>` : ""}
      </div>
      ${iconName ? `<span class="dim" style="opacity:.7">${icon(iconName, 17)}</span>` : ""}
    </div>
  </div>`;
}

const CLASS_HUES = {
  Stimulant: "#f2b23e",
  Nootropic: "#8b7bff",
  Racetam: "#a78bfa",
  Peptide: "#6fb3ff",
  Adaptogen: "#4ade80",
  Herb: "#5ec98a",
  Antidepressant: "#3edbd3",
  Anxiolytic: "#77d26b",
  Sedative: "#6ee7b7",
  Psychedelic: "#c084fc",
  Dissociative: "#b388ff",
  Opioid: "#ff9f45",
  Cannabinoid: "#84cc16",
  "Mood stabiliser": "#f0abfc",
  Supplement: "#9aa6b2",
  Vitamin: "#a3e635",
  Amino: "#60a5fa",
  Hormone: "#fb923c",
  Depressant: "#94a3b8",
  Antipsychotic: "#f472b6",
  "Wakefulness agent": "#fbbf24",
};

export function classColor(cls) {
  if (CLASS_HUES[cls]) return CLASS_HUES[cls];
  let h = 0;
  for (const ch of String(cls || "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 62%)`;
}

export function compoundCard(c) {
  return `<a class="compound-card" href="#/compounds/${esc(c.id)}" style="--dot:${classColor(c.cls)}">
    <div class="row between" style="align-items:flex-start;gap:8px">
      <div style="min-width:0">
        <div class="cc-name">${esc(c.name)}</div>
        <div class="cc-cls">${esc(c.cls)}${c.subcls ? ` · ${esc(c.subcls)}` : ""}</div>
      </div>
      ${evidenceChip(c.evidence)}
    </div>
    <p class="cc-sum">${esc(c.summary)}</p>
    <div class="cc-foot">
      ${(c.tags || []).slice(0, 2).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}
      ${c.pk && c.pk.halfLife ? `<span class="tag">t½ ${esc(fmtHalf(c.pk.halfLife))}</span>` : ""}
    </div>
  </a>`;
}

function fmtHalf(h) {
  const n = Number(h);
  if (!Number.isFinite(n)) return "—";
  if (n < 1) return `${Math.round(n * 60)} мин`;
  if (n < 48) return `${Math.round(n * 10) / 10} ч`;
  return `${Math.round((n / 24) * 10) / 10} дн`;
}

export function severityChip(sev) {
  const meta = SEVERITY[sev] || SEVERITY.minor;
  const cls = sev === "critical" ? "crit" : sev === "major" ? "bad" : sev === "moderate" ? "warn" : "";
  return `<span class="chip chip-${cls}">${icon(sev === "critical" ? "alert" : "info", 12)} ${esc(meta.label)}</span>`;
}

export function sectionCard(title, body, action = "", sub = "") {
  return `<section class="card">
    <div class="card-head"><h3>${esc(title)}</h3><span class="spacer"></span>${action}</div>
    ${sub ? `<p class="small dim" style="margin:-6px 0 10px">${esc(sub)}</p>` : ""}
    ${body}
  </section>`;
}

export function chipRow(items, activeValue, dataAttr, { allLabel = "Все" } = {}) {
  return `<div class="row wrap" style="gap:6px">
    <button class="chip chip-btn ${!activeValue ? "on" : ""}" data-${dataAttr}="">${esc(allLabel)}</button>
    ${items
      .map((it) => {
        const value = typeof it === "string" ? it : it.value;
        const label = typeof it === "string" ? it : it.label;
        return `<button class="chip chip-btn ${activeValue === value ? "on" : ""}" data-${dataAttr}="${esc(value)}">${esc(label)}</button>`;
      })
      .join("")}
  </div>`;
}

/** Horizontal "meter" with a label and value text. */
export function metric(label, valueText, ratio, tone = "") {
  return `<div class="stack-3">
    <div class="row between tiny"><span class="muted">${esc(label)}</span><span class="mono dim">${esc(valueText)}</span></div>
    <div class="meter ${tone}"><i style="width:${Math.round(clamp01(ratio) * 100)}%"></i></div>
  </div>`;
}

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

let chartSeq = 0;

/** Catmull-Rom → cubic bezier. Low tension keeps PK peaks from overshooting. */
function smoothPath(pts, tension = 0.16) {
  if (!pts.length) return "";
  if (pts.length < 3) return pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export const TELEGRAM_URL = "https://t.me/+JXFyHEQJInVjNmFl";

/**
 * Free-access plate with the Telegram subscribe CTA.
 * Rendered on home, settings, drawer and sidebar footer. Dismissible once —
 * the flag lives in settings so it never comes back uninvited.
 */
export function subscribePlate({ compact = false, dismissible = true, force = false, note = "" } = {}) {
  if (!force && store.data.settings.subHidden && dismissible) return "";
  return `<div class="sub-plate ${compact ? "compact" : ""}" data-sub-plate>
    <span class="sp-ico">${icon("gift", compact ? 15 : 18)}</span>
    <div class="sp-copy">
      <b>Бесплатный доступ — ничего не закрыто</b>
      <span>${
        note ||
        "Все монографии, пути и квизы открыты. Подпишись на Telegram: новые препараты, учебные дропы и заметки о релизах."
      }</span>
    </div>
    <div class="sp-actions">
      <a class="btn tg ${compact ? "xs" : "sm"}" href="${TELEGRAM_URL}" target="_blank" rel="noopener noreferrer">
        ${icon("send", compact ? 13 : 14)} Подписаться
      </a>
      ${
        dismissible
          ? `<button class="icon-btn sp-close" data-sub-close aria-label="Скрыть плашку подписки" title="Скрыть">${icon("x", 15)}</button>`
          : ""
      }
    </div>
  </div>`;
}

/** One delegated listener per mount point; also persists the dismissal. */
export function wireSubscribe(root) {
  if (!root || root.dataset.subWired === "1") return;
  root.dataset.subWired = "1";
  root.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-sub-close]");
    if (!btn) return;
    const plate = btn.closest("[data-sub-plate]");
    if (!plate) return;
    plate.style.transition = "opacity .18s ease, transform .18s ease";
    plate.style.opacity = "0";
    plate.style.transform = "translateY(-4px)";
    setTimeout(() => plate.remove(), 190);
    try {
      store.update((d) => {
        d.settings.subHidden = true;
      });
      toast("Скрыто — вернуть можно в настройках", "info");
    } catch (e) {
      /* store failures must never break the click */
    }
  });
}

export function liveBadge(text = "live") {
  return `<span class="live-dot">${esc(text)}</span>`;
}

/** Vertical mechanism / pathway chain with animated links. */
export function mechFlow(steps, { animate = true } = {}) {
  return `<div class="mech">${steps
    .map(
      (s, i) => `
      ${i && animate ? `<div class="mech-link anim"></div>` : i ? `<div class="mech-link"></div>` : ""}
      <div class="mech-node" style="--i:${i}">
        <span class="mn-ico">${icon(s.icon || "target", 14)}</span>
        <div style="min-width:0">
          <div class="mn-t">${esc(s.title)}</div>
          ${s.sub ? `<div class="mn-s">${esc(s.sub)}</div>` : ""}
        </div>
      </div>`
    )
    .join("")}</div>`;
}

/** Horizontal bar list. rows: [{label, value, max, text, color}] */
export function barList(rows, { max = null } = {}) {
  const top = max || Math.max(...rows.map((r) => Number(r.value) || 0), 1);
  return `<div class="bars">${rows
    .map((r) => {
      const pct = Math.round(clamp01((Number(r.value) || 0) / top) * 100);
      return `<div class="bar-row" style="--bc:${r.color || "var(--accent)"}">
        <span class="dim" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.label)}</span>
        <div class="bar-track"><i style="width:${pct}%"></i></div>
        <span class="mono dim">${esc(r.text != null ? r.text : r.value)}</span>
      </div>`;
    })
    .join("")}</div>`;
}

export function orb(size = 54) {
  return `<span class="orb ${size <= 40 ? "sm" : ""}" aria-hidden="true"></span>`;
}

export function callout(kind, title, body) {
  const map = {
    danger: { ic: "alert", color: "var(--critical)", bg: "rgba(248,81,73,.08)", line: "rgba(248,81,73,.28)" },
    warn: { ic: "alert", color: "var(--warn)", bg: "rgba(210,153,34,.08)", line: "rgba(210,153,34,.26)" },
    ok: { ic: "check", color: "var(--good)", bg: "rgba(63,185,80,.08)", line: "rgba(63,185,80,.26)" },
    info: { ic: "info", color: "var(--ok)", bg: "rgba(111,179,255,.08)", line: "rgba(111,179,255,.26)" },
  };
  const m = map[kind] || map.info;
  return `<div class="callout callout-${esc(kind)}" style="display:flex;gap:10px;padding:11px 13px;border-radius:12px;background:${m.bg};border:1px solid ${m.line};font-size:12.5px;line-height:1.55">
    <span style="color:${m.color};flex:none;margin-top:1px">${icon(m.ic, 16)}</span>
    <div style="min-width:0"><strong style="color:${m.color};display:block;font-size:12.5px;margin-bottom:2px">${esc(title)}</strong>
    <span class="muted">${esc(body)}</span></div>
  </div>`;
}

/** Simple line chart from numeric series; pure SVG, responsive. */
export function lineChart(series, { width = 340, height = 140, yLabel = "", xTicks = [], yMax = null } = {}) {
  const uid = `ch${++chartSeq}`;
  const padL = 30;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const maxY = yMax || Math.max(...series.map((s) => Math.max(...s.points.map((p) => p.y))), 0.0001);
  const maxX = Math.max(...series.map((s) => Math.max(...s.points.map((p) => p.x))), 1);

  const sx = (x) => padL + (x / maxX) * w;
  const sy = (y) => padT + h - (y / maxY) * h;

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = padT + h - f * h;
      return `<line class="chart-grid" x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}"/>
      <text class="chart-axis" x="${padL - 5}" y="${(y + 2.5).toFixed(1)}" text-anchor="end">${(maxY * f).toFixed(f === 0 ? 0 : 1)}</text>`;
    })
    .join("");

  const paths = series
    .map((s, si) => {
      if (!s.points.length) return "";
      const pts = s.points.map((p) => [Number(sx(p.x).toFixed(1)), Number(sy(p.y).toFixed(1))]);
      const d = smoothPath(pts);
      const last = pts[pts.length - 1];
      const area = `${d} L${last[0]} ${padT + h} L${pts[0][0]} ${padT + h} Z`;
      const gid = `${uid}-${si}`;
      return `<defs>
          <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${s.color}" stop-opacity="0.34"/>
            <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="chart-area" d="${area}" fill="url(#${gid})"/>
        <path class="chart-line draw" pathLength="1" d="${d}" stroke="${s.color}" ${s.dash ? 'stroke-dasharray="3 3"' : ""}/>
        <circle class="chart-halo" cx="${last[0]}" cy="${last[1]}" r="5" fill="${s.color}" opacity="0.22"/>
        ${s.marker ? `<circle class="chart-dot" cx="${sx(s.marker.x).toFixed(1)}" cy="${sy(s.marker.y).toFixed(1)}" r="3.2" fill="${s.color}"/>` : ""}`;
    })
    .join("");

  const xLabels = xTicks
    .map((t) => `<text class="chart-axis" x="${sx(t.x).toFixed(1)}" y="${height - 5}" text-anchor="middle">${esc(t.label)}</text>`)
    .join("");

  return `<div class="chart-box"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(yLabel || "chart")}">
    ${gridLines}${paths}${xLabels}
    <line class="chart-grid" x1="${padL}" y1="${padT + h}" x2="${width - padR}" y2="${padT + h}"/>
    ${yLabel ? `<text class="chart-axis" x="${padL}" y="7" text-anchor="start">${esc(yLabel)}</text>` : ""}
  </svg></div>`;
}