/* Curated PubMed queries for the flashcard deck.
 *
 * Every card carries a real PubMed query, so the app can pull the primary
 * literature for that exact claim on demand. Queries are stored as strings
 * only — no papers are bundled, nothing about a query result is persisted.
 */

export const CARD_QUERIES = {
  // dopamine
  fc1: "tyrosine hydroxylase dopamine synthesis regulation",
  fc2: "dopamine D1 D2 receptor signaling striatal direct indirect pathway",
  fc3: "Parkinson disease nigrostriatal degeneration substantia nigra dopaminergic neurons",
  fc4: "dopamine reward prediction error incentive salience",
  fc5: "catechol-O-methyltransferase COMT Val158Met dopamine prefrontal cognition",
  // noradrenaline
  fc6: "locus coeruleus noradrenaline forebrain projections",
  fc7: "alpha2 adrenergic autoreceptor clonidine guanfacine yohimbine",
  fc8: "dopamine beta-hydroxylase noradrenaline synaptic vesicles",
  fc9: "atomoxetine abuse potential dopamine transporter norepinephrine transporter",
  // serotonin
  fc10: "tryptophan hydroxylase serotonin synthesis",
  fc11: "5-HIAA cerebrospinal fluid serotonin metabolite",
  fc12: "SSRI delayed onset 5-HT1A autoreceptor desensitization",
  fc13: "serotonin syndrome clonus diagnostic criteria",
  fc14: "psilocybin LSD 5-HT2A receptor agonist",
  // gaba
  fc15: "GABA-A receptor alpha1 subunit zolpidem sedation",
  fc16: "GABA-B receptor GIRK channel baclofen mechanism",
  fc17: "benzodiazepine withdrawal GABA-A receptor internalization",
  // glutamate
  fc18: "NMDA receptor magnesium block glycine coagonist",
  fc19: "memantine ketamine NMDA receptor affinity off-rate",
  fc20: "ketamine BDNF mTORC1 AMPA synaptogenesis antidepressant",
  // acetylcholine
  fc21: "choline acetyltransferase acetylcholine synthesis",
  fc22: "muscarinic M2 receptor bradycardia cholinergic",
  fc23: "galantamine acetylcholinesterase inhibition nicotinic allosteric modulation",
  // adenosine
  fc24: "caffeine adenosine A2A receptor antagonist",
  fc25: "caffeine tolerance adenosine receptor upregulation withdrawal",
  // orexin
  fc26: "orexin hypocretin deficiency narcolepsy cataplexy",
  fc27: "dual orexin receptor antagonist insomnia",
  // endocannabinoid
  fc28: "endocannabinoid retrograde signaling CB1 synaptic transmission",
  fc29: "cannabidiol CB1 negative allosteric modulator 5-HT1A",
  // pharmacokinetics
  fc30: "steady state five half-lives pharmacokinetics",
  fc31: "first-pass metabolism oral bioavailability",
  fc32: "zero-order kinetics phenytoin alcohol saturable metabolism",
  fc33: "drug accumulation ratio half-life dosing interval",
  // pharmacodynamics
  fc34: "drug affinity efficacy Kd Emax",
  fc35: "buprenorphine partial agonist ceiling respiratory depression",
  fc36: "therapeutic drug monitoring narrow therapeutic index lithium clozapine",
  // interactions
  fc37: "St John's wort CYP3A4 induction P-glycoprotein interaction",
  fc38: "fluoxetine CYP2D6 inhibition codeine",
  fc39: "serotonin syndrome QT prolongation seizures respiratory depression drug interaction",
  fc40: "monoamine oxidase inhibitor tyramine hypertensive crisis",
  fc41: "grapefruit juice CYP3A4 intestinal inhibition",
  // withdrawal
  fc42: "alcohol withdrawal seizures delirium tremens opioid withdrawal",
  fc43: "kindling repeated withdrawal seizure threshold",
  fc44: "antidepressant tapering discontinuation hyperbolic dose reduction",
  // evidence
  fc45: "winner's curse small trials effect size overestimation",
  fc46: "open-label versus double-blind trial expectancy bias",
  fc47: "number needed to treat absolute risk reduction",
  fc48: "statistical significance effect size clinical importance",
};

/** Best-effort fallback so a brand-new card still gets a usable query. */
export function queryForCard(card) {
  if (!card) return "neuropharmacology";
  if (card.pubmed) return card.pubmed;
  if (CARD_QUERIES[card.id]) return CARD_QUERIES[card.id];
  const words = String(card.front || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w.toLowerCase()))
    .slice(0, 5)
    .join(" ");
  return `${words || "neuropharmacology"} ${card.system || ""}`.trim();
}

const STOP = new Set([
  "what", "which", "does", "why", "how", "the", "and", "for", "with", "that", "this",
  "from", "into", "than", "when", "most", "main", "time",
]);

export default CARD_QUERIES;