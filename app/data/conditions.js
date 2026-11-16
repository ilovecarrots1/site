/* ==========================================================================
   Conditions — index over files A–D.
   Builds lookup maps, a chapter tree, and a symptom → condition index that
   the symptom finder reuses. Educational reference only.
   ========================================================================== */

import { COMPOUND_BY_ID } from "./compounds.js";
import { CONDITIONS_A } from "./conditions-a.js";
import { CONDITIONS_B } from "./conditions-b.js";
import { CONDITIONS_C } from "./conditions-c.js";

const RAW = [...CONDITIONS_A, ...CONDITIONS_B, ...CONDITIONS_C];

/* Dedupe by id, keep the first definition. */
const seen = new Map();
for (const c of RAW) {
  if (!c || !c.id) continue;
  if (!seen.has(c.id)) seen.set(c.id, c);
}

export const CONDITIONS = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

export const CONDITION_BY_ID = new Map(CONDITIONS.map((c) => [c.id, c]));

export const CONDITION_COUNT = CONDITIONS.length;

/* ---- chapters -------------------------------------------------------- */

const CHAPTER_ORDER = [
  "Mood",
  "Anxiety",
  "OCD & related",
  "Trauma",
  "Dissociative",
  "Somatic",
  "Psychotic",
  "Neurocognitive",
  "Movement",
  "Sleep",
  "Developmental",
];

const CHAPTER_NOTE = {
  Mood: "Affective episodes: polarity, duration and recurrence.",
  Anxiety: "Threat appraisal and avoidance.",
  "OCD & related": "Repetitive behaviour, urges and body-focused habits.",
  Trauma: "Reactions to a discrete or prolonged stressor.",
  Dissociative: "Discontinuity of memory, identity and perception.",
  Somatic: "Bodily symptoms that do not track tissue damage.",
  Psychotic: "Reality-testing, perception and thought disorder.",
  Neurocognitive: "Decline in memory, executive function and awareness.",
  Movement: "Basal ganglia, cortex and nerve conduction.",
  Sleep: "Initiation, maintenance and timing of sleep.",
  Developmental: "Onset in childhood with a persistent course.",
};

export const CONDITION_CHAPTERS = CHAPTER_ORDER.filter((name) => CONDITIONS.some((c) => c.chapter === name)).map(
  (name) => ({
    name,
    note: CHAPTER_NOTE[name] || "",
    items: CONDITIONS.filter((c) => c.chapter === name),
  })
);

export function conditionsForChapter(name) {
  return CONDITIONS.filter((c) => c.chapter === name);
}

/* ---- symptoms -------------------------------------------------------- */

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** symptom label → { label, conditions: Set<id>, count } */
export const SYMPTOM_INDEX = (() => {
  const map = new Map();
  for (const c of CONDITIONS) {
    const all = new Set([...(c.symptoms || [])]);
    for (const st of c.subtypes || []) for (const s of st.symptoms || []) all.add(s);
    for (const s of all) {
      const key = norm(s);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { id: key, label: s, conditions: new Set() });
      map.get(key).conditions.add(c.id);
    }
  }
  return Array.from(map.values())
    .map((x) => ({ id: x.id, label: x.label, count: x.conditions.size, conditions: Array.from(x.conditions) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
})();

export const SYMPTOM_COUNT = SYMPTOM_INDEX.length;

export function symptomById(id) {
  return SYMPTOM_INDEX.find((s) => s.id === id) || null;
}

export function symptomsForCondition(id) {
  const c = CONDITION_BY_ID.get(id);
  if (!c) return [];
  const all = new Set([...(c.symptoms || [])]);
  for (const st of c.subtypes || []) for (const s of st.symptoms || []) all.add(s);
  return Array.from(all);
}

/* ---- compounds ------------------------------------------------------- */

/** Valid conditions referencing a compound id (unknown ids filtered out). */
export function conditionsForCompound(compoundId) {
  return CONDITIONS.filter((c) => (c.compounds || []).includes(compoundId));
}

/** Compound chips are filtered against the real corpus in the view. */
export function validCompounds(c) {
  return (c.compounds || []).filter((id) => COMPOUND_BY_ID.has(id));
}

export function conditionsForSystem(systemId) {
  return CONDITIONS.filter((c) => (c.systems || []).includes(systemId));
}

/* ---- stats ----------------------------------------------------------- */

export const CONDITION_STATS = {
  conditions: CONDITIONS.length,
  chapters: CONDITION_CHAPTERS.length,
  subtypes: CONDITIONS.reduce((n, c) => n + (c.subtypes || []).length, 0),
  symptoms: SYMPTOM_COUNT,
  withLegacy: CONDITIONS.filter((c) => (c.legacy || []).length).length,
  icd11Missing: CONDITIONS.filter((c) => !(c.icd11 || []).length).length,
};