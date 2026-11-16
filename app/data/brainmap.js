/* ==========================================================================
   Brain map v3 — the data behind the flagship Brain view.
   Coordinate space: 420 × 320 (same as the silhouette used by the old map).
   Three depth layers give the 2.5D parallax: shell (cortex), mid (limbic),
   deep (brainstem / nuclei).
   ========================================================================== */

import { COMPOUNDS, COMPOUND_BY_ID } from "./compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "./neuro.js";

export const VIEWBOX = { w: 420, h: 320 };

/* Cortical shell. Two paths: cerebrum + cerebellum. */
export const SILHOUETTE =
  "M198 24 C120 24 62 82 60 150 C58 214 108 258 176 262 C214 264 246 250 264 226 C300 230 344 214 350 176 C356 138 330 112 300 108 C292 66 250 24 198 24 Z";
export const CEREBELLUM = "M264 226 C288 232 320 226 336 208 C348 194 344 176 330 172 C316 186 292 200 264 204 Z";

/* A few sulci so the shell reads as a brain, not a blob. */
export const SULCI = [
  "M120 90 C140 106 132 132 108 146",
  "M168 58 C178 84 168 104 150 118",
  "M244 60 C236 88 246 108 262 120",
  "M96 178 C124 186 148 202 158 226",
  "M206 78 C222 96 226 118 218 138",
  "M270 140 C286 152 294 168 292 186",
];

export const LAYERS = [
  { id: "shell", label: "Cortex", note: "outer shell — translucency 0.9" },
  { id: "mid", label: "Limbic", note: "mid depth — parallax 0.6" },
  { id: "deep", label: "Brainstem", note: "deep — parallax 0.3" },
];

/* --------------------------------------------------------------------------
   Regions — 28 nodes. x/y/rx/ry in the 420×320 space.
   -------------------------------------------------------------------------- */

export const REGIONS = [
  { id: "prefrontal-cortex", name: "Prefrontal cortex", short: "PFC", x: 92, y: 112, rx: 44, ry: 34, layer: "shell",
    systems: ["dopamine", "noradrenaline", "serotonin", "glutamate"],
    drugs: ["modafinil", "armodafinil", "methylphenidate", "atomoxetine", "bupropion", "guanfacine", "semax"],
    note: "Executive control, working memory, top-down inhibition." },
  { id: "orbitofrontal", name: "Orbitofrontal cortex", short: "OFC", x: 104, y: 168, rx: 34, ry: 22, layer: "shell",
    systems: ["serotonin", "dopamine", "glutamate"],
    drugs: ["fluoxetine", "sertraline", "vortioxetine", "quetiapine"],
    note: "Value, reversal learning, impulse braking." },
  { id: "anterior-cingulate", name: "Anterior cingulate", short: "ACC", x: 186, y: 86, rx: 30, ry: 20, layer: "shell",
    systems: ["glutamate", "dopamine", "serotonin"],
    drugs: ["ketamine", "sertraline", "lamotrigine", "n-acetylcysteine"],
    note: "Conflict monitoring, pain affect, error signalling." },
  { id: "motor-cortex", name: "Motor cortex", short: "M1", x: 132, y: 66, rx: 26, ry: 16, layer: "shell",
    systems: ["glutamate", "gaba"],
    drugs: ["baclofen", "gabapentin", "pregabalin"],
    note: "Voluntary movement output." },
  { id: "parietal-cortex", name: "Parietal cortex", short: "PAR", x: 176, y: 52, rx: 30, ry: 18, layer: "shell",
    systems: ["glutamate", "acetylcholine", "noradrenaline"],
    drugs: ["nicotine", "donepezil", "galantamine", "huperzine-a"],
    note: "Spatial attention and sensory integration." },
  { id: "temporal-cortex", name: "Temporal cortex", short: "TMP", x: 136, y: 206, rx: 30, ry: 18, layer: "shell",
    systems: ["glutamate", "gaba", "serotonin"],
    drugs: ["lamotrigine", "ketamine", "psilocybin"],
    note: "Language, memory encoding, auditory processing." },
  { id: "occipital-cortex", name: "Occipital cortex", short: "OCC", x: 66, y: 146, rx: 24, ry: 20, layer: "shell",
    systems: ["glutamate", "gaba"],
    drugs: ["lsd", "psilocybin"],
    note: "Primary visual cortex; visual cortex 5-HT2A density is high." },
  { id: "insula", name: "Insula", short: "INS", x: 166, y: 148, rx: 18, ry: 14, layer: "shell",
    systems: ["glutamate", "noradrenaline", "serotonin"],
    drugs: ["venlafaxine", "atomoxetine", "clonidine"],
    note: "Interoception, craving, autonomic awareness." },

  { id: "striatum", name: "Striatum (caudate/putamen)", short: "STR", x: 182, y: 142, rx: 34, ry: 22, layer: "mid",
    systems: ["dopamine", "gaba", "acetylcholine", "adenosine"],
    drugs: ["levodopa", "pramipexole", "methylphenidate", "dextroamphetamine", "caffeine", "amantadine"],
    note: "Action selection, habit, dorsal reward loop." },
  { id: "nucleus-accumbens", name: "Nucleus accumbens", short: "NAc", x: 146, y: 172, rx: 22, ry: 16, layer: "mid",
    systems: ["dopamine", "gaba", "endocannabinoid", "orexin"],
    drugs: ["bupropion", "modafinil", "cbd", "naloxone", "methylphenidate"],
    note: "Ventral reward, incentive salience, relapse." },
  { id: "thalamus", name: "Thalamus", short: "THA", x: 232, y: 132, rx: 24, ry: 18, layer: "mid",
    systems: ["glutamate", "gaba", "histamine", "adenosine"],
    drugs: ["zolpidem", "modafinil", "caffeine", "diphenhydramine"],
    note: "Sensory relay and cortical gating; sleep spindle generator." },
  { id: "hippocampus", name: "Hippocampus", short: "HIP", x: 246, y: 176, rx: 30, ry: 18, layer: "mid",
    systems: ["glutamate", "acetylcholine", "gaba", "endocannabinoid", "serotonin"],
    drugs: ["donepezil", "galantamine", "memantine", "cbd", "caffeine", "lions-mane", "bromantane"],
    note: "Episodic memory, pattern separation, contextual fear." },
  { id: "amygdala", name: "Amygdala", short: "AMY", x: 200, y: 196, rx: 22, ry: 16, layer: "mid",
    systems: ["gaba", "glutamate", "noradrenaline", "serotonin", "endocannabinoid"],
    drugs: ["alprazolam", "diazepam", "propranolol", "cbd", "psilocybin", "sertraline"],
    note: "Threat detection, fear learning, emotional salience." },
  { id: "hypothalamus", name: "Hypothalamus", short: "HYP", x: 214, y: 160, rx: 18, ry: 12, layer: "mid",
    systems: ["orexin", "histamine", "dopamine", "serotonin"],
    drugs: ["suvorexant", "modafinil", "melatonin", "pregabalin"],
    note: "Homeostasis: HPA axis, appetite, thermoregulation, wake drive." },
  { id: "septum", name: "Septal nuclei", short: "SEP", x: 202, y: 126, rx: 12, ry: 10, layer: "mid",
    systems: ["acetylcholine", "gaba", "dopamine"],
    drugs: ["galantamine", "nicotine"],
    note: "Theta rhythm, reward modulation, anxiety buffering." },
  { id: "habenula", name: "Habenula", short: "HAB", x: 224, y: 150, rx: 9, ry: 8, layer: "mid",
    systems: ["glutamate", "acetylcholine"],
    drugs: ["ketamine", "nicotine"],
    note: "Lateral habenula drives aversion and negative prediction error." },
  { id: "basal-forebrain", name: "Basal forebrain", short: "BF", x: 190, y: 116, rx: 14, ry: 10, layer: "mid",
    systems: ["acetylcholine", "gaba"],
    drugs: ["donepezil", "galantamine", "huperzine-a", "citicoline"],
    note: "Cholinergic projection source for cortex and hippocampus." },
  { id: "pineal", name: "Pineal gland", short: "PIN", x: 252, y: 122, rx: 8, ry: 7, layer: "mid",
    systems: ["serotonin"],
    drugs: ["melatonin", "ramelteon", "apigenin"],
    note: "Melatonin synthesis; light-entrained circadian output." },

  { id: "vta", name: "Ventral tegmental area", short: "VTA", x: 204, y: 214, rx: 16, ry: 11, layer: "deep",
    systems: ["dopamine", "gaba", "glutamate"],
    drugs: ["bupropion", "modafinil", "methylphenidate", "nicotine", "psilocybin"],
    note: "Mesolimbic and mesocortical dopamine origin." },
  { id: "substantia-nigra", name: "Substantia nigra", short: "SN", x: 234, y: 206, rx: 16, ry: 10, layer: "deep",
    systems: ["dopamine", "gaba"],
    drugs: ["levodopa", "pramipexole", "selegiline", "amantadine"],
    note: "Nigrostriatal dopamine; loss here is Parkinson pathology." },
  { id: "locus-coeruleus", name: "Locus coeruleus", short: "LC", x: 296, y: 176, rx: 14, ry: 11, layer: "deep",
    systems: ["noradrenaline"],
    drugs: ["atomoxetine", "clonidine", "guanfacine", "propranolol"],
    note: "Sole cortical noradrenaline source; arousal and vigilance." },
  { id: "raphe", name: "Raphe nuclei", short: "RAP", x: 284, y: 208, rx: 16, ry: 10, layer: "deep",
    systems: ["serotonin"],
    drugs: ["sertraline", "fluoxetine", "escitalopram", "psilocybin", "tianeptine"],
    note: "Serotonin cell bodies; sleep, mood, pain gating." },
  { id: "periaqueductal-gray", name: "Periaqueductal grey", short: "PAG", x: 258, y: 190, rx: 11, ry: 9, layer: "deep",
    systems: ["gaba", "glutamate", "endocannabinoid"],
    drugs: ["naloxone", "ketamine", "pregabalin"],
    note: "Descending pain control; opioid and cannabinoid analgesia." },
  { id: "pons", name: "Pons", short: "PON", x: 302, y: 240, rx: 16, ry: 12, layer: "deep",
    systems: ["acetylcholine", "glutamate", "gaba"],
    drugs: ["suvorexant", "modafinil", "nicotine"],
    note: "REM switch (sublaterodorsal nucleus), pontine relays." },
  { id: "medulla", name: "Medulla", short: "MED", x: 316, y: 268, rx: 18, ry: 14, layer: "deep",
    systems: ["glutamate", "gaba", "serotonin", "noradrenaline"],
    drugs: ["clonidine", "propranolol", "naloxone"],
    note: "Cardiorespiratory centres — where opioid overdose kills." },
  { id: "cerebellum", name: "Cerebellum", short: "CB", x: 330, y: 224, rx: 30, ry: 22, layer: "deep",
    systems: ["gaba", "glutamate", "endocannabinoid"],
    drugs: ["alprazolam", "diazepam", "phenibut", "cbd"],
    note: "Timing, motor calibration, cognitive sequencing." },
  { id: "spinal-cord", name: "Spinal cord", short: "SPC", x: 320, y: 296, rx: 14, ry: 12, layer: "deep",
    systems: ["glutamate", "gaba", "noradrenaline"],
    drugs: ["pregabalin", "gabapentin", "naloxone"],
    note: "Final common path; dorsal horn is where gabapentinoids act." },
  { id: "olfactory-bulb", name: "Olfactory bulb", short: "OB", x: 96, y: 74, rx: 14, ry: 10, layer: "shell",
    systems: ["glutamate", "dopamine"],
    drugs: ["selegiline", "bromantane"],
    note: "First relay for smell; dopaminergic periglomerular cells." },
];

export const REGION_MAP = new Map(REGIONS.map((r) => [r.id, r]));

export function regionColor(r) {
  const s = SYSTEM_BY_ID.get((r.systems || [])[0]);
  return (s && s.color) || "var(--accent)";
}

/* --------------------------------------------------------------------------
   Targets. `regions` is [regionId, weight 0..1] — weight drives glow strength.
   Ids that exist in the biochemical atlas get a deeper link automatically.
   -------------------------------------------------------------------------- */

export const TARGETS = [
  { id: "d1-receptor", name: "Dopamine D1", short: "D1", system: "dopamine",
    regions: [["prefrontal-cortex", 0.9], ["striatum", 1], ["nucleus-accumbens", 0.7]] },
  { id: "d2-receptor", name: "Dopamine D2", short: "D2", system: "dopamine",
    regions: [["striatum", 1], ["nucleus-accumbens", 1], ["vta", 0.8], ["substantia-nigra", 0.7], ["pituitary", 0.4]] },
  { id: "dat", name: "Dopamine transporter", short: "DAT", system: "dopamine",
    regions: [["striatum", 1], ["nucleus-accumbens", 0.9], ["prefrontal-cortex", 0.7], ["substantia-nigra", 0.6]] },
  { id: "sert", name: "Serotonin transporter", short: "SERT", system: "serotonin",
    regions: [["raphe", 1], ["prefrontal-cortex", 0.9], ["amygdala", 0.8], ["hippocampus", 0.7], ["orbitofrontal", 0.7]] },
  { id: "net", name: "Noradrenaline transporter", short: "NET", system: "noradrenaline",
    regions: [["locus-coeruleus", 1], ["prefrontal-cortex", 0.9], ["thalamus", 0.6], ["hypothalamus", 0.5]] },
  { id: "5ht1a-receptor", name: "Serotonin 5-HT1A", short: "5-HT1A", system: "serotonin",
    regions: [["raphe", 1], ["hippocampus", 0.9], ["prefrontal-cortex", 0.7], ["amygdala", 0.7]] },
  { id: "5ht2a-receptor", name: "Serotonin 5-HT2A", short: "5-HT2A", system: "serotonin",
    regions: [["occipital-cortex", 1], ["prefrontal-cortex", 0.9], ["thalamus", 0.6], ["amygdala", 0.6]] },
  { id: "5ht2c-receptor", name: "Serotonin 5-HT2C", short: "5-HT2C", system: "serotonin",
    regions: [["hypothalamus", 0.9], ["nucleus-accumbens", 0.8], ["vta", 0.7]] },
  { id: "alpha1-receptor", name: "Alpha-1 adrenergic", short: "α1", system: "noradrenaline",
    regions: [["medulla", 0.9], ["thalamus", 0.6], ["prefrontal-cortex", 0.6]] },
  { id: "alpha2-receptor", name: "Alpha-2 adrenergic", short: "α2", system: "noradrenaline",
    regions: [["locus-coeruleus", 1], ["prefrontal-cortex", 0.9], ["medulla", 0.7]] },
  { id: "beta1-receptor", name: "Beta-1 adrenergic", short: "β1", system: "noradrenaline",
    regions: [["medulla", 0.7], ["prefrontal-cortex", 0.5]] },
  { id: "beta2-receptor", name: "Beta-2 adrenergic", short: "β2", system: "noradrenaline",
    regions: [["cerebellum", 0.7], ["medulla", 0.6]] },
  { id: "m1-receptor", name: "Muscarinic M1", short: "M1", system: "acetylcholine",
    regions: [["basal-forebrain", 1], ["hippocampus", 0.9], ["prefrontal-cortex", 0.8], ["striatum", 0.6]] },
  { id: "nicotinic-alpha4beta2", name: "α4β2 nicotinic", short: "α4β2", system: "acetylcholine",
    regions: [["striatum", 0.9], ["thalamus", 0.9], ["vta", 0.8], ["prefrontal-cortex", 0.7]] },
  { id: "gaba-a-receptor", name: "GABA-A", short: "GABA-A", system: "gaba",
    regions: [["prefrontal-cortex", 0.9], ["amygdala", 1], ["cerebellum", 0.9], ["thalamus", 0.8], ["hippocampus", 0.7]] },
  { id: "gaba-b-receptor", name: "GABA-B", short: "GABA-B", system: "gaba",
    regions: [["thalamus", 0.8], ["spinal-cord", 0.9], ["cerebellum", 0.7], ["vta", 0.6]] },
  { id: "nmda-receptor", name: "NMDA", short: "NMDA", system: "glutamate",
    regions: [["hippocampus", 1], ["prefrontal-cortex", 1], ["amygdala", 0.8], ["anterior-cingulate", 0.7]] },
  { id: "ampa-receptor", name: "AMPA", short: "AMPA", system: "glutamate",
    regions: [["hippocampus", 0.9], ["prefrontal-cortex", 0.9], ["temporal-cortex", 0.7]] },
  { id: "mu-opioid", name: "Mu opioid", short: "MOR", system: "endocannabinoid",
    regions: [["periaqueductal-gray", 1], ["medulla", 1], ["thalamus", 0.8], ["nucleus-accumbens", 0.8], ["striatum", 0.7], ["amygdala", 0.6]] },
  { id: "cb1-receptor", name: "Cannabinoid CB1", short: "CB1", system: "endocannabinoid",
    regions: [["cerebellum", 1], ["hippocampus", 1], ["striatum", 0.8], ["prefrontal-cortex", 0.7], ["amygdala", 0.7]] },
  { id: "orexin-receptor", name: "Orexin OX1/OX2", short: "OX", system: "orexin",
    regions: [["hypothalamus", 1], ["locus-coeruleus", 0.8], ["raphe", 0.7], ["vta", 0.6]] },
  { id: "h1-receptor", name: "Histamine H1", short: "H1", system: "histamine",
    regions: [["hypothalamus", 1], ["thalamus", 0.8], ["prefrontal-cortex", 0.7]] },
  { id: "a2a-receptor", name: "Adenosine A2A", short: "A2A", system: "adenosine",
    regions: [["striatum", 1], ["thalamus", 0.8], ["prefrontal-cortex", 0.6]] },
  { id: "mao", name: "MAO-A / MAO-B", short: "MAO", system: "dopamine",
    regions: [["striatum", 0.9], ["substantia-nigra", 0.8], ["prefrontal-cortex", 0.7], ["raphe", 0.6]] },
  { id: "comt", name: "COMT", short: "COMT", system: "dopamine",
    regions: [["prefrontal-cortex", 1], ["striatum", 0.7]] },
  { id: "vmat2", name: "VMAT2", short: "VMAT2", system: "dopamine",
    regions: [["striatum", 1], ["vta", 0.8], ["raphe", 0.6]] },
  { id: "trkb", name: "TrkB / BDNF", short: "TrkB", system: "glutamate",
    regions: [["hippocampus", 1], ["prefrontal-cortex", 0.9], ["anterior-cingulate", 0.6]] },
  { id: "sigma1", name: "Sigma-1", short: "σ1", system: "glutamate",
    regions: [["hippocampus", 0.8], ["prefrontal-cortex", 0.8], ["cerebellum", 0.6]] },
];

export const TARGET_MAP = new Map(TARGETS.map((t) => [t.id, t]));

export function targetColor(t) {
  const s = SYSTEM_BY_ID.get(t.system);
  return (s && s.color) || "var(--accent)";
}

/* Region → targets, derived once. */
const _byRegion = new Map();
TARGETS.forEach((t) => {
  t.regions.forEach(([rid, w]) => {
    if (!REGION_MAP.has(rid)) return;
    if (!_byRegion.has(rid)) _byRegion.set(rid, []);
    _byRegion.get(rid).push({ target: t, weight: w });
  });
});

export function targetsForRegion(regionId) {
  return (_byRegion.get(regionId) || []).slice().sort((a, b) => b.weight - a.weight);
}

export function regionsForTarget(targetId) {
  const t = TARGET_MAP.get(targetId);
  if (!t) return [];
  return t.regions
    .filter(([rid]) => REGION_MAP.has(rid))
    .map(([rid, w]) => ({ region: REGION_MAP.get(rid), weight: w }));
}

/* --------------------------------------------------------------------------
   Receptor clusters — the "glowing purple nodes" of the reference.
   `n` dots scattered inside an ellipse around the region centre.
   -------------------------------------------------------------------------- */

export const CLUSTERS = [
  { region: "striatum", n: 26, rx: 30, ry: 16 },
  { region: "nucleus-accumbens", n: 18, rx: 18, ry: 12 },
  { region: "hippocampus", n: 22, rx: 26, ry: 14 },
  { region: "prefrontal-cortex", n: 24, rx: 38, ry: 26 },
  { region: "amygdala", n: 14, rx: 17, ry: 12 },
  { region: "thalamus", n: 12, rx: 19, ry: 13 },
  { region: "cerebellum", n: 16, rx: 25, ry: 17 },
  { region: "vta", n: 10, rx: 12, ry: 8 },
  { region: "raphe", n: 9, rx: 12, ry: 8 },
  { region: "locus-coeruleus", n: 8, rx: 10, ry: 8 },
];

/* Deterministic pseudo-random so the map looks the same on every render. */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const CLUSTER_DOTS = CLUSTERS.flatMap((c, ci) => {
  const r = REGION_MAP.get(c.region);
  if (!r) return [];
  const dots = [];
  for (let i = 0; i < c.n; i++) {
    const a = hash(ci * 37 + i) * Math.PI * 2;
    const rad = Math.sqrt(hash(ci * 91 + i * 7 + 3));
    dots.push({
      region: c.region,
      x: +(r.x + Math.cos(a) * c.rx * rad * 0.85).toFixed(1),
      y: +(r.y + Math.sin(a) * c.ry * rad * 0.85).toFixed(1),
      d: +((i % 7) * 0.32).toFixed(2),
    });
  }
  return dots;
});

/* --------------------------------------------------------------------------
   Compound → regions.
   Two sources: explicit membership in a region's drug list, and a fuzzy name
   match between the compound's declared targets and the target table.
   -------------------------------------------------------------------------- */

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const _compoundRegions = new Map();
let _built = false;

function build() {
  if (_built) return;
  _built = true;
  COMPOUNDS.forEach((c) => {
    const out = new Map();
    REGIONS.forEach((r) => {
      if ((r.drugs || []).includes(c.id)) out.set(r.id, 1);
    });
    (c.targets || []).forEach((t) => {
      const key = norm(t.name);
      if (!key) return;
      TARGETS.forEach((tg) => {
        const tkey = norm(tg.name);
        if (!tkey) return;
        if (tkey.includes(key) || key.includes(tkey)) {
          tg.regions.forEach(([rid, w]) => {
            if (!out.has(rid) || out.get(rid) < w) out.set(rid, w);
          });
        }
      });
    });
    _compoundRegions.set(c.id, out);
  });
}

export function compoundRegions(id) {
  build();
  const m = _compoundRegions.get(id);
  if (!m) return [];
  return Array.from(m.entries())
    .map(([rid, w]) => ({ region: REGION_MAP.get(rid), weight: w }))
    .filter((x) => x.region)
    .sort((a, b) => b.weight - a.weight);
}

export function compoundTargets(id) {
  const c = COMPOUND_BY_ID.get(id);
  if (!c) return [];
  const keys = (c.targets || []).map((t) => norm(t.name)).filter(Boolean);
  return TARGETS.filter((tg) => {
    const tkey = norm(tg.name);
    return keys.some((k) => tkey.includes(k) || k.includes(tkey));
  });
}

export function compoundSystems(id) {
  const set = new Set();
  compoundTargets(id).forEach((t) => set.add(t.system));
  compoundRegions(id).forEach((rr) => (rr.region.systems || []).forEach((s) => set.add(s)));
  return Array.from(set);
}

/* Systems summary used by the legend. */
export const SYSTEM_LIST = SYSTEMS.map((s) => ({ id: s.id, name: s.name, color: s.color }));

export const STATS = {
  regions: REGIONS.length,
  targets: TARGETS.length,
  compounds: COMPOUNDS.length,
  connections: CLUSTER_DOTS.length,
};