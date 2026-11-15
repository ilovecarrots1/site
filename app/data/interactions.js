/* Interaction rule engine.
 * Two layers: explicit pair rules (specific pharmacology) and flag-based rules
 * (class effects). Findings are deduplicated and sorted by severity.
 */

export const SEVERITY = {
  critical: { label: "Avoid", rank: 4, tone: "critical" },
  major: { label: "High risk", rank: 3, tone: "major" },
  moderate: { label: "Moderate", rank: 2, tone: "moderate" },
  minor: { label: "Minor", rank: 1, tone: "minor" },
};

/** Substances commonly stacked that are not in the compound encyclopedia. */
export const EXTRA_SUBSTANCES = [
  {
    id: "alcohol",
    name: "Alcohol (ethanol)",
    cls: "Depressant",
    evidence: "strong",
    flags: ["sedative", "gabaergic", "respiratory-depressant", "hepatotoxic", "hypoglycemic-weak"],
    summary: "GABA-A positive modulator and NMDA antagonist; the most common interaction partner in emergency departments.",
    pk: { halfLife: 0.2 },
  },
  {
    id: "cannabis-thc",
    name: "Cannabis (THC)",
    cls: "Cannabinoid",
    evidence: "moderate",
    flags: ["cannabinoid", "sedative-weak", "anxiogenic", "tachycardia"],
    summary: "CB1 partial agonist; adds sedation, tachycardia and anxiety risk when stacked.",
    pk: { halfLife: 30 },
  },
  {
    id: "tramadol",
    name: "Tramadol",
    cls: "Opioid",
    evidence: "strong",
    flags: ["opioid", "serotonergic", "noradrenergic", "seizure-risk", "respiratory-depressant"],
    summary: "Atypical opioid with serotonin and noradrenaline reuptake inhibition — the classic serotonin-syndrome trap.",
    pk: { halfLife: 6 },
  },
  {
    id: "pseudoephedrine",
    name: "Pseudoephedrine",
    cls: "Stimulant",
    evidence: "strong",
    flags: ["sympathomimetic", "stimulant", "hypertensive"],
    summary: "Direct and indirect sympathomimetic found in cold medicines.",
    pk: { halfLife: 5 },
  },
  {
    id: "valerian",
    name: "Valerian root",
    cls: "Herb",
    evidence: "limited",
    flags: ["sedative", "gabaergic"],
    summary: "Valerian extracts weakly modulate GABA-A tone and GABA transaminase; sleep benefit is small, product standardisation is poor.",
    pk: { halfLife: 1.5 },
  },
];

/* Pair-specific rules: keyed by sorted id pair. */
const pair = (a, b, severity, title, mechanism, advice) => ({
  a,
  b,
  severity,
  title,
  mechanism,
  advice,
});

export const PAIR_RULES = [
  pair(
    "phenelzine",
    "sertraline",
    "critical",
    "MAOI + SSRI: serotonin syndrome",
    "Irreversible MAO-A inhibition prevents serotonin breakdown while the SSRI blocks reuptake — synaptic serotonin can rise many-fold.",
    "Absolutely contraindicated. Requires a 2-week washout from the MAOI (5 weeks after fluoxetine) before any serotonergic drug."
  ),
  pair(
    "phenelzine",
    "fluoxetine",
    "critical",
    "MAOI + SSRI: serotonin syndrome",
    "MAO-A inhibition plus SERT blockade produces dangerous serotonin accumulation; fluoxetine's long half-life extends the risk window for weeks.",
    "Contraindicated. Fluoxetine needs a 5-week washout before an MAOI can be started."
  ),
  pair(
    "phenelzine",
    "mdma",
    "critical",
    "MAOI + MDMA: hypertensive crisis and serotonin syndrome",
    "MDMA floods the synapse with serotonin and noradrenaline while MAO-A is blocked — both pressure and serotonin surge.",
    "Never combine. Reported deaths are associated with exactly this pairing."
  ),
  pair(
    "phenelzine",
    "5-htp",
    "critical",
    "MAOI + 5-HTP: serotonin syndrome",
    "5-HTP bypasses the rate-limiting synthesis step, dumping serotonin precursor into a system that cannot break serotonin down.",
    "Contraindicated."
  ),
  pair(
    "phenelzine",
    "dextroamphetamine",
    "critical",
    "MAOI + amphetamine: hypertensive crisis",
    "Amphetamine releases noradrenaline that MAO would normally clear — blood pressure can spike within hours.",
    "Contraindicated. Wait 2 weeks after stopping the MAOI."
  ),
  pair(
    "phenelzine",
    "methylphenidate",
    "critical",
    "MAOI + methylphenidate: hypertensive crisis",
    "Catecholamine release without MAO clearance produces a sympathomimetic surge.",
    "Contraindicated."
  ),
  pair(
    "phenelzine",
    "modafinil",
    "major",
    "MAOI + modafinil: additive catecholamine load",
    "Modafinil raises dopamine and noradrenaline tone; MAOI slows their breakdown.",
    "Avoid. If unavoidable, only under specialist supervision with BP monitoring."
  ),
  pair(
    "moclobemide",
    "sertraline",
    "critical",
    "RIMA + SSRI: serotonin syndrome",
    "Even reversible MAO-A inhibition plus SERT blockade can push serotonin into a toxic range.",
    "Contraindicated; 2-week washout either direction."
  ),
  pair(
    "moclobemide",
    "mdma",
    "critical",
    "RIMA + MDMA: serotonin syndrome",
    "Both mechanisms converge on synaptic serotonin and noradrenaline.",
    "Never combine."
  ),
  pair(
    "selegiline",
    "sertraline",
    "major",
    "MAO-B inhibitor + SSRI: serotonergic risk",
    "Selegiline loses MAO-B selectivity at higher doses or with transdermal use above ~9 mg, adding MAO-A inhibition.",
    "Only with specialist oversight. Low-dose oral selegiline (≤10 mg) is lower risk but not risk-free."
  ),
  pair(
    "sertraline",
    "mdma",
    "major",
    "SSRI + MDMA: unpredictable and dangerous",
    "SERT blockade reduces MDMA's entry into neurons (blunting the effect) while raising extracellular serotonin; people then take more, increasing hyperthermia and cardiovascular risk.",
    "Do not combine. SSRIs also increase the risk of hyponatraemia and hyperthermia."
  ),
  pair(
    "fluoxetine",
    "mdma",
    "major",
    "SSRI + MDMA: blunted effect plus serotonin load",
    "Same mechanism as sertraline, with a much longer interaction window thanks to norfluoxetine.",
    "Do not combine."
  ),
  pair(
    "sertraline",
    "5-htp",
    "major",
    "SSRI + 5-HTP: additive serotonin",
    "Two independent ways to raise synaptic serotonin — SERT blockade plus unlimited precursor supply.",
    "Avoid unless a prescriber is explicitly managing it."
  ),
  pair(
    "fluoxetine",
    "5-htp",
    "major",
    "SSRI + 5-HTP: additive serotonin",
    "SERT blockade plus direct precursor loading.",
    "Avoid."
  ),
  pair(
    "escitalopram",
    "mdma",
    "major",
    "SSRI + MDMA: unpredictable serotonin load",
    "Reuptake blockade and releaser mechanisms collide.",
    "Do not combine."
  ),
  pair(
    "sertraline",
    "tramadol",
    "major",
    "SSRI + tramadol: serotonin syndrome and seizure risk",
    "Tramadol inhibits serotonin and noradrenaline reuptake on top of µ-opioid agonism; SSRIs add further serotonergic tone and lower the seizure threshold.",
    "Avoid where possible; if unavoidable, use the lowest dose and monitor for agitation, clonus and fever."
  ),
  pair(
    "fluoxetine",
    "tramadol",
    "major",
    "SSRI + tramadol: serotonin syndrome and seizure risk",
    "Fluoxetine also blocks CYP2D6, reducing tramadol's analgesic activation while raising serotonergic risk.",
    "Avoid this combination."
  ),
  pair(
    "st-johns-wort",
    "sertraline",
    "critical",
    "St John's Wort + SSRI: serotonin syndrome",
    "Hyperforin inhibits serotonin reuptake on top of the SSRI — two reuptake blockers at once.",
    "Contraindicated."
  ),
  pair(
    "st-johns-wort",
    "mdma",
    "critical",
    "St John's Wort + MDMA: serotonin syndrome",
    "Reuptake inhibition plus monoamine release with weak MAOI activity.",
    "Never combine."
  ),
  pair(
    "st-johns-wort",
    "escitalopram",
    "critical",
    "St John's Wort + SSRI: serotonin syndrome",
    "Additive serotonin reuptake inhibition.",
    "Contraindicated."
  ),
  pair(
    "st-johns-wort",
    "venlafaxine",
    "critical",
    "St John's Wort + SNRI: serotonin syndrome",
    "Additive serotonergic and noradrenergic activity.",
    "Contraindicated."
  ),
  pair(
    "lithium",
    "psilocybin",
    "critical",
    "Lithium + psilocybin: seizure risk",
    "Multiple case reports describe seizures and prolonged psychosis when lithium is combined with classical psychedelics.",
    "Avoid. If psychedelic therapy is being considered, lithium is normally tapered first under supervision."
  ),
  pair(
    "lithium",
    "lsd",
    "critical",
    "Lithium + LSD: seizure risk",
    "Same case-report signal as psilocybin: seizures and confusional states.",
    "Avoid."
  ),
  pair(
    "lithium",
    "sertraline",
    "major",
    "Lithium + SSRI: serotonin syndrome risk",
    "Lithium enhances serotonergic transmission; case reports of serotonin syndrome exist.",
    "Commonly prescribed together for bipolar depression, but requires monitoring for tremor, clonus and fever."
  ),
  pair(
    "lithium",
    "caffeine",
    "minor",
    "Lithium + caffeine: fluctuating levels",
    "Caffeine increases renal lithium clearance; stopping caffeine abruptly can raise levels into the toxic range.",
    "Keep caffeine intake stable rather than eliminating or bingeing it."
  ),
  pair(
    "alprazolam",
    "zolpidem",
    "major",
    "Benzodiazepine + Z-drug: additive sedation",
    "Both act at GABA-A (different subunit preferences) — additive respiratory depression, especially in sleep apnoea.",
    "Avoid stacking. If both are prescribed, use the lowest doses and never with alcohol."
  ),
  pair(
    "diazepam",
    "alprazolam",
    "major",
    "Two benzodiazepines: additive sedation",
    "Same receptor family, additive effect, and tolerance develops to both together.",
    "No clinical reason to combine; switching requires a supervised cross-taper."
  ),
  pair(
    "phenibut",
    "diazepam",
    "critical",
    "Phenibut + benzodiazepine: respiratory depression",
    "GABA-B agonism plus GABA-A potentiation produces deep CNS depression with a wide dose-response curve because phenibut is unregulated and inconsistently dosed.",
    "Avoid entirely. This combination appears repeatedly in overdose case reports."
  ),
  pair(
    "phenibut",
    "alprazolam",
    "critical",
    "Phenibut + benzodiazepine: respiratory depression",
    "Additive GABAergic depression across two receptor systems.",
    "Avoid entirely."
  ),
  pair(
    "phenibut",
    "zolpidem",
    "major",
    "Phenibut + Z-drug: heavy sedation",
    "GABA-B plus GABA-A α1 activity — sedation, amnesia and complex sleep behaviours.",
    "Avoid."
  ),
  pair(
    "phenibut",
    "pregabalin",
    "major",
    "Phenibut + pregabalin: additive CNS depression",
    "Calcium-channel α2δ ligation plus GABA-B agonism; both cause dizziness and sedation and both are dependence-forming.",
    "Avoid; if already dependent on one, do not add the other."
  ),
  pair(
    "phenibut",
    "gabapentin",
    "moderate",
    "Phenibut + gabapentin: additive sedation",
    "Overlapping inhibitory mechanisms and dependence potential.",
    "Avoid stacking; both need tapering if used regularly."
  ),
  pair(
    "huperzine-a",
    "donepezil",
    "critical",
    "Two cholinesterase inhibitors: cholinergic crisis",
    "Additive AChE inhibition can produce bradycardia, bronchospasm, vomiting and fasciculations.",
    "Contraindicated. Never stack natural AChE inhibitors with prescribed ones."
  ),
  pair(
    "huperzine-a",
    "galantamine",
    "critical",
    "Two cholinesterase inhibitors: cholinergic crisis",
    "Additive acetylcholinesterase inhibition.",
    "Contraindicated."
  ),
  pair(
    "memantine",
    "ketamine",
    "major",
    "Memantine + ketamine: excessive NMDA blockade",
    "Two NMDA channel blockers with a very long memantine half-life — dissociation, confusion and hypertension.",
    "Avoid. Memantine persists ~3 days after the last dose."
  ),
  pair(
    "ketamine",
    "dextroamphetamine",
    "moderate",
    "Ketamine + stimulant: cardiovascular strain",
    "Both raise heart rate and blood pressure; ketamine also increases sympathetic outflow.",
    "Monitor BP; avoid high doses of either."
  ),
  pair(
    "ketamine",
    "methylphenidate",
    "moderate",
    "Ketamine + stimulant: cardiovascular strain",
    "Additive sympathomimetic load.",
    "Monitor blood pressure."
  ),
  pair(
    "mdma",
    "dextroamphetamine",
    "major",
    "MDMA + amphetamine: hyperthermia and cardiac strain",
    "Both are monoamine releasers; stacking them multiplies hyperthermia, vasoconstriction and serotonin depletion.",
    "Avoid. Hyperthermia is the leading cause of MDMA-related death."
  ),
  pair(
    "mdma",
    "methylphenidate",
    "major",
    "MDMA + stimulant: cardiovascular and temperature risk",
    "Additive catecholamine release with different transporter profiles.",
    "Avoid."
  ),
  pair(
    "mdma",
    "modafinil",
    "major",
    "MDMA + modafinil: cardiac and temperature risk",
    "Both raise catecholamines; modafinil also masks fatigue, encouraging more dosing.",
    "Avoid."
  ),
  pair(
    "psilocybin",
    "sertraline",
    "moderate",
    "Psilocybin + SSRI: blunted or unpredictable effects",
    "Chronic SSRI use downregulates 5-HT2A receptors, typically reducing intensity; some people instead report unusually strong reactions.",
    "Not physically dangerous at usual doses, but dose-response becomes unpredictable. Tapering under supervision is the safer path."
  ),
  pair(
    "psilocybin",
    "lithium",
    "critical",
    "Psilocybin + lithium: seizure risk",
    "Case reports of seizures and prolonged psychosis.",
    "Avoid."
  ),
  pair(
    "psilocybin",
    "dextroamphetamine",
    "moderate",
    "Psychedelic + stimulant: anxiety and cardiovascular load",
    "Stimulants increase anxiety, tachycardia and thought-looping during a psychedelic experience.",
    "Better avoided, especially in people prone to anxiety."
  ),
  pair(
    "psilocybin",
    "cannabis-thc",
    "moderate",
    "Psychedelic + cannabis: intensified anxiety",
    "THC increases thought disorganisation and anxiety during psychedelic states.",
    "If used at all, keep cannabis minimal and have a sober sitter."
  ),
  pair(
    "tianeptine",
    "sertraline",
    "moderate",
    "Tianeptine + SSRI: unclear serotonergic and opioid interaction",
    "Tianeptine enhances serotonin reuptake (opposing the SSRI) while agonising µ-opioid receptors.",
    "Avoid combining; the pharmacology pulls in opposite directions and dependence risk compounds."
  ),
  pair(
    "tianeptine",
    "tramadol",
    "major",
    "Tianeptine + tramadol: additive opioid effect",
    "Two µ-opioid agonists, each with additional monoaminergic activity.",
    "Avoid — respiratory depression and seizure risk both rise."
  ),
  pair(
    "tianeptine",
    "diazepam",
    "major",
    "Tianeptine + benzodiazepine: additive CNS depression",
    "Opioid agonism plus GABA-A potentiation.",
    "Avoid; respiratory depression risk."
  ),
  pair(
    "bupropion",
    "sertraline",
    "moderate",
    "Bupropion + SSRI: seizure threshold and CYP2D6",
    "Bupropion lowers the seizure threshold and inhibits CYP2D6, raising some SSRI and metabolite levels.",
    "A common clinical combination, but start low and watch for tremor, agitation and seizures."
  ),
  pair(
    "bupropion",
    "fluoxetine",
    "major",
    "Bupropion + fluoxetine: seizure risk and doubled exposure",
    "Fluoxetine inhibits CYP2D6, raising bupropion and hydroxybupropion levels; both drugs lower the seizure threshold.",
    "Avoid unless supervised with careful dose reduction."
  ),
  pair(
    "bupropion",
    "tramadol",
    "major",
    "Bupropion + tramadol: seizure risk",
    "Both lower the seizure threshold; bupropion also blocks tramadol's CYP2D6 activation.",
    "Avoid."
  ),
  pair(
    "caffeine",
    "modafinil",
    "moderate",
    "Caffeine + modafinil: overstimulation",
    "Additive dopaminergic and adenosinergic effects — anxiety, tachycardia, insomnia.",
    "Reduce caffeine on modafinil days; many people need half their usual intake."
  ),
  pair(
    "caffeine",
    "methylphenidate",
    "moderate",
    "Caffeine + stimulant: cardiovascular load",
    "Additive sympathetic tone and heart-rate elevation.",
    "Keep caffeine low and avoid late-day dosing."
  ),
  pair(
    "caffeine",
    "dextroamphetamine",
    "moderate",
    "Caffeine + amphetamine: cardiovascular load",
    "Both raise heart rate and blood pressure; caffeine also masks the stimulant's appetite suppression.",
    "Keep caffeine low, especially before exercise."
  ),
  pair(
    "caffeine",
    "nicotine",
    "minor",
    "Caffeine + nicotine: additive sympathomimetic effect",
    "Both increase heart rate and blood pressure; nicotine also accelerates caffeine metabolism slightly.",
    "Usually tolerated, but watch palpitations."
  ),
  pair(
    "caffeine",
    "l-theanine",
    "minor",
    "Caffeine + L-theanine: synergistic calm focus",
    "Theanine's alpha-wave activity smooths caffeine jitter without reducing alertness.",
    "A commonly used 1:2 theanine:caffeine ratio works well for most people."
  ),
  pair(
    "caffeine",
    "melatonin",
    "moderate",
    "Caffeine + melatonin: opposing signals",
    "Caffeine blocks adenosine (wake signal) while melatonin advances circadian phase — the combination produces poor-quality sleep onset.",
    "Keep caffeine at least 8–10 hours before bed."
  ),
  pair(
    "melatonin",
    "fluoxetine",
    "moderate",
    "Melatonin + fluoxetine: elevated melatonin levels",
    "Fluoxetine inhibits CYP1A2 and CYP2C19, slowing melatonin metabolism.",
    "Use lower melatonin doses (0.3 mg) and expect stronger effects."
  ),
  pair(
    "melatonin",
    "suvorexant",
    "minor",
    "Melatonin + orexin antagonist: additive sleepiness",
    "Two different sleep-promoting mechanisms stack.",
    "Usually fine, but expect more morning grogginess; start with low doses of each."
  ),
  pair(
    "cbd",
    "sertraline",
    "moderate",
    "CBD + SSRI: raised SSRI levels",
    "CBD inhibits CYP2C19 and CYP3A4, which metabolise sertraline and escitalopram.",
    "Monitor for nausea, tremor and drowsiness; consider a lower SSRI dose if CBD is regular."
  ),
  pair(
    "cbd",
    "alprazolam",
    "moderate",
    "CBD + benzodiazepine: increased sedation",
    "CYP3A4 inhibition raises alprazolam exposure; additive sedation is common.",
    "Avoid driving; reduce the benzodiazepine dose under supervision."
  ),
  pair(
    "cbd",
    "zolpidem",
    "moderate",
    "CBD + Z-drug: additive sedation",
    "CYP3A4 inhibition and additive CNS depression.",
    "Avoid combining, especially at high CBD doses."
  ),
  pair(
    "cbd",
    "lamotrigine",
    "moderate",
    "CBD + lamotrigine: raised lamotrigine levels",
    "CBD inhibits the glucuronidation pathways that clear lamotrigine, raising rash risk.",
    "Clinically relevant in epilepsy; requires level monitoring."
  ),
  pair(
    "propranolol",
    "dextroamphetamine",
    "moderate",
    "Beta blocker + amphetamine: unpredictable cardiovascular response",
    "Non-selective beta blockade can leave α-mediated vasoconstriction unopposed, raising blood pressure during stimulant use.",
    "Use cardioselective beta blockers if a blocker is genuinely needed."
  ),
  pair(
    "propranolol",
    "clonidine",
    "moderate",
    "Beta blocker + α2 agonist: bradycardia and hypotension",
    "Both lower heart rate and blood pressure; withdrawal from either can cause rebound hypertension.",
    "Monitor HR/BP; never stop both abruptly."
  ),
  pair(
    "clonidine",
    "diazepam",
    "moderate",
    "Clonidine + benzodiazepine: additive sedation",
    "Central α2 agonism plus GABA-A potentiation — sedation, hypotension and falls in older adults.",
    "Use lowest doses; avoid driving."
  ),
  pair(
    "ashwagandha",
    "diazepam",
    "moderate",
    "Ashwagandha + benzodiazepine: additive sedation",
    "Withanolides have GABA-mimetic activity that stacks with benzodiazepines.",
    "Reduce the benzodiazepine dose cautiously; watch for excessive drowsiness."
  ),
  pair(
    "ashwagandha",
    "alprazolam",
    "moderate",
    "Ashwagandha + benzodiazepine: additive sedation",
    "GABAergic additivity.",
    "Monitor sedation; avoid driving."
  ),
  pair(
    "ashwagandha",
    "zolpidem",
    "moderate",
    "Ashwagandha + Z-drug: additive sedation",
    "GABA-mimetic withanolides plus α1-selective hypnotic.",
    "Avoid stacking at bedtime."
  ),
  pair(
    "valerian",
    "zolpidem",
    "moderate",
    "Valerian + Z-drug: additive sedation",
    "Both increase GABAergic inhibitory tone.",
    "Avoid combining."
  ),
  pair(
    "l-theanine",
    "diazepam",
    "minor",
    "L-theanine + benzodiazepine: mild additive calm",
    "Weak glutamatergic modulation adds to GABAergic sedation.",
    "Usually mild; be aware if driving."
  ),
  pair(
    "5-htp",
    "tramadol",
    "major",
    "5-HTP + tramadol: serotonin syndrome",
    "Direct precursor loading plus reuptake inhibition.",
    "Avoid."
  ),
  pair(
    "5-htp",
    "mdma",
    "major",
    "5-HTP + MDMA: serotonin overload",
    "Precursor supply plus massive release — a documented route to serotonin syndrome.",
    "Never combine. Many people take 5-HTP after MDMA, which is also risky during the depletion window."
  ),
  pair(
    "sam-e",
    "sertraline",
    "major",
    "SAM-e + SSRI: additive serotonergic effect",
    "SAM-e increases serotonin, dopamine and noradrenaline turnover, adding to reuptake blockade.",
    "Avoid unless a clinician is managing it; serotonin syndrome has been reported."
  ),
  pair(
    "sam-e",
    "mdma",
    "major",
    "SAM-e + MDMA: serotonin load",
    "Methyl donation supports catecholamine and serotonin synthesis on top of release.",
    "Avoid."
  ),
  pair(
    "l-tyrosine",
    "phenelzine",
    "major",
    "Tyrosine + MAOI: hypertensive risk",
    "Precursor loading plus blocked noradrenaline breakdown.",
    "Avoid; the same logic as the tyramine-restricted diet."
  ),
  pair(
    "l-tyrosine",
    "dextroamphetamine",
    "minor",
    "Tyrosine + amphetamine: additive catecholamines",
    "More substrate for dopamine/noradrenaline synthesis alongside a releaser.",
    "Usually mild; watch for jitteriness and elevated BP."
  ),
  pair(
    "nicotine",
    "caffeine",
    "minor",
    "Nicotine + caffeine: additive sympathetic tone",
    "Both raise heart rate and blood pressure.",
    "Reduce one of them if palpitations occur."
  ),
  pair(
    "modafinil",
    "escitalopram",
    "minor",
    "Modafinil + SSRI: CYP3A4 and 2C19 interplay",
    "Modafinil weakly induces CYP3A4 and inhibits CYP2C19, slightly altering escitalopram levels.",
    "Usually not clinically significant; monitor for changed side effects."
  ),
  pair(
    "modafinil",
    "cbd",
    "moderate",
    "Modafinil + CBD: reciprocal CYP3A4 effects",
    "CBD inhibits CYP3A4 while modafinil induces it — levels of both become unpredictable.",
    "Separate dosing and monitor for changed effects."
  ),
  pair(
    "pregabalin",
    "tramadol",
    "major",
    "Pregabalin + opioid: respiratory depression",
    "Gabapentinoids and opioids together increase the risk of fatal respiratory depression — a well-documented cohort signal.",
    "Avoid. If unavoidable, use the lowest doses, avoid other depressants, and ensure naloxone is available."
  ),
  pair(
    "gabapentin",
    "tramadol",
    "major",
    "Gabapentin + opioid: respiratory depression",
    "Same gabapentinoid-opioid signal; risk rises with age and respiratory disease.",
    "Avoid where possible; never combine with alcohol or benzodiazepines as well."
  ),
  pair(
    "pregabalin",
    "alcohol",
    "major",
    "Pregabalin + alcohol: additive CNS depression",
    "Both reduce excitatory transmitter release and impair coordination.",
    "Avoid; the combination markedly increases sedation and accident risk."
  ),
  pair(
    "gabapentin",
    "alcohol",
    "moderate",
    "Gabapentin + alcohol: additive sedation",
    "Additive dizziness and motor impairment.",
    "Avoid driving; limit alcohol."
  ),
  pair(
    "zolpidem",
    "alcohol",
    "critical",
    "Z-drug + alcohol: complex sleep behaviours",
    "Alcohol adds GABA-A potentiation, producing amnesia, sleepwalking and respiratory depression.",
    "Never combine. This pairing is over-represented in sleep-driving reports."
  ),
  pair(
    "diazepam",
    "alcohol",
    "critical",
    "Benzodiazepine + alcohol: respiratory depression",
    "Both potentiate GABA-A; alcohol also impairs the arousal response to hypercapnia.",
    "Never combine."
  ),
  pair(
    "alprazolam",
    "alcohol",
    "critical",
    "Benzodiazepine + alcohol: respiratory depression",
    "The most common lethal sedative combination.",
    "Never combine."
  ),
  pair(
    "phenibut",
    "alcohol",
    "critical",
    "Phenibut + alcohol: respiratory depression",
    "GABA-B agonism plus GABA-A potentiation, with unpredictable phenibut dosing.",
    "Never combine."
  ),
  pair(
    "tramadol",
    "alcohol",
    "major",
    "Opioid + alcohol: respiratory depression",
    "Additive respiratory depression plus impaired judgement about further dosing.",
    "Avoid."
  ),
  pair(
    "ketamine",
    "alcohol",
    "major",
    "Ketamine + alcohol: aspiration and sedation risk",
    "Both impair protective reflexes; ketamine's dissociation removes the ability to manage vomiting.",
    "Avoid."
  ),
  pair(
    "mdma",
    "alcohol",
    "moderate",
    "MDMA + alcohol: dehydration and cardiac strain",
    "Alcohol worsens dehydration and hyponatraemia risk while increasing cardiac workload.",
    "Keep alcohol minimal and monitor fluid intake (not excessive water either)."
  ),
  pair(
    "psilocybin",
    "alcohol",
    "moderate",
    "Psychedelic + alcohol: unpredictable experience",
    "Alcohol increases disorientation, nausea and poor judgement during a psychedelic state.",
    "Better avoided."
  ),
];

/* Symmetric class-level rules applied via compound flags. */
export const FLAG_RULES = [
  { a: "maoi", b: "serotonergic", severity: "critical", title: "MAOI + serotonergic drug: serotonin syndrome", mechanism: "Preventing serotonin breakdown while blocking its reuptake can push synaptic serotonin to toxic levels.", advice: "Contraindicated. Observe 2-week washouts (5 weeks after fluoxetine)." },
  { a: "maoi", b: "serotonergic-weak", severity: "major", title: "MAOI + serotonergic activity: elevated risk", mechanism: "Even weak serotonergic activity adds to MAO inhibition.", advice: "Avoid; discuss alternatives with a prescriber." },
  { a: "maoi", b: "sympathomimetic", severity: "critical", title: "MAOI + sympathomimetic: hypertensive crisis", mechanism: "Noradrenaline cannot be broken down while release is stimulated — blood pressure can spike dangerously.", advice: "Contraindicated, including cold medicines containing pseudoephedrine." },
  { a: "maoi", b: "stimulant", severity: "critical", title: "MAOI + stimulant: hypertensive crisis", mechanism: "Catecholamine release without MAO clearance.", advice: "Contraindicated." },
  { a: "maoi", b: "dopaminergic", severity: "major", title: "MAOI + dopaminergic drug: additive catecholamines", mechanism: "DA and NE breakdown is slowed while release or reuptake blockade continues.", advice: "Only under specialist supervision." },
  { a: "maoi", b: "opioid", severity: "major", title: "MAOI + opioid: serotonin and respiratory risk", mechanism: "Some opioids (tramadol, meperidine) add serotonergic activity; all add respiratory depression.", advice: "Avoid tramadol and meperidine entirely; other opioids only with supervision." },
  { a: "serotonergic", b: "serotonergic", severity: "major", title: "Two serotonergic drugs: additive serotonin", mechanism: "Independent mechanisms raising synaptic serotonin stack multiplicatively, not additively.", advice: "Avoid combining unless a prescriber is explicitly managing it. Know the signs: agitation, clonus, fever, sweating." },
  { a: "serotonergic", b: "psychedelic", severity: "major", title: "Serotonergic drug + psychedelic: unpredictable load", mechanism: "Both act on serotonin signalling; tolerance and receptor downregulation make effects unpredictable.", advice: "Do not combine casually." },
  { a: "sedative", b: "respiratory-depressant", severity: "critical", title: "Sedative + respiratory depressant: overdose risk", mechanism: "Additive suppression of brainstem respiratory drive — the final common pathway of sedative overdose.", advice: "Never combine. If dependent, do not stop abruptly either." },
  { a: "opioid", b: "sedative", severity: "critical", title: "Opioid + sedative: respiratory depression", mechanism: "Opioids blunt the CO2 response; sedatives further suppress arousal and airway tone.", advice: "Avoid. If prescribed together, ensure naloxone is available and never add alcohol." },
  { a: "opioid", b: "respiratory-depressant", severity: "critical", title: "Opioid + respiratory depressant", mechanism: "Overlapping suppression of respiratory centres.", advice: "Avoid." },
  { a: "sedative", b: "sedative", severity: "major", title: "Two sedatives: additive CNS depression", mechanism: "Independent inhibitory mechanisms converge on arousal and breathing.", advice: "Use the lowest doses; avoid alcohol; do not drive." },
  { a: "calcium-channel-ligand", b: "respiratory-depressant", severity: "major", title: "Gabapentinoid + respiratory depressant", mechanism: "Gabapentinoids increase opioid-related respiratory depression risk, documented in large cohort studies.", advice: "Avoid; if unavoidable, use minimal doses and monitor breathing." },
  { a: "calcium-channel-ligand", b: "sedative", severity: "moderate", title: "Gabapentinoid + sedative: additive sedation", mechanism: "Both reduce excitatory transmitter release or enhance inhibition.", advice: "Expect more sedation and dizziness; avoid driving." },
  { a: "gabaergic", b: "gaba-modulator", severity: "moderate", title: "GABAergic drug + GABA modulator: additive inhibition", mechanism: "Different sites on the same inhibitory system.", advice: "Reduce doses and monitor sedation." },
  { a: "gaba-modulator", b: "sedative", severity: "moderate", title: "GABA modulator + sedative: additive sedation", mechanism: "Overlapping inhibitory tone.", advice: "Avoid stacking at bedtime." },
  { a: "qt-risk", b: "qt-risk", severity: "major", title: "Two QT-prolonging drugs: arrhythmia risk", mechanism: "Additive hERG blockade slows repolarisation; risk rises with hypokalaemia and bradycardia.", advice: "Avoid; if unavoidable, get an ECG and keep electrolytes normal." },
  { a: "bleeding-risk", b: "bleeding-risk", severity: "major", title: "Two drugs increasing bleeding risk", mechanism: "Additive impairment of platelet function.", advice: "Avoid NSAIDs; report unusual bruising or black stools." },
  { a: "bleeding-risk", b: "antiplatelet-weak", severity: "moderate", title: "Serotonergic/antiplatelet drug + antiplatelet agent", mechanism: "Platelet serotonin depletion plus direct antiplatelet activity.", advice: "Monitor for bruising; avoid before surgery." },
  { a: "antiplatelet-weak", b: "antiplatelet-weak", severity: "minor", title: "Additive mild antiplatelet effect", mechanism: "Several natural agents mildly inhibit platelet aggregation.", advice: "Stop 2 weeks before planned surgery." },
  { a: "cyp3a4-inhibitor", b: "cyp3a4-substrate", severity: "moderate", title: "CYP3A4 inhibition raises the other drug's level", mechanism: "The substrate's clearance falls, increasing exposure and side effects.", advice: "Reduce the substrate dose or choose an alternative pathway." },
  { a: "cyp2d6-inhibitor", b: "cyp2d6-substrate", severity: "moderate", title: "CYP2D6 inhibition raises the other drug's level", mechanism: "Reduced first-pass and systemic clearance.", advice: "Consider dose reduction; watch for typical adverse effects." },
  { a: "cyp2c19-inhibitor", b: "cyp2c19-substrate", severity: "moderate", title: "CYP2C19 inhibition raises the other drug's level", mechanism: "Slower metabolism of the substrate.", advice: "Monitor for increased side effects." },
  { a: "cyp3a4-ind", b: "cyp3a4-substrate", severity: "moderate", title: "Enzyme induction lowers the other drug's level", mechanism: "Induction accelerates clearance — the other drug may stop working.", advice: "Expect reduced efficacy; dose adjustment or alternative needed." },
  { a: "hepatotoxic-weak", b: "hepatotoxic-weak", severity: "moderate", title: "Two potential liver stressors", mechanism: "Both agents have hepatotoxicity signals; combined risk is not well quantified.", advice: "Avoid stacking; get baseline liver enzymes if used long-term." },
  { a: "renal-clearance", b: "renal-clearance", severity: "minor", title: "Two renally cleared drugs", mechanism: "Both depend on kidney clearance; dehydration or renal impairment raises exposure.", advice: "Stay hydrated; dose-adjust in renal impairment." },
  { a: "narrow-index", b: "renal-clearance", severity: "major", title: "Narrow-index drug + renal clearance change", mechanism: "Lithium's clearance is sodium- and flow-dependent; anything altering renal function shifts levels.", advice: "Monitor levels closely; avoid dehydration and NSAIDs." },
  { a: "cholinergic", b: "cholinergic", severity: "moderate", title: "Two cholinergic agents: excess acetylcholine", mechanism: "Additive AChE inhibition or choline loading can cause bradycardia, cramps and diarrhoea.", advice: "Avoid combining AChE inhibitors; reduce choline doses if GI effects appear." },
  { a: "cholinergic", b: "bradycardia", severity: "moderate", title: "Cholinergic drug + bradycardic agent", mechanism: "Additive slowing of heart rate.", advice: "Monitor pulse; caution with heart block." },
  { a: "stimulant", b: "sympathomimetic", severity: "moderate", title: "Two sympathomimetics: cardiovascular strain", mechanism: "Additive heart-rate and blood-pressure elevation.", advice: "Keep total dose low; avoid during intense exercise or heat." },
  { a: "stimulant", b: "stimulant", severity: "moderate", title: "Two stimulants: overstimulation", mechanism: "Additive catecholamine tone — anxiety, insomnia, palpitations, hypertension.", advice: "Stagger or reduce doses; avoid late-day use." },
  { a: "stimulant", b: "hypertensive", severity: "moderate", title: "Stimulant + blood-pressure-raising drug", mechanism: "Additive pressor effect.", advice: "Monitor BP; avoid in uncontrolled hypertension." },
  { a: "stimulant", b: "seizure-risk", severity: "moderate", title: "Stimulant + lowered seizure threshold", mechanism: "Both increase excitability and reduce seizure threshold.", advice: "Avoid in anyone with a seizure history." },
  { a: "stimulant", b: "anxiogenic", severity: "minor", title: "Additive anxiety risk", mechanism: "Both increase sympathetic arousal and vigilance.", advice: "Reduce doses if jitteriness or panic appears." },
  { a: "beta-blocker", b: "stimulant", severity: "minor", title: "Beta blocker + stimulant: blunted and shifted response", mechanism: "Blockade can leave α-mediated vasoconstriction unopposed and mask tachycardia.", advice: "Prefer cardioselective blockers; monitor BP." },
  { a: "alpha2-agonist", b: "sedative", severity: "moderate", title: "α2 agonist + sedative: additive sedation", mechanism: "Reduced noradrenergic outflow plus GABAergic sedation.", advice: "Watch for hypotension and falls in older adults." },
  { a: "hypotensive", b: "hypotensive", severity: "minor", title: "Two blood-pressure-lowering drugs", mechanism: "Additive hypotension.", advice: "Rise slowly from sitting; monitor BP." },
  { a: "hypotensive", b: "vasodilator", severity: "minor", title: "Additive vasodilation", mechanism: "Both lower vascular tone.", advice: "Watch for dizziness on standing." },
  { a: "glucose-lowering", b: "masks-hypoglycemia", severity: "moderate", title: "Glucose-lowering drug + masked hypoglycaemia warning signs", mechanism: "Beta blockade hides tremor and palpitations, leaving confusion as the first sign.", advice: "Monitor glucose more often; educate on non-adrenergic symptoms." },
  { a: "methyl-donor", b: "methyl-donor-competition", severity: "minor", title: "Methyl donor + high-dose NAD precursor", mechanism: "Both consume methyl groups; large doses can deplete methylation capacity.", advice: "Keep doses moderate; consider adding B12/folate." },
  { a: "addictive", b: "addictive", severity: "moderate", title: "Two dependence-forming drugs", mechanism: "Reinforcement and withdrawal interact; tapering both at once is harder.", advice: "Never stop both abruptly; get support." },
  { a: "dependence-risk", b: "dependence-risk", severity: "moderate", title: "Two dependence-forming drugs", mechanism: "Overlapping withdrawal syndromes make self-managed tapers risky.", advice: "Taper one at a time, with medical support for sedatives." },
];

const normalise = (s) => String(s || "").toLowerCase().trim();

function pairKey(a, b) {
  return [normalise(a), normalise(b)].sort().join("|");
}

const PAIR_INDEX = new Map();
for (const rule of PAIR_RULES) {
  PAIR_INDEX.set(pairKey(rule.a, rule.b), rule);
}

/**
 * Evaluate a list of substances.
 * @param {Array} substances compound-like objects with id, name, flags
 * @returns {Array} findings sorted by severity
 */
export function checkInteractions(substances) {
  const list = (substances || []).filter(Boolean);
  const findings = [];
  const seen = new Set();

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const A = list[i];
      const B = list[j];
      if (!A || !B || A.id === B.id) continue;

      const specific = PAIR_INDEX.get(pairKey(A.id, B.id));
      if (specific) {
        const key = `pair:${pairKey(A.id, B.id)}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push({
            id: key,
            severity: specific.severity,
            title: specific.title,
            mechanism: specific.mechanism,
            advice: specific.advice,
            a: A.name,
            b: B.name,
            source: "specific",
          });
        }
        continue;
      }

      const flagsA = new Set(A.flags || []);
      const flagsB = new Set(B.flags || []);
      for (const rule of FLAG_RULES) {
        const direct = flagsA.has(rule.a) && flagsB.has(rule.b);
        const reverse = flagsA.has(rule.b) && flagsB.has(rule.a);
        if (!direct && !reverse) continue;
        const key = `flag:${rule.a}:${rule.b}:${[A.id, B.id].sort().join("|")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          id: key,
          severity: rule.severity,
          title: rule.title,
          mechanism: rule.mechanism,
          advice: rule.advice,
          a: A.name,
          b: B.name,
          source: "class",
        });
      }
    }
  }

  findings.sort((x, y) => (SEVERITY[y.severity]?.rank || 0) - (SEVERITY[x.severity]?.rank || 0) || x.title.localeCompare(y.title));
  return findings;
}

export function worstSeverity(findings) {
  let worst = null;
  for (const f of findings) {
    if (!worst || (SEVERITY[f.severity]?.rank || 0) > (SEVERITY[worst]?.rank || 0)) worst = f.severity;
  }
  return worst;
}