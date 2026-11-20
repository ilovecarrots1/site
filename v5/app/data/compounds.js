/* Compound database — merged index plus derived lookup helpers. */

import { COMPOUNDS_A } from "./compounds-a.js";
import { COMPOUNDS_B } from "./compounds-b.js";
import { COMPOUNDS_C } from "./compounds-c.js";
import { COMPOUNDS_D } from "./compounds-d.js";
import { COMPOUNDS_E } from "./compounds-e.js";
import { COMPOUNDS_F } from "./compounds-f.js";
import { COMPOUNDS_G } from "./compounds-g.js";
import { COMPOUNDS_H } from "./compounds-h.js";
import { COMPOUNDS_I } from "./compounds-i.js";
import { COMPOUNDS_J } from "./compounds-j.js";

/** Every dose row must carry the same message: a reference point, not advice. */
export const DOSE_DISCLAIMER = "Reference point for education only — not a recommendation.";

const HAS_DISCLAIMER = /education only|not a recommendation/i;

function doseNote(note) {
  const n = String(note || "").trim();
  if (!n) return DOSE_DISCLAIMER;
  if (HAS_DISCLAIMER.test(n)) return n;
  return n + (/[.!?]$/.test(n) ? " " : ". ") + DOSE_DISCLAIMER;
}

export const COMPOUNDS = Array.from(
  [...COMPOUNDS_A, ...COMPOUNDS_B, ...COMPOUNDS_C, ...COMPOUNDS_D, ...COMPOUNDS_E, ...COMPOUNDS_F, ...COMPOUNDS_G, ...COMPOUNDS_H, ...COMPOUNDS_I, ...COMPOUNDS_J].reduce((map, c) => {
    // Later entries win, so a newer, richer record replaces an older stub with the same id.
    if (c && c.id && c.name) map.set(String(c.id).toLowerCase(), c);
    return map;
  }, new Map()).values()
)
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
    doses: ((c && c.doses) || []).map((d) => ({ ...d, note: doseNote(d.note) })),
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

/* ---- Russian / slang search support ------------------------------------
   The UI is RU-first: people type Cyrillic names and street slang ("тирза",
   "гр", "иа"). Canonical names/ids stay English — this layer only widens
   matching, it never renames a compound or touches the dose disclaimer. */
const RU_TRANSLIT = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
function translit(s) {
  return String(s).toLowerCase().split("").map((ch) => (RU_TRANSLIT[ch] !== undefined ? RU_TRANSLIT[ch] : ch)).join("");
}
/* Russian names + common slang → canonical compound id. */
const RU_ALIASES = {
  "семакс":"semax","семак":"semax",
  "селанк":"selank",
  "тирзепатид":"tirzepatide","тирза":"tirzepatide","тирз":"tirzepatide",
  "ретатрутид":"retatrutide","ретта":"retatrutide","рета":"retatrutide",
  "семаглутид":"semaglutide","сема":"semaglutide","оземпик":"semaglutide","оземп":"semaglutide",
  "соматропин":"somatropin","соматотропин":"somatropin","гормон роста":"somatropin","гр":"somatropin","гх":"somatropin",
  "ибутаморен":"mk-677","мк677":"mk-677","мк-677":"mk-677",
  "игф1":"igf-1-lr3","игф-1":"igf-1-lr3","игф":"igf-1-lr3",
  "анастрозол":"anastrozole","летрозол":"letrozole","экземестан":"exemestane",
  "ипаморелин":"ipamorelin","серморелин":"sermorelin","гхрп2":"ghrp-2","гхрп-2":"ghrp-2","гхрп6":"ghrp-6","гхрп-6":"ghrp-6",
  "бпк157":"bpc-157","бпк-157":"bpc-157","тб500":"tb-500","тб-500":"tb-500",
  "кофеин":"caffeine","никотин":"nicotine","мелатонин":"melatonin","креатин":"creatine",
  "литий":"lithium","кетамин":"ketamine","ашваганда":"ashwagandha","омега3":"omega-3","омега-3":"omega-3","инсулин":"insulin",
};
/* Russian class slang → canonical cls value (lists every member). */
const RU_CLASS_TOKENS = {
  "иа":"Aromatase inhibitor","ингибитор ароматазы":"Aromatase inhibitor","инг ароматазы":"Aromatase inhibitor","ароматаза":"Aromatase inhibitor",
  "аас":"Anabolic steroid","анаболики":"Anabolic steroid","стероиды":"Anabolic steroid",
  "секретагоги":"Growth hormone secretagogue","секретагог":"Growth hormone secretagogue",
  "глп1":"GLP-1 agonist","глп-1":"GLP-1 agonist","инкретины":"GLP-1 agonist",
};
function queryVariants(q) {
  const set = new Set([q]);
  if (/[а-яё]/.test(q)) {
    const t = translit(q);
    if (t.length >= 3) set.add(t); // skip 2-letter translit noise ("иа"→"ia")
  }
  return [...set];
}

/** Free-text search scored by name/alias/class/tag relevance (RU-aware). */
export function searchCompounds(query) {
  const raw = String(query || "").trim().toLowerCase();
  if (!raw) return COMPOUNDS;
  const variants = queryVariants(raw);
  const targetId = RU_ALIASES[raw] || null;
  const targetCls = RU_CLASS_TOKENS[raw] || null;
  const scored = [];
  for (const c of COMPOUNDS) {
    let score = 0;
    if (targetId && c.id === targetId) score = 130;
    if (targetCls && c.cls === targetCls) score = Math.max(score, 95);
    const name = c.name.toLowerCase();
    for (const q of variants) {
      if (!q) continue;
      if (name === q) score = Math.max(score, 120);
      else if (name.startsWith(q)) score = Math.max(score, 100);
      else if (name.includes(q)) score = Math.max(score, 80);
      if (score < 70 && c.aliases.some((a) => a.toLowerCase().includes(q))) score = Math.max(score, 70);
      if (score < 45 && c.cls.toLowerCase().includes(q)) score = Math.max(score, 45);
      if (score < 40 && c.subcls && c.subcls.toLowerCase().includes(q)) score = Math.max(score, 40);
      if (score < 35 && c.tags.some((t) => t.includes(q))) score = Math.max(score, 35);
      if (score < 25 && c.targets.some((t) => t.name.toLowerCase().includes(q))) score = Math.max(score, 25);
      if (score < 20 && c.summary.toLowerCase().includes(q)) score = Math.max(score, 20);
    }
    if (score) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name)).map((x) => x.c);
}

/** Resolve loose user input ("xanax", "vyvanse", "тирза", "гр") to a compound. */
export function resolveCompound(input) {
  const q = String(input || "").trim().toLowerCase();
  if (!q) return null;
  if (COMPOUND_BY_ID.has(q)) return COMPOUND_BY_ID.get(q);
  const rid = RU_ALIASES[q];
  if (rid && COMPOUND_BY_ID.has(rid)) return COMPOUND_BY_ID.get(rid);
  const rcls = RU_CLASS_TOKENS[q];
  if (rcls) {
    const hit = COMPOUNDS.find((c) => c.cls === rcls);
    if (hit) return hit;
  }
  const variants = queryVariants(q);
  for (const v of variants) {
    const normalised = v.replace(/[^a-z0-9]/g, "");
    if (!normalised) continue;
    for (const c of COMPOUNDS) {
      const candidates = [c.id, c.name, ...c.aliases].map((x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, ""));
      if (candidates.some((x) => x === normalised)) return c;
    }
  }
  for (const v of variants) {
    for (const c of COMPOUNDS) {
      const candidates = [c.id, c.name, ...c.aliases].map((x) => String(x).toLowerCase());
      if (candidates.some((x) => x.startsWith(v) || x.includes(v))) return c;
    }
  }
  return null;
}

export function pubmedUrl(query) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query || "")}`;
}