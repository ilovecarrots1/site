/* ==========================================================================
   PK maths — one-compartment model with first-order absorption.
   Concentrations are returned as a fraction of the single-dose peak (1.0), so
   nothing here pretends to know an absolute plasma level without a volume of
   distribution. Shapes, accumulation and steady state are what it models.
   ========================================================================== */

export const DEFAULT_TMAX = 1.5;

/** Elimination rate constant from a half-life in hours. */
export function keFrom(halfLife) {
  return Math.LN2 / Math.max(halfLife, 0.05);
}

/**
 * Absorption rate constant. Without a measured ka we pick one that puts the
 * modelled peak close to the recorded tmax, keeping a minimum separation from
 * ke so the curve never degenerates.
 */
export function kaFrom(halfLife, tmax) {
  const ke = keFrom(halfLife);
  const t = Math.max(tmax || DEFAULT_TMAX, 0.05);
  // tmax = ln(ka/ke) / (ka - ke); with r = ka/ke this is ln(r)/((r-1)ke) = t.
  const m = Math.min(t * ke, 0.95);
  let lo = 1 + 1e-6;
  let hi = 1e6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const g = Math.log(mid) / (mid - 1);
    if (g > m) lo = mid;
    else hi = mid;
  }
  return Math.max(((lo + hi) / 2) * ke, ke * 1.02);
}

/** Unit single-dose response, normalised to its own peak. */
export function unitCurve(halfLife, tmax, samples = 240, span = null) {
  const ke = keFrom(halfLife);
  const ka = kaFrom(halfLife, tmax);
  const total = span || Math.max(halfLife * 6, 8);
  const dt = total / samples;
  const raw = [];
  let peak = 0;
  for (let i = 0; i <= samples; i++) {
    const t = i * dt;
    const c = (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
    raw.push({ t, c: c > 0 ? c : 0 });
    if (c > peak) peak = c;
  }
  return raw.map((p) => ({ t: p.t, c: peak ? p.c / peak : 0 }));
}

/**
 * Plasma curve for a repeated schedule.
 * @param {object} opts
 * @param {number} opts.halfLife hours
 * @param {number} [opts.tmax] hours
 * @param {number} [opts.dose] relative dose size (1 = one unit)
 * @param {number[]} opts.doseTimes hours from the start of the run
 * @param {number} [opts.days] horizon in days
 * @param {number} [opts.step] sample step in hours
 * @returns {{ points: {t:number,c:number}[], cmax:number, tmax:number, trough:number, auc:number }}
 */
export function scheduleCurve(opts) {
  const hl = Math.max(opts.halfLife || 1, 0.05);
  const ke = keFrom(hl);
  const ka = kaFrom(hl, opts.tmax);
  const days = Math.max(opts.days || 1, 0.25);
  const totalH = days * 24;
  const step = Math.max(opts.step || totalH / 720, 0.02);
  const dose = opts.dose == null ? 1 : opts.dose;
  const times = (opts.doseTimes || [0]).slice().sort((a, b) => a - b);

  const n = Math.floor(totalH / step) + 1;
  const points = new Array(n);
  let cmax = 0;
  let tmax = 0;
  let auc = 0;

  for (let i = 0; i < n; i++) {
    const t = i * step;
    let c = 0;
    for (const t0 of times) {
      const dt = t - t0;
      if (dt < 0) continue;
      const v = (ka / (ka - ke)) * (Math.exp(-ke * dt) - Math.exp(-ka * dt));
      if (v > 0) c += dose * v;
    }
    points[i] = { t, c };
    if (c > cmax) {
      cmax = c;
      tmax = t;
    }
    if (i > 0) auc += ((points[i].c + points[i - 1].c) / 2) * step;
  }

  return { points, cmax, tmax, trough: points[n - 1].c, auc, ke, ka };
}

/** Times of every dose over the horizon. */
export function doseTimes(opts) {
  const days = Math.max(opts.days || 1, 1);
  const perDay = Math.max(1, Math.min(6, opts.perDay || 1));
  const first = opts.firstHour == null ? 8 : opts.firstHour;
  const every = opts.every == null ? 24 / perDay : opts.every;
  const out = [];
  for (let d = 0; d < Math.ceil(days); d++) {
    for (let k = 0; k < perDay; k++) {
      const t = d * 24 + first + k * every;
      if (t <= days * 24) out.push(t);
    }
  }
  return out;
}

/** Steady-state accumulation ratio Cmax(n) / Cmax(1). */
export function accumulation(halfLife, every) {
  const ke = keFrom(halfLife);
  const r = Math.exp(-ke * every);
  return 1 / Math.max(1 - r, 1e-6);
}

/** Hours until the trough sits within 3% of steady state (≈5 half-lives). */
export function timeToSteady(halfLife) {
  return halfLife * 5;
}

/** Fixed-percent taper plan, rounded to a measurable step. */
export function taperPlan(opts) {
  const start = Math.max(opts.start || 0, 0);
  const stepPct = Math.min(Math.max(opts.stepPct || 10, 1), 50);
  const interval = Math.max(opts.intervalDays || 7, 1);
  const granule = opts.granule || 0.1;
  const floor = opts.floor == null ? granule : opts.floor;
  const maxSteps = Math.min(opts.maxSteps || 40, 80);
  const rows = [];
  let dose = start;
  let day = 0;
  for (let i = 0; i < maxSteps && dose > floor + 1e-9; i++) {
    rows.push({ day, dose: Math.round(dose / granule) * granule });
    dose = dose * (1 - stepPct / 100);
    day += interval;
    if (rows.length > 1 && rows[rows.length - 1].dose <= floor) break;
  }
  if (rows.length) rows.push({ day, dose: 0, stop: true });
  return rows;
}

/** Half-life in hours from an authored value, with a flag when it is missing. */
export function readHalfLife(pk) {
  const hl = pk && typeof pk.halfLife === "number" ? pk.halfLife : null;
  return { halfLife: hl, known: hl != null && hl > 0 };
}