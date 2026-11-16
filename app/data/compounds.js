/* Compound database — merged index plus derived lookup helpers. */

import { COMPOUNDS_A } from "./compounds-a.js";
import { COMPOUNDS_B } from "./compounds-b.js";
import { COMPOUNDS_C } from "./compounds-c.js";
import { COMPOUNDS_D } from "./compounds-d.js";
import { COMPOUNDS_E } from "./compounds-e.js";
import { COMPOUNDS_F } from "./compounds-f.js";

export const COMPOUNDS = [...COMPOUNDS_A, ...COMPOUNDS_B, ...COMPOUNDS_C, ...COMPOUNDS_D, ...COMPOUNDS_E, ...COMPOUNDS_F]
  .filter((c) => c && c.id && c.name)
  .map((c) => ({
    aliases: [],
    moa: [],
    targets: [],
    effects: { good: [], bad: [] },
    flags: [],
    warnings: [],
    tags: [],
    doses: [],
    ...c,
    pk: {
      halfLife: null,
      tmax: null,
      onset: null,
      duration: null,
      metabolism: "—",
      excretion: "—",
      ...(c.pk || {}),
    },
  }));

export const COMPOUND_BY_ID = new Map(COMPOUNDS.map((c) => [c.id, c]));

export const COMPOUND_COUNT = COMPOUNDS.length;

export function getCompound(id) {
  return COMPOUND_BY_ID.get(String(id || "").toLowerCase()) || null;
}

/** All aliases + name + class + tags flattened for searching. */
export function haystack(c) {
  return [c.name, c.aliases.join(" "), c.cls, c.subcls || "", c.summary, c.tags.join(" "), (c.targets || []).map((t) => t.name).join(" ")]
    .join(" ")
    .toLowerCase();
}

export const CLASSES = Array.from(new Set(COMPOUNDS.map((c) => c.cls))).sort();

export const EVIDENCE_ORDER = ["strong", "moderate", "limited", "preclinical", "anecdotal"];

export const ALL_FLAGS = Array.from(new Set(COMPOUNDS.flatMap((c) => c.flags))).sort();

export const ALL_TAGS = Array.from(new Set(COMPOUNDS.flatMap((c) => c.tags))).sort();

export function compoundsByFlag(flag) {
  return COMPOUNDS.filter((c) => c.flags.includes(flag));
}

export function compoundsByClass(cls) {
  return COMPOUNDS.filter((c) => c.cls === cls);
}

/** Free-text search scored by name/alias/class/tag relevance. */
export function searchCompounds(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return COMPOUNDS;
  const scored = [];
  for (const c of COMPOUNDS) {
    let score = 0;
    const name = c.name.toLowerCase();
    if (name === q) score = 120;
    else if (name.startsWith(q)) score = 100;
    else if (name.includes(q)) score = 80;
    if (!score && c.aliases.some((a) => a.toLowerCase().includes(q))) score = 70;
    if (!score && c.cls.toLowerCase().includes(q)) score = 45;
    if (!score && c.subcls && c.subcls.toLowerCase().includes(q)) score = 40;
    if (!score && c.tags.some((t) => t.includes(q))) score = 35;
    if (!score && c.summary.toLowerCase().includes(q)) score = 20;
    if (!score && c.targets.some((t) => t.name.toLowerCase().includes(q))) score = 25;
    if (score) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name)).map((x) => x.c);
}

/** Resolve loose user input ("xanax", "vyvanse", "5htp") to a compound. */
export function resolveCompound(input) {
  const q = String(input || "").trim().toLowerCase();
  if (!q) return null;
  if (COMPOUND_BY_ID.has(q)) return COMPOUND_BY_ID.get(q);
  const normalised = q.replace(/[^a-z0-9]/g, "");
  for (const c of COMPOUNDS) {
    const candidates = [c.id, c.name, ...c.aliases].map((x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (candidates.some((x) => x === normalised)) return c;
  }
  for (const c of COMPOUNDS) {
    const candidates = [c.id, c.name, ...c.aliases].map((x) => String(x).toLowerCase());
    if (candidates.some((x) => x.startsWith(q) || x.includes(q))) return c;
  }
  return null;
}

export const COMPOUND_COUNT = COMPOUNDS.length;

export function pubmedUrl(query) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query || "")}`;
}