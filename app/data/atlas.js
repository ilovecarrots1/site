/* Biochemical atlas — pathways and molecular targets.
 * Every step is a real enzymatic or signalling event; the "drugs" arrays hold compound ids
 * from the local database so the atlas can cross-link to compound pages.
 */

export const ATLAS_GROUPS = [
  "Neurotransmitter synthesis",
  "Neurotransmitter clearance",
  "Receptor signalling",
  "Hormone axis",
  "Growth & bone",
];

export const PATHWAYS = [
  {
    id: "dopamine-synthesis",
    name: "Dopamine synthesis and packaging",
    group: "Neurotransmitter synthesis",
    summary:
      "Tyrosine is converted in two steps into dopamine, then pumped into vesicles. The rate-limiting enzyme is feedback-inhibited by dopamine itself, which is why precursor loading has a ceiling.",
    location: "VTA and substantia nigra neurons, plus sympathetic nerve terminals",
    rateLimiting: "Tyrosine hydroxylase (TH)",
    systems: ["dopamine", "noradrenaline"],
    organs: ["brain", "adrenals"],
    steps: [
      { label: "Tyrosine uptake", enzyme: "—", cofactor: "—", detail: "L-tyrosine enters the neuron through aromatic amino-acid transporters; dietary availability matters only when intake is very low.", drugs: ["l-tyrosine"] },
      { label: "Tyrosine → L-DOPA", enzyme: "Tyrosine hydroxylase (TH)", cofactor: "Tetrahydrobiopterin (BH4), Fe²⁺, O₂", detail: "The rate-limiting step. TH activity is controlled by phosphorylation and by end-product inhibition from cytosolic dopamine.", drugs: ["levodopa", "bromantane"] },
      { label: "L-DOPA → dopamine", enzyme: "Aromatic amino-acid decarboxylase (AADC)", cofactor: "Pyridoxal-5-phosphate (B6)", detail: "Fast and not rate-limiting; in the periphery carbidopa blocks the same enzyme to spare central levodopa.", drugs: ["levodopa"] },
      { label: "Vesicular packaging", enzyme: "VMAT2", cofactor: "pH gradient, ATP", detail: "Dopamine is concentrated into synaptic vesicles; reserpine-like drugs empty these stores, amphetamines reverse the transporter.", drugs: ["dextroamphetamine", "lisdexamfetamine", "methylphenidate"] },
      { label: "Release and reuptake", enzyme: "DAT (SLC6A3)", cofactor: "Na⁺/Cl⁻ gradient", detail: "Reuptake is the main clearance route in the striatum and prefrontal cortex; blockade prolongs the signal.", drugs: ["methylphenidate", "modafinil", "bupropion"] },
    ],
    links: [{ id: "catecholamine-clearance", note: "Downstream degradation by MAO and COMT" }],
    pubmed: "tyrosine hydroxylase dopamine synthesis regulation",
  },
  {
    id: "serotonin-synthesis",
    name: "Serotonin synthesis and vesicular storage",
    group: "Neurotransmitter synthesis",
    summary:
      "Tryptophan hydroxylase is the rate-limiting step and is only about half-saturated, so tryptophan availability and enzyme induction both shift output. Most body serotonin is made in enterochromaffin cells, not the brain.",
    location: "Raphe nuclei; gut enterochromaffin cells; pineal gland",
    rateLimiting: "Tryptophan hydroxylase 2 (TPH2) in brain",
    systems: ["serotonin", "dopamine"],
    organs: ["brain", "gut", "pineal"],
    steps: [
      { label: "Tryptophan transport", enzyme: "—", cofactor: "—", detail: "Tryptophan competes with other large neutral amino acids for the same blood-brain-barrier transporter, so a tryptophan-heavy meal alone rarely changes brain levels.", drugs: ["5-htp"] },
      { label: "Tryptophan → 5-HTP", enzyme: "Tryptophan hydroxylase 1/2", cofactor: "BH4, Fe²⁺, O₂", detail: "The committed step; TPH2 governs brain serotonin and is regulated transcriptionally by stress and glucocorticoids.", drugs: ["5-htp"] },
      { label: "5-HTP → serotonin", enzyme: "AADC", cofactor: "Vitamin B6", detail: "Unregulated: excess 5-HTP is converted wherever AADC is present, which is why high doses cause gut serotonin effects before any mood change.", drugs: ["5-htp", "levodopa"] },
      { label: "Vesicular storage", enzyme: "VMAT2", cofactor: "pH gradient", detail: "Serotonin is stored alongside dopamine in the same vesicles in some neurons.", drugs: ["dextroamphetamine"] },
      { label: "Melatonin branch (pineal)", enzyme: "AANAT then ASMT", cofactor: "Acetyl-CoA, SAM", detail: "In the pineal, serotonin is acetylated and methylated to melatonin on a light-dark cycle.", drugs: ["melatonin", "ramelteon"] },
    ],
    links: [{ id: "kynurenine-pathway", note: "Competing fate for tryptophan" }],
    pubmed: "tryptophan hydroxylase serotonin synthesis regulation",
  },
  {
    id: "gaba-shunt",
    name: "GABA synthesis and the GABA shunt",
    group: "Neurotransmitter synthesis",
    summary:
      "GABA comes from glutamate in one decarboxylation step, and returns to the Krebs cycle through the GABA shunt. Synthesis and degradation are the target of several anticonvulsants and of the 'GABA supplement' market.",
    location: "GABAergic interneurons; pancreas beta cells",
    rateLimiting: "Glutamate decarboxylase (GAD65/67)",
    systems: ["gaba", "glutamate"],
    organs: ["brain", "pancreas"],
    steps: [
      { label: "Glutamine → glutamate", enzyme: "Phosphate-activated glutaminase", cofactor: "—", detail: "Neurons lack the full TCA capacity needed to make glutamate de novo, so glutamine from astrocytes is the main carbon source.", drugs: [] },
      { label: "Glutamate → GABA", enzyme: "Glutamate decarboxylase (GAD)", cofactor: "Pyridoxal-5-phosphate (B6)", detail: "The defining step of GABAergic identity; GAD67 provides basal tone, GAD65 provides vesicular GABA for phasic release.", drugs: ["pregabalin", "gabapentin"] },
      { label: "Vesicular release", enzyme: "VGAT (VIAAT)", cofactor: "pH gradient", detail: "GABA is packaged into vesicles and released at synapses onto GABA-A and GABA-B receptors.", drugs: ["alprazolam", "diazepam", "phenibut", "zolpidem"] },
      { label: "Reuptake", enzyme: "GAT1-GAT4", cofactor: "Na⁺/Cl⁻ gradient", detail: "Astrocytic GAT3 and neuronal GAT1 clear GABA and terminate the signal; tiagabine blocks GAT1 clinically.", drugs: ["picamilon", "valproate"] },
      { label: "GABA shunt", enzyme: "GABA-T then SSADH", cofactor: "PLP, NAD⁺", detail: "GABA is transaminated to succinic semialdehyde and oxidised to succinate, re-entering the TCA cycle. Vigabatrin blocks GABA-T irreversibly.", drugs: ["valproate"] },
    ],
    links: [{ id: "glutamate-glutamine-cycle", note: "Shared glutamine/glutamate precursor pool" }],
    pubmed: "glutamate decarboxylase GABA synthesis GABA shunt",
  },
  {
    id: "glutamate-glutamine-cycle",
    name: "Glutamate-glutamine cycle",
    group: "Neurotransmitter synthesis",
    summary:
      "The most abundant excitatory transmitter has no direct reuptake back into neurons: astrocytes take up glutamate, convert it to glutamine, and hand it back. This loop is also where ammonia detoxification and excitotoxicity converge.",
    location: "Cortical and hippocampal synapses; astrocyte-neuron interface",
    rateLimiting: "Glutamine synthetase (astrocytic)",
    systems: ["glutamate", "gaba"],
    organs: ["brain", "liver"],
    steps: [
      { label: "Vesicular release", enzyme: "VGLUT1-3", cofactor: "pH gradient", detail: "Glutamate is concentrated in vesicles and released onto AMPA, NMDA and metabotropic receptors.", drugs: ["memantine", "ketamine"] },
      { label: "Reuptake into astrocytes", enzyme: "EAAT1/EAAT2 (GLT-1)", cofactor: "Na⁺/K⁺ gradient", detail: "EAAT2 clears most synaptic glutamate; failure produces excitotoxic injury, as in ischaemia.", drugs: ["memantine", "n-acetylcysteine"] },
      { label: "Glutamate → glutamine", enzyme: "Glutamine synthetase", cofactor: "ATP, Mg²⁺, NH₄⁺", detail: "Only astrocytes express this enzyme, making them the obligatory ammonia sink of the brain.", drugs: [] },
      { label: "Glutamine shuttle back", enzyme: "System N / SNAT transporters", cofactor: "—", detail: "Glutamine returns to neurons and is hydrolysed back to glutamate, completing the loop.", drugs: [] },
      { label: "Receptor-level modulation", enzyme: "—", cofactor: "Glycine or D-serine at NMDA", detail: "NMDA receptors need a co-agonist; sarcosine and D-serine availability therefore modulate glutamatergic signalling.", drugs: ["sarcosine", "memantine", "lamotrigine"] },
    ],
    links: [{ id: "gaba-shunt", note: "GABA is made directly from glutamate" }],
    pubmed: "glutamate glutamine cycle astrocyte GLT-1 excitotoxicity",
  },
  {
    id: "acetylcholine-synthesis",
    name: "Acetylcholine synthesis and hydrolysis",
    group: "Neurotransmitter synthesis",
    summary:
      "Choline acetyltransferase builds acetylcholine from choline and acetyl-CoA; acetylcholinesterase destroys it within milliseconds. Boosting the precursor only helps when choline supply is genuinely limiting.",
    location: "Basal forebrain, striatal interneurons, neuromuscular junction",
    rateLimiting: "Choline acetyltransferase (ChAT) — substrate-limited by choline uptake",
    systems: ["acetylcholine"],
    organs: ["brain", "skeletal-muscle"],
    steps: [
      { label: "Choline uptake", enzyme: "CHT1 (high-affinity choline transporter)", cofactor: "Na⁺ gradient", detail: "The true rate-limiting element: cholinergic neurons cannot synthesise choline and depend on uptake and on membrane phospholipid breakdown.", drugs: ["citicoline", "alpha-gpc"] },
      { label: "Acetylcholine synthesis", enzyme: "Choline acetyltransferase (ChAT)", cofactor: "Acetyl-CoA", detail: "Acetyl-CoA comes from mitochondrial pyruvate; ChAT activity tracks firing rate rather than being independently regulated.", drugs: ["citicoline", "alpha-gpc"] },
      { label: "Vesicular packaging", enzyme: "VAChT", cofactor: "pH gradient", detail: "Vesamicol blocks VAChT experimentally; packaging is the last presynaptic control point.", drugs: [] },
      { label: "Receptor action", enzyme: "—", cofactor: "—", detail: "Nicotinic receptors are ligand-gated cation channels; muscarinic M1-M5 are GPCRs with different central and peripheral roles.", drugs: ["nicotine", "donepezil", "galantamine"] },
      { label: "Hydrolysis", enzyme: "Acetylcholinesterase (AChE)", cofactor: "—", detail: "Cleavage is one of the fastest enzyme reactions known, ending the signal in under a millisecond.", drugs: ["donepezil", "galantamine", "huperzine-a"] },
    ],
    links: [{ id: "camp-pka-creb", note: "M1/M3 receptors signal through Gq and calcium" }],
    pubmed: "choline acetyltransferase acetylcholine synthesis acetylcholinesterase",
  },
  {
    id: "histamine-synthesis",
    name: "Histamine synthesis and the tuberomammillary nucleus",
    group: "Neurotransmitter synthesis",
    summary:
      "The single histaminergic nucleus in the brain projects everywhere and drives wakefulness. Histidine decarboxylase makes histamine in one step, and methylation terminates it.",
    location: "Tuberomammillary nucleus of the posterior hypothalamus; mast cells; enterochromaffin-like cells",
    rateLimiting: "Histidine decarboxylase (HDC)",
    systems: ["histamine", "orexin"],
    organs: ["brain", "hypothalamus", "stomach", "skin"],
    steps: [
      { label: "Histidine uptake", enzyme: "—", cofactor: "—", detail: "L-histidine enters neurons and mast cells from plasma; brain levels are not usually limiting.", drugs: [] },
      { label: "Histidine → histamine", enzyme: "Histidine decarboxylase", cofactor: "Pyridoxal-5-phosphate", detail: "One-step decarboxylation; HDC knockout animals show fragmented sleep and blunted arousal.", drugs: [] },
      { label: "Vesicular release", enzyme: "VMAT2", cofactor: "pH gradient", detail: "Histamine uses the same vesicular transporter as monoamines, so monoamine-depleting drugs also reduce histamine release.", drugs: [] },
      { label: "Receptor effects", enzyme: "—", cofactor: "—", detail: "H1 receptors in the cortex and hypothalamus promote wakefulness and are the target of sedating antihistamines; H3 autoreceptors limit release.", drugs: ["diphenhydramine", "quetiapine", "modafinil"] },
      { label: "Termination", enzyme: "Histamine N-methyltransferase (HNMT)", cofactor: "SAM", detail: "Methylation is the main brain route; DAO handles peripheral histamine in the gut.", drugs: [] },
    ],
    links: [{ id: "hpa-axis", note: "Histamine contributes to CRH-driven arousal" }],
    pubmed: "histidine decarboxylase histamine tuberomammillary wakefulness",
  },
  {
    id: "endocannabinoid-synthesis",
    name: "Endocannabinoid synthesis and degradation",
    group: "Neurotransmitter synthesis",
    summary:
      "Unlike classical transmitters, endocannabinoids are made on demand from membrane lipids and travel backwards onto presynaptic CB1 receptors to suppress release. This retrograde logic explains why THC and CBD behave so differently.",
    location: "Postsynaptic membranes throughout the cortex, hippocampus, striatum and cerebellum",
    rateLimiting: "On-demand cleavage by DAGL and NAPE-PLD",
    systems: ["endocannabinoid"],
    organs: ["brain", "adipose", "liver"],
    steps: [
      { label: "Lipid precursor formation", enzyme: "NAPE-PLD / DAGL", cofactor: "Calcium", detail: "Anandamide comes from NAPE, 2-AG from diacylglycerol; both are produced only when calcium rises after depolarisation.", drugs: [] },
      { label: "Retrograde release", enzyme: "—", cofactor: "—", detail: "Endocannabinoids cross the synaptic cleft backwards and bind presynaptic CB1 receptors, suppressing further transmitter release.", drugs: ["cbd"] },
      { label: "CB1 signalling", enzyme: "CB1 receptor", cofactor: "Gi/o, cAMP decrease", detail: "CB1 is one of the most abundant GPCRs in the brain; activation reduces calcium influx and opens potassium channels.", drugs: ["cbd", "lsd"] },
      { label: "CB2 signalling", enzyme: "CB2 receptor", cofactor: "Gi/o", detail: "CB2 is concentrated on immune cells and modulates inflammation rather than mood.", drugs: ["cbd"] },
      { label: "Degradation", enzyme: "FAAH (anandamide) and MAGL (2-AG)", cofactor: "Serine hydrolase chemistry", detail: "FAAH inhibitors raise anandamide and were pursued for pain and anxiety before hepatotoxicity halted development.", drugs: [] },
    ],
    links: [{ id: "catecholamine-clearance", note: "CB1 presynaptic suppression applies to monoamine terminals" }],
    pubmed: "endocannabinoid synthesis CB1 retrograde signalling FAAH",
  },
  {
    id: "adenosine-metabolism",
    name: "Adenosine metabolism and sleep pressure",
    group: "Neurotransmitter synthesis",
    summary:
      "Adenosine accumulates with wakeful neuronal activity and progressively inhibits arousal circuits. Caffeine works by pretending to be adenosine, not by adding stimulation.",
    location: "Basal forebrain, cortex, striatum; extracellular space",
    rateLimiting: "Equilibrative nucleoside transporters (ENT1/2) and adenosine kinase",
    systems: ["adenosine"],
    organs: ["brain", "heart", "skeletal-muscle"],
    steps: [
      { label: "ATP hydrolysis", enzyme: "Ectonucleotidases (CD39/CD73)", cofactor: "Mg²⁺", detail: "Neuronal firing releases ATP that is dephosphorylated to adenosine in the extracellular space.", drugs: [] },
      { label: "Cellular adenosine formation", enzyme: "CD73 / SAHH pathway", cofactor: "—", detail: "Intracellular adenosine also arises from S-adenosylhomocysteine hydrolysis, linking methylation metabolism to sleep pressure.", drugs: ["sam-e"] },
      { label: "Transport", enzyme: "ENT1/ENT2", cofactor: "Concentration gradient", detail: "Equilibrative transporters keep extracellular adenosine in the low nanomolar range.", drugs: ["caffeine"] },
      { label: "Receptor effects", enzyme: "A1 and A2A receptors", cofactor: "Gi (A1) and Gs (A2A)", detail: "A1 inhibits neuronal firing; A2A in the nucleus accumbens modulates motivation and is blocked by caffeine and istradefylline.", drugs: ["caffeine", "theobromine"] },
      { label: "Termination", enzyme: "Adenosine kinase and ADA", cofactor: "ATP / Zn²⁺", detail: "Re-phosphorylation or deamination removes adenosine; adenosine deaminase deficiency causes severe immunodeficiency.", drugs: [] },
    ],
    links: [{ id: "camp-pka-creb", note: "A2A signalling runs through Gs and cAMP" }],
    pubmed: "adenosine A1 A2A receptor sleep pressure caffeine",
  },
  {
    id: "catecholamine-clearance",
    name: "Catecholamine clearance: MAO and COMT",
    group: "Neurotransmitter clearance",
    summary:
      "Dopamine, noradrenaline and adrenaline are terminated by reuptake plus two enzymatic routes: oxidative deamination by MAO and methylation by COMT. Every MAOI and COMT inhibitor in clinical use acts here.",
    location: "Presynaptic terminals, astrocytes, liver and gut wall",
    rateLimiting: "MAO-A/B and COMT expression, plus transporter density",
    systems: ["dopamine", "noradrenaline"],
    organs: ["brain", "liver", "gut", "adrenals"],
    steps: [
      { label: "Reuptake", enzyme: "DAT / NET", cofactor: "Na⁺/Cl⁻", detail: "The primary route in most brain regions; transporter blockade is how stimulants and most antidepressants work.", drugs: ["methylphenidate", "atomoxetine", "venlafaxine", "bupropion"] },
      { label: "Oxidative deamination", enzyme: "MAO-A and MAO-B", cofactor: "FAD", detail: "MAO-A prefers serotonin and noradrenaline, MAO-B prefers phenylethylamine and dopamine; both produce an aldehyde and hydrogen peroxide.", drugs: ["selegiline", "phenelzine", "moclobemide"] },
      { label: "Aldehyde handling", enzyme: "Aldehyde dehydrogenase / reductase", cofactor: "NAD⁺ / NADPH", detail: "Aldehydes are oxidised to acids (DOPAC, HVA) or reduced to alcohols; excess aldehyde load is a source of oxidative stress.", drugs: [] },
      { label: "Methylation", enzyme: "COMT", cofactor: "SAM, Mg²⁺", detail: "COMT methylates dopamine in the prefrontal cortex, where DAT density is low, making it the main prefrontal clearance route.", drugs: ["sam-e"] },
      { label: "Conjugation and excretion", enzyme: "SULT / UGT / MAO in liver", cofactor: "PAPS, UDP-glucuronic acid", detail: "Peripheral catecholamines and their metabolites are sulfated, glucuronidated and excreted in urine as VMA and HVA.", drugs: [] },
    ],
    links: [{ id: "dopamine-synthesis", note: "Synthesis and clearance balance synaptic dopamine" }, { id: "kynurenine-pathway", note: "MAO produces oxidative species relevant to neuroinflammation" }],
    pubmed: "MAO COMT catecholamine metabolism dopamine clearance",
  },
  {
    id: "kynurenine-pathway",
    name: "Kynurenine pathway",
    group: "Neurotransmitter clearance",
    summary:
      "Most tryptophan goes down the kynurenine pathway rather than to serotonin. The two arms of that pathway produce neuroprotective kynurenic acid and neurotoxic quinolinic acid, and their balance is shifted by inflammation.",
    location: "Liver (systemic), microglia and astrocytes (brain)",
    rateLimiting: "Tryptophan 2,3-dioxygenase (liver) and indoleamine 2,3-dioxygenase (immune)",
    systems: ["serotonin", "glutamate", "dopamine"],
    organs: ["liver", "brain", "gut"],
    steps: [
      { label: "Tryptophan → kynurenine", enzyme: "TDO / IDO1 / IDO2", cofactor: "Haem, O₂", detail: "Inflammation upregulates IDO1, pulling tryptophan away from serotonin synthesis.", drugs: [] },
      { label: "Kynurenine → 3-HK", enzyme: "Kynurenine 3-monooxygenase (KMO)", cofactor: "NADPH, FAD", detail: "KMO sits at the branch point; its activity decides whether the pathway tilts toxic or protective.", drugs: [] },
      { label: "Neuroprotective arm", enzyme: "Kynurenine aminotransferase (KAT)", cofactor: "PLP", detail: "Produces kynurenic acid, which antagonises NMDA receptors and alpha-7 nicotinic receptors.", drugs: ["memantine"] },
      { label: "Neurotoxic arm", enzyme: "3-HAO then QPRT", cofactor: "Fe²⁺, PRPP", detail: "Yields quinolinic acid, an NMDA agonist and iron-dependent lipid peroxidation catalyst.", drugs: [] },
      { label: "NAD⁺ synthesis", enzyme: "NAMPT / NMNAT / QPRT", cofactor: "ATP, PRPP", detail: "The pathway's endpoint, NAD⁺, is essential for energy metabolism and sirtuin activity — and is also made from nicotinamide riboside.", drugs: ["nicotinamide-riboside", "creatine"] },
    ],
    links: [{ id: "serotonin-synthesis", note: "Competes with serotonin for tryptophan" }, { id: "catecholamine-clearance", note: "Shares oxidative-stress relevance" }],
    pubmed: "kynurenine pathway quinolinic acid kynurenic acid IDO",
  },
  {
    id: "hpa-axis",
    name: "HPA axis (CRH → ACTH → cortisol)",
    group: "Hormone axis",
    summary:
      "The hypothalamus, pituitary and adrenal cortex form a feedback loop that sets the body's stress response. It is suppressed by exogenous glucocorticoids and hypersensitised by chronic stress and by alcohol withdrawal.",
    location: "Paraventricular nucleus → anterior pituitary → adrenal cortex",
    rateLimiting: "CRH release and cortisol feedback sensitivity",
    systems: ["noradrenaline", "serotonin", "histamine"],
    organs: ["hypothalamus", "pituitary", "adrenals", "brain", "thymus"],
    steps: [
      { label: "CRH and AVP release", enzyme: "—", cofactor: "—", detail: "Parvocellular PVN neurons release CRH with vasopressin to drive ACTH; stress, hypoglycaemia and inflammation are inputs.", drugs: [] },
      { label: "ACTH secretion", enzyme: "POMC cleavage by PC1/3", cofactor: "—", detail: "POMC is cleaved into ACTH, beta-endorphin and other peptides; CRH receptor signalling uses cAMP and PKA.", drugs: [] },
      { label: "Cortisol synthesis", enzyme: "CYP11B1 (11-beta-hydroxylase)", cofactor: "NADPH, cytochrome P450", detail: "Adrenal zona fasciculata converts cholesterol through a multi-enzyme cascade to cortisol.", drugs: [] },
      { label: "Glucocorticoid receptor action", enzyme: "NR3C1", cofactor: "—", detail: "Cortisol binds a nuclear receptor that changes transcription of thousands of genes, including anti-inflammatory and gluconeogenic programmes.", drugs: ["mirtazapine"] },
      { label: "Negative feedback", enzyme: "—", cofactor: "—", detail: "Cortisol feeds back on hippocampus, hypothalamus and pituitary; loss of this feedback is central to chronic-stress pathology.", drugs: ["ashwagandha", "lithium"] },
      { label: "Peripheral inactivation", enzyme: "11-beta-HSD2", cofactor: "NAD⁺", detail: "In the kidney and placenta cortisol is converted to inactive cortisone, protecting mineralocorticoid receptors.", drugs: [] },
    ],
    links: [{ id: "hpg-axis", note: "CRH and cortisol suppress GnRH and testosterone" }, { id: "hpt-axis", note: "Shared hypothalamic-pituitary control of metabolism" }],
    pubmed: "HPA axis CRH ACTH cortisol feedback regulation",
  },
  {
    id: "hpt-axis",
    name: "HPT axis (TRH → TSH → thyroid hormone)",
    group: "Hormone axis",
    summary:
      "The hypothalamus and pituitary set thyroid output, which controls basal metabolic rate. Peripheral deiodinases decide how much of the output becomes active T3 rather than the prohormone T4.",
    location: "Hypothalamus → pituitary → thyroid gland → liver and periphery",
    rateLimiting: "Deiodinase activity and thyroid hormone availability",
    systems: ["noradrenaline", "dopamine"],
    organs: ["hypothalamus", "pituitary", "thyroid", "liver", "heart", "bone"],
    steps: [
      { label: "TRH release", enzyme: "—", cofactor: "—", detail: "TRH from the PVN drives TSH release; it is inhibited by stress, fasting and thyroid hormone itself.", drugs: [] },
      { label: "TSH secretion", enzyme: "—", cofactor: "Gq/Gs signalling", detail: "TSH is a heterodimeric glycoprotein that stimulates every step of thyroid hormone synthesis.", drugs: ["liothyronine"] },
      { label: "Thyroid hormone synthesis", enzyme: "Thyroid peroxidase (TPO)", cofactor: "Iodide, H₂O₂", detail: "Iodide is organified onto thyroglobulin and coupled into T4 and T3; TPO is inhibited by methimazole and propylthiouracil.", drugs: [] },
      { label: "Peripheral conversion", enzyme: "Deiodinase 1/2", cofactor: "Selenium", detail: "T4 is converted to the active T3; deiodinase 3 inactivates it to reverse T3, a switch that flips during illness.", drugs: ["liothyronine"] },
      { label: "Nuclear receptor action", enzyme: "TR-alpha / TR-beta", cofactor: "—", detail: "T3 binds nuclear receptors that raise Na/K-ATPase and mitochondrial activity, setting metabolic rate.", drugs: ["liothyronine"] },
      { label: "Feedback", enzyme: "—", cofactor: "—", detail: "T4 and T3 suppress TSH; exogenous T3 blunts TSH within days and can leave the axis suppressed for weeks.", drugs: ["liothyronine"] },
    ],
    links: [{ id: "hpa-axis", note: "Shared hypothalamic control; fasting suppresses both" }],
    pubmed: "hypothalamic pituitary thyroid axis TSH deiodinase",
  },
  {
    id: "hpg-axis",
    name: "HPG axis (GnRH → LH/FSH → gonadal steroids)",
    group: "Hormone axis",
    summary:
      "Pulsatile GnRH drives LH and FSH, which drive testosterone or oestradiol production. This is the axis that every anabolic steroid, SARM and SERM in the database ultimately perturbs.",
    location: "Hypothalamus → pituitary → testes or ovaries",
    rateLimiting: "GnRH pulse frequency and gonadal steroid feedback",
    systems: ["dopamine", "noradrenaline", "endocannabinoid"],
    organs: ["hypothalamus", "pituitary", "testes", "ovaries", "uterus", "breast", "prostate", "adrenals"],
    steps: [
      { label: "GnRH pulses", enzyme: "—", cofactor: "—", detail: "KNDy neurons in the arcuate nucleus generate pulses; kisspeptin is the gatekeeper and oestradiol modulates its output.", drugs: ["kisspeptin-10", "clomiphene"] },
      { label: "LH and FSH release", enzyme: "—", cofactor: "—", detail: "GnRH receptor signalling through Gq raises calcium and drives gonadotropin synthesis in distinct pituitary cell populations.", drugs: ["hcg", "clomiphene", "tamoxifen"] },
      { label: "Cholesterol → pregnenolone", enzyme: "CYP11A1 (P450scc)", cofactor: "NADPH, StAR protein", detail: "The common entry to all steroidogenesis; StAR transports cholesterol into mitochondria.", drugs: ["hcg"] },
      { label: "Testosterone synthesis", enzyme: "CYP17A1 then 17-beta-HSD3", cofactor: "NADPH", detail: "Leydig cells make testosterone under LH drive; the same pathway in the adrenal cortex produces androgens.", drugs: ["testosterone-enanthate", "hcg"] },
      { label: "Conversion to DHT and oestradiol", enzyme: "5-alpha reductase and aromatase", cofactor: "NADPH", detail: "DHT amplifies androgenic signalling; aromatase produces oestradiol, which is essential for bone density and libido.", drugs: ["finasteride", "dutasteride", "anastrozole", "exemestane", "letrozole"] },
      { label: "Negative feedback", enzyme: "—", cofactor: "—", detail: "Testosterone and oestradiol suppress GnRH and gonadotropins; exogenous androgens suppress the axis within days, producing testicular atrophy and infertility.", drugs: ["testosterone-cypionate", "nandrolone-decanoate", "trenbolone-acetate", "oxandrolone", "ostarine", "ligandrol"] },
    ],
    links: [{ id: "bone-remodelling", note: "Oestradiol and testosterone maintain bone; suppression causes loss" }, { id: "gh-igf1-axis", note: "Both axes share pituitary control and interact" }],
    pubmed: "GnRH LH FSH testosterone feedback kisspeptin regulation",
  },
  {
    id: "gh-igf1-axis",
    name: "GH-IGF-1 axis",
    group: "Hormone axis",
    summary:
      "Hypothalamic GHRH and ghrelin drive pulsatile GH release, which acts on liver JAK2-STAT5 to make IGF-1. Pulsatility matters: continuous exposure produces different effects from physiological pulses.",
    location: "Hypothalamus → pituitary → liver and peripheral tissue",
    rateLimiting: "GHRH/somatostatin balance and GH receptor signalling",
    systems: ["dopamine", "noradrenaline"],
    organs: ["hypothalamus", "pituitary", "liver", "bone", "skeletal-muscle", "adipose"],
    steps: [
      { label: "GHRH and ghrelin input", enzyme: "—", cofactor: "—", detail: "GHRH neurons and ghrelin-receptor signalling stimulate GH; somatostatin neurons inhibit it. Sleep, fasting and exercise shift the balance.", drugs: ["cjc-1295", "sermorelin", "tesamorelin", "ipamorelin", "ghrp-2", "ghrp-6", "hexarelin", "mk-677"] },
      { label: "GH release", enzyme: "GHRH receptor (Gs/cAMP) and GHS-R1a (Gq)", cofactor: "Calcium, cAMP", detail: "GH is stored in somatotroph granules and released in pulses, largest during slow-wave sleep.", drugs: ["sermorelin", "hexarelin"] },
      { label: "GH receptor activation", enzyme: "JAK2-STAT5", cofactor: "—", detail: "GH binds a preformed receptor dimer and activates JAK2, which phosphorylates STAT5 and drives IGF-1 transcription.", drugs: ["somatropin"] },
      { label: "IGF-1 production", enzyme: "Hepatic IGF-1 transcription", cofactor: "—", detail: "Most circulating IGF-1 is hepatic; local IGF-1 in muscle and bone acts in a paracrine manner.", drugs: ["somatropin", "igf-1-lr3"] },
      { label: "IGFBP buffering", enzyme: "IGFBP-3 + ALS", cofactor: "—", detail: "About 95% of IGF-1 circulates bound, which limits hypoglycaemia and tissue exposure; LR3 analogues evade this.", drugs: ["igf-1-lr3"] },
      { label: "Metabolic effects", enzyme: "—", cofactor: "—", detail: "GH increases lipolysis while antagonising insulin action, so sustained elevation raises glucose and reduces insulin sensitivity.", drugs: ["mk-677", "somatropin"] },
    ],
    links: [{ id: "pi3k-akt-mtor", note: "IGF-1 signals through PI3K-AKT" }, { id: "incretin-axis", note: "GH-induced insulin resistance interacts with incretin drug effects" }],
    pubmed: "growth hormone IGF-1 axis JAK2 STAT5 pulsatility",
  },
  {
    id: "incretin-axis",
    name: "Incretin axis (GLP-1 and GIP)",
    group: "Hormone axis",
    summary:
      "Gut hormones released after a meal amplify insulin secretion and signal satiety to the brain. They are degraded within minutes by DPP-4, which is why therapeutic analogues carry fatty-acid chains and last a week.",
    location: "L-cells and K-cells of the gut → pancreas, brainstem and hypothalamus",
    rateLimiting: "DPP-4 degradation and receptor density",
    systems: ["dopamine", "serotonin", "histamine"],
    organs: ["gut", "pancreas", "brain", "liver", "adipose", "stomach"],
    steps: [
      { label: "Nutrient sensing in the gut", enzyme: "—", cofactor: "—", detail: "L-cells sense glucose, fat and protein and release GLP-1; K-cells release GIP from the upper intestine.", drugs: [] },
      { label: "GLP-1 receptor action", enzyme: "GLP-1R (Gs, cAMP, PKA/Epac2)", cofactor: "—", detail: "Beta-cell insulin release is glucose-dependent, so hypoglycaemia is uncommon with GLP-1 agonists alone.", drugs: ["semaglutide", "tirzepatide", "retatrutide"] },
      { label: "Gastric and central effects", enzyme: "—", cofactor: "—", detail: "Slowed gastric emptying plus hypothalamic and hindbrain receptor activation reduce appetite and food reward.", drugs: ["semaglutide", "tirzepatide"] },
      { label: "Glucagon modulation", enzyme: "—", cofactor: "—", detail: "GLP-1 suppresses glucagon; the glucagon-receptor agonist component of triple agonists does the opposite and raises energy expenditure.", drugs: ["retatrutide"] },
      { label: "Degradation", enzyme: "DPP-4", cofactor: "Serine protease", detail: "Native GLP-1 has a two-minute half-life; albumin-binding acylation extends analogues to days or weeks.", drugs: ["semaglutide", "tirzepatide"] },
    ],
    links: [{ id: "camp-pka-creb", note: "Incretins work through cAMP and CREB" }],
    pubmed: "incretin GLP-1 GIP receptor DPP-4 satiety",
  },
  {
    id: "camp-pka-creb",
    name: "cAMP → PKA → CREB signalling",
    group: "Receptor signalling",
    summary:
      "The most widely used intracellular messenger in the brain: Gs-coupled receptors raise cAMP, activate PKA, and switch on CREB-dependent gene expression. It is where monoamines, adenosine and many peptides converge.",
    location: "Everywhere; most studied in striatum, hippocampus and prefrontal cortex",
    rateLimiting: "Phosphodiesterase activity and G-protein coupling",
    systems: ["dopamine", "noradrenaline", "serotonin", "adenosine", "histamine"],
    organs: ["brain", "heart", "skeletal-muscle", "adipose"],
    steps: [
      { label: "Receptor activation", enzyme: "Gs-coupled GPCRs (D1, beta-adrenergic, A2A, H2, 5-HT4)", cofactor: "GTP", detail: "Ligand binding exchanges GDP for GTP on Gs-alpha, which dissociates and activates adenylyl cyclase.", drugs: ["caffeine", "clenbuterol", "modafinil"] },
      { label: "cAMP production", enzyme: "Adenylyl cyclase", cofactor: "Mg²⁺, ATP", detail: "Nine membrane isoforms integrate calcium and G-protein signals; cAMP spreads within microseconds.", drugs: [] },
      { label: "PKA activation", enzyme: "Protein kinase A", cofactor: "cAMP", detail: "Four cAMP molecules release the catalytic subunits, which phosphorylate ion channels, receptors and transcription factors.", drugs: [] },
      { label: "CREB phosphorylation", enzyme: "PKA → CREB at Ser133", cofactor: "ATP", detail: "Phosphorylated CREB recruits CBP and drives expression of BDNF, tyrosine hydroxylase and Fos family genes.", drugs: ["creatine", "lithium"] },
      { label: "Termination", enzyme: "Phosphodiesterases (PDE4, PDE10)", cofactor: "Mg²⁺/Zn²⁺", detail: "PDEs hydrolyse cAMP to AMP; PDE inhibitors (caffeine at high concentration) prolong the signal.", drugs: ["caffeine", "theobromine"] },
    ],
    links: [{ id: "dopamine-synthesis", note: "CREB drives tyrosine hydroxylase expression" }, { id: "pi3k-akt-mtor", note: "cAMP and AKT crosstalk at the level of CREB and mTOR" }],
    pubmed: "cAMP PKA CREB signalling dopamine BDNF",
  },
  {
    id: "pi3k-akt-mtor",
    name: "PI3K → AKT → mTORC1",
    group: "Receptor signalling",
    summary:
      "The growth and protein-synthesis engine. Insulin, IGF-1 and BDNF all feed it, and rapamycin-sensitive mTORC1 decides whether a cell builds protein or recycles it.",
    location: "All tissues; especially muscle, liver, neurons",
    rateLimiting: "TSC1/2 and PTEN, which restrain the pathway",
    systems: ["dopamine", "serotonin", "glutamate"],
    organs: ["skeletal-muscle", "liver", "brain", "adipose", "bone"],
    steps: [
      { label: "Receptor tyrosine kinase activation", enzyme: "Insulin receptor, IGF-1R, TrkB", cofactor: "ATP, Mg²⁺", detail: "Autophosphorylation creates docking sites for IRS-1 or Shc adaptor proteins.", drugs: ["insulin", "igf-1-lr3"] },
      { label: "PI3K activation", enzyme: "PI3K class I", cofactor: "PIP2", detail: "PI3K converts PIP2 to PIP3, recruiting PDK1 and AKT to the membrane.", drugs: [] },
      { label: "AKT phosphorylation", enzyme: "PDK1 and mTORC2", cofactor: "ATP", detail: "AKT phosphorylates TSC2, releasing Rheb to activate mTORC1, and phosphorylates FOXO to stop catabolic gene expression.", drugs: [] },
      { label: "mTORC1 activation", enzyme: "mTOR in complex with Raptor", cofactor: "Leucine, ATP, Rheb-GTP", detail: "mTORC1 phosphorylates p70S6K and 4E-BP1, increasing translation initiation and ribosome biogenesis.", drugs: ["creatine", "leucine"] },
      { label: "Muscle protein synthesis", enzyme: "p70S6K → eIF4B", cofactor: "Amino acids, resistance exercise", detail: "Protein synthesis needs both the signalling input and sufficient amino acids; without substrate, mTOR activation wastes energy.", drugs: ["oxandrolone", "testosterone-enanthate", "ligf"] },
      { label: "Feedback restraint", enzyme: "p70S6K → IRS-1 serine phosphorylation; PTEN", cofactor: "—", detail: "Chronic mTORC1 activity desensitises insulin signalling, which is why sustained GH or IGF-1 exposure raises glucose.", drugs: [] },
    ],
    links: [{ id: "gh-igf1-axis", note: "IGF-1 is the main upstream activator" }, { id: "fgf-fgfr-mapk", note: "MAPK and PI3K are parallel outputs of RTKs" }],
    pubmed: "PI3K AKT mTORC1 muscle protein synthesis insulin",
  },
  {
    id: "fgf-fgfr-mapk",
    name: "FGF → FGFR → RAS-MAPK",
    group: "Receptor signalling",
    summary:
      "Fibroblast growth factors act through receptor tyrosine kinases that control bone growth, angiogenesis and repair. In bone, FGFR3 signalling is the brake on chondrocyte proliferation — which is why activating and inhibiting this pathway have opposite therapeutic uses.",
    location: "Growth-plate chondrocytes, osteoblasts, endothelium, brain",
    rateLimiting: "FGF ligand availability and heparan sulfate co-receptor",
    systems: ["dopamine", "glutamate"],
    organs: ["bone", "joints", "brain", "skin"],
    steps: [
      { label: "Ligand binding", enzyme: "FGFR1-4 with heparan sulfate", cofactor: "Heparan sulfate proteoglycan", detail: "FGF cannot activate its receptor without a heparan sulfate co-receptor, which is why matrix composition matters.", drugs: [] },
      { label: "Receptor dimerisation", enzyme: "FGFR tyrosine kinase", cofactor: "ATP, Mg²⁺", detail: "Autophosphorylation creates docking sites for FRS2 and PLCγ.", drugs: [] },
      { label: "RAS-MAPK cascade", enzyme: "RAS → RAF → MEK → ERK", cofactor: "GTP, ATP", detail: "ERK translocates to the nucleus and drives proliferation genes; aberrant activation underlies achondroplasia and several cancers.", drugs: ["erdafitinib"] },
      { label: "Growth-plate control", enzyme: "FGFR3 in chondrocytes", cofactor: "—", detail: "FGFR3 activation slows chondrocyte proliferation; gain-of-function mutations cause achondroplasia, the commonest dwarfism.", drugs: ["erdafitinib"] },
      { label: "Deactivation", enzyme: "SPRY and SEF feedback inhibitors", cofactor: "—", detail: "Feedback inhibitors keep the outflow transient; loss of feedback is a classic oncogenic step.", drugs: [] },
    ],
    links: [{ id: "hedgehog-signalling", note: "Hedgehog and FGF jointly pattern the growth plate" }, { id: "pi3k-akt-mtor", note: "Parallel RTK output to AKT" }],
    pubmed: "FGFR3 signalling chondrocyte growth plate achondroplasia",
  },
  {
    id: "hedgehog-signalling",
    name: "Hedgehog signalling (PTCH1 → SMO → GLI)",
    group: "Receptor signalling",
    summary:
      "A developmental pathway that is mostly silent in adults except in stem-cell niches and repair. Activation drives bone and cartilage formation in animals and tumours in people, which is why it is a drug target in both directions.",
    location: "Growth plate, bone marrow stroma, cerebellum, skin",
    rateLimiting: "PTCH1 repression of Smoothened",
    systems: ["dopamine"],
    organs: ["bone", "joints", "skin", "brain"],
    steps: [
      { label: "Ligand binding", enzyme: "SHH/Ihh to PTCH1", cofactor: "—", detail: "Indian hedgehog from prehypertrophic chondrocytes coordinates growth-plate organisation.", drugs: [] },
      { label: "Derepression of Smoothened", enzyme: "SMO", cofactor: "Cholesterol modification of SHH", detail: "PTCH1 normally keeps SMO in a vesicle; ligand binding releases it to the primary cilium.", drugs: ["sag21k"] },
      { label: "GLI activation", enzyme: "SUFU → GLI1/2", cofactor: "—", detail: "GLI transcription factors enter the nucleus and switch on target genes including PTCH1 and cyclin D.", drugs: ["sag21k"] },
      { label: "Bone and cartilage output", enzyme: "—", cofactor: "—", detail: "Hedgehog drives osteoblast differentiation and chondrocyte proliferation, the basis of interest in bone regeneration.", drugs: ["sag21k", "abaloparatide"] },
      { label: "Pathway restraint", enzyme: "GLI3 repressor, SUFU, PKA", cofactor: "cAMP", detail: "Inappropriate activation causes basal cell carcinoma and medulloblastoma; vismodegib blocks SMO clinically.", drugs: [] },
    ],
    links: [{ id: "bone-remodelling", note: "Hedgehog tips remodelling toward formation" }, { id: "fgf-fgfr-mapk", note: "FGFR3 and hedgehog interact in the growth plate" }],
    pubmed: "hedgehog signalling smoothened GLI bone development",
  },
  {
    id: "bone-remodelling",
    name: "Bone remodelling unit",
    group: "Growth & bone",
    summary:
      "Bone is continuously resorbed by osteoclasts and rebuilt by osteoblasts in a tightly coupled cycle. Hormones and drugs shift the balance between these two arms, which is the whole story of osteoporosis therapy.",
    location: "Trabecular and cortical bone surfaces throughout the skeleton",
    rateLimiting: "RANKL/OPG ratio and Wnt signalling",
    systems: ["dopamine", "serotonin", "noradrenaline"],
    organs: ["bone", "joints", "parathyroid", "kidneys", "gut", "pituitary", "testes", "ovaries"],
    steps: [
      { label: "Osteoclast activation", enzyme: "RANKL binding to RANK", cofactor: "NF-κB, MAPK", detail: "Osteoblast-lineage cells present RANKL, which drives osteoclast differentiation; OPG acts as a decoy receptor and the ratio decides resorption.", drugs: [] },
      { label: "Acid resorption", enzyme: "V-ATPase and cathepsin K", cofactor: "H⁺, chloride", detail: "Osteoclasts acidify the resorption pit and digest collagen with cathepsin K.", drugs: [] },
      { label: "Coupling to formation", enzyme: "TGF-beta release from matrix", cofactor: "—", detail: "Factors released from resorbed matrix recruit osteoblasts, coupling resorption to formation in healthy remodelling.", drugs: ["abaloparatide"] },
      { label: "Osteoblast differentiation", enzyme: "RUNX2, Wnt/beta-catenin", cofactor: "—", detail: "Intermittent PTH and sclerostin inhibition both drive Wnt-dependent osteoblast activity.", drugs: ["abaloparatide", "sag21k"] },
      { label: "Mineralisation", enzyme: "Alkaline phosphatase, lysyl oxidase", cofactor: "Calcium, phosphate, vitamin K, copper", detail: "Collagen matrix is cross-linked and mineralised; copper deficiency impairs cross-linking.", drugs: ["ghk-cu", "abaloparatide"] },
      { label: "Hormonal and drug modulation", enzyme: "—", cofactor: "—", detail: "Oestrogen, testosterone, vitamin D and PTH shape the balance; androgen suppression and aromatase inhibitors cause rapid loss.", drugs: ["anastrozole", "letrozole", "finasteride", "liothyronine", "testosterone-cypionate"] },
    ],
    links: [{ id: "hpg-axis", note: "Gonadal steroids maintain bone mass" }, { id: "hedgehog-signalling", note: "Hedgehog drives osteoblast commitment" }],
    pubmed: "bone remodelling RANKL osteoblast osteoclast coupling",
  },
];

export const PATHWAY_BY_ID = new Map(PATHWAYS.map((p) => [p.id, p]));

export const TARGETS = [];
// END_ATLAS

export const TARGET_BY_ID = new Map(TARGETS.map((t) => [t.id, t]));

export const TARGET_KINDS = ["GPCR", "Ion channel", "Enzyme", "Transporter", "Nuclear receptor", "Kinase", "Other"];

export function pathwaysForSystem(systemId) {
  return PATHWAYS.filter((p) => (p.systems || []).includes(systemId));
}

export function pathwaysForOrgan(organId) {
  return PATHWAYS.filter((p) => (p.organs || []).includes(organId));
}

export function targetsForSystem(systemId) {
  return TARGETS.filter((t) => (t.systems || []).includes(systemId));
}

export function pathwaysForCompound(compoundId) {
  return PATHWAYS.filter((p) => (p.steps || []).some((s) => (s.drugs || []).includes(compoundId)));
}

export function targetsForCompound(compoundId) {
  return TARGETS.filter((t) => (t.compounds || []).includes(compoundId));
}
