/* ==========================================================================
   Bloodwork — index, unit conversion and gauge geometry.
   One universal reference interval per marker; where physiology differs the
   marker's `note` says so. Nothing here is a diagnosis or a target to chase.
   ========================================================================== */

import { COMPOUND_BY_ID } from "./compounds.js";
import { MARKERS_A } from "./bloodwork-a.js";
import { MARKERS_B } from "./bloodwork-b.js";

const RAW = [...MARKERS_A, ...MARKERS_B];

const seen = new Map();
for (const m of RAW) {
  if (!m || !m.id) continue;
  if (!seen.has(m.id)) seen.set(m.id, m);
}

/** Authored links are filtered so a stale id can never render as a dead chip. */
export const MARKERS = Array.from(seen.values()).map((m) => ({
  ...m,
  compounds: (m.compounds || []).filter((id) => COMPOUND_BY_ID.has(id)),
}));
export const MARKER_BY_ID = new Map(MARKERS.map((m) => [m.id, m]));
export const MARKER_COUNT = MARKERS.length;

const GROUP_ORDER = ["Liver", "Kidney", "Glucose", "Lipids", "Thyroid", "Hormones", "Inflammation", "Vitamins", "Electrolytes", "Blood count", "Muscle"];

const GROUP_NOTE = {
  Liver: "Enzymes and synthetic function. Exercise and alcohol move these as much as drugs do.",
  Kidney: "Filtration and muscle mass. Creatinine is the crudest of the three.",
  Glucose: "Fasting glucose plus the two markers that see insulin resistance first.",
  Lipids: "Particles that carry cholesterol. ApoB counts them; LDL-C estimates the load.",
  Thyroid: "TSH is the thermostat; FT4 and FT3 are the heat.",
  Hormones: "Timing matters more than the assay. Draw in the morning, fasted, rested.",
  Inflammation: "Acute-phase proteins. Everything here reacts to infection and to training.",
  Vitamins: "Stores and cofactors. Reference ranges describe the population, not the optimum.",
  Electrolytes: "Water and charge balance. Small absolute changes matter a lot.",
  "Blood count": "Cells and the oxygen they carry.",
  Muscle: "Muscle and cell turnover. Rest before testing or the numbers are noise.",
};

export const MARKER_GROUPS = GROUP_ORDER.filter((g) => MARKERS.some((m) => m.group === g)).map((g) => ({
  name: g,
  note: GROUP_NOTE[g] || "",
  items: MARKERS.filter((m) => m.group === g),
}));

export function markersForGroup(name) {
  return MARKERS.filter((m) => m.group === name);
}

/* ---- units ----------------------------------------------------------- */

/** Every unit this marker can be expressed in, primary first. */
export function unitsFor(marker) {
  return [marker.unit].concat((marker.alt || []).map((a) => a.unit));
}

/** Convert a value from the marker's primary unit into `unit`. */
export function toUnit(marker, value, unit) {
  if (!marker || value == null || !isFinite(value)) return NaN;
  if (!unit || unit === marker.unit) return value;
  const a = (marker.alt || []).find((x) => x.unit === unit);
  if (!a) return value;
  return value * a.factor;
}

/** Convert a value expressed in `unit` back to the primary unit. */
export function fromUnit(marker, value, unit) {
  if (!marker || value == null || !isFinite(value)) return NaN;
  if (!unit || unit === marker.unit) return value;
  const a = (marker.alt || []).find((x) => x.unit === unit);
  if (!a || !a.factor) return value;
  return value / a.factor;
}

/** Reference interval expressed in `unit`. */
export function refIn(marker, unit) {
  return { low: toUnit(marker, marker.ref.low, unit), high: toUnit(marker, marker.ref.high, unit) };
}

/* ---- gauge geometry -------------------------------------------------- */

/* The track is always 30% low band · 40% reference band · 30% high band, so
   the marker reads the same whatever the absolute span of the interval. */
const LOW_BAND = 30;
const REF_BAND = 40;
const HIGH_BAND = 30;

export function gaugeDomain(marker) {
  const { low, high } = marker.ref;
  const span = high - low || Math.abs(high) * 0.3 || 1;
  return { lowOuter: low - span * 0.75, highOuter: high + span * 0.75, low, high, span };
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Position of a value on the 0–100 gauge track. */
export function gaugePos(marker, value) {
  const d = gaugeDomain(marker);
  if (value == null || !isFinite(value)) return null;
  if (value <= d.low) return LOW_BAND * clamp01((value - d.lowOuter) / (d.low - d.lowOuter || 1));
  if (value <= d.high) return LOW_BAND + REF_BAND * clamp01((value - d.low) / (d.high - d.low || 1));
  return LOW_BAND + REF_BAND + HIGH_BAND * clamp01((value - d.high) / (d.highOuter - d.high || 1));
}

/** Inverse of gaugePos — used by the draggable slider. */
export function gaugeValue(marker, pct) {
  const d = gaugeDomain(marker);
  const p = clamp01(pct / 100) * 100;
  if (p <= LOW_BAND) return d.lowOuter + ((d.low - d.lowOuter) * p) / LOW_BAND;
  if (p <= LOW_BAND + REF_BAND) return d.low + ((d.high - d.low) * (p - LOW_BAND)) / REF_BAND;
  return d.high + ((d.highOuter - d.high) * (p - LOW_BAND - REF_BAND)) / HIGH_BAND;
}

/** Rounding that respects the magnitude of the marker. */
export function roundFor(marker, value) {
  if (!isFinite(value)) return "";
  const a = Math.abs(value);
  if (a >= 1000) return Math.round(value).toString();
  if (a >= 100) return value.toFixed(0);
  if (a >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/0$/, "");
}

/**
 * Zone of a value against the reference interval, weighted by which side
 * actually matters for this marker.
 * @returns {{ key: "low"|"ok"|"high", tone: "warn"|"good"|"bad", label: string }}
 */
export function zoneOf(marker, value) {
  if (value == null || !isFinite(value)) return { key: "ok", tone: "good", label: "No value" };
  if (value < marker.ref.low) {
    const serious = marker.better === "high";
    return { key: "low", tone: serious ? "bad" : "warn", label: serious ? "Below reference" : "Below reference" };
  }
  if (value > marker.ref.high) {
    const serious = marker.better !== "high";
    return { key: "high", tone: serious ? "bad" : "warn", label: "Above reference" };
  }
  return { key: "ok", tone: "good", label: "In reference" };
}

/* ---- compound links -------------------------------------------------- */

/** Marker ids a compound is expected to shift (data-authored, not computed). */
export function markersForCompound(compoundId) {
  return MARKERS.filter((m) => (m.compounds || []).includes(compoundId));
}

export function markersForCompounds(ids) {
  const set = new Set(ids || []);
  return MARKERS.filter((m) => (m.compounds || []).some((id) => set.has(id)));
}

export const MARKER_STATS = {
  markers: MARKERS.length,
  groups: MARKER_GROUPS.length,
  links: MARKERS.reduce((n, m) => n + (m.compounds || []).length, 0),
};