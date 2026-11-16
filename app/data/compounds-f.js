/* Compounds — part F: peptides, growth-hormone axis, incretins, cosmetic and consumer growth products.
 * Doses are literature reference points for education only, not recommendations.
 */

export const COMPOUNDS_F = [
  {
    id: "bpc-157",
    name: "BPC-157",
    aliases: ["Body Protection Compound 157", "PL 14736", "pentadecapeptide"],
    cls: "Peptide",
    subcls: "Gastric juice peptide fragment (15 aa)",
    status: "Research chemical",
    evidence: "preclinical",
    summary:
      "A synthetic pentadecapeptide derived from a gastric juice protein, stable in acid and widely promoted for tendon and gut healing. All mechanistic support comes from rodent and cell models; no human pharmacokinetic or efficacy trial has been published.",
    moa: [
      "Upregulates VEGFR2 and eNOS signalling in rodent models, increasing angiogenesis",
      "Increases growth-hormone receptor expression in healing tissue",
      "Modulates the nitric oxide system and reduces inflammatory cytokine expression",
      "Interacts with the gut-brain axis after oral dosing in animals, altering dopamine and serotonin turnover",
    ],
    targets: [
      { name: "VEGFR2", action: "modulator", note: "angiogenic signalling, rodent data" },
      { name: "Nitric oxide synthase", action: "upregulator", note: "NO-mediated cytoprotection" },
      { name: "GHR", action: "upregulator", note: "increased expression in injured tissue" },
    ],
    pk: {
      halfLife: 0.5,
      tmax: 0.5,
      onset: 0.3,
      duration: 6,
      metabolism: "rapid plasma proteolysis",
      excretion: "renal peptide fragments",
    },
    doses: [
      { route: "subcutaneous", low: 0.2, high: 0.5, unit: "mg", note: "rodent-derived figures; no human dose established" },
    ],
    effects: {
      good: ["Accelerated tendon healing in animal models", "Gastric ulcer protection in rats", "Reported reduction in joint discomfort"],
      bad: ["Injection-site irritation", "Unknown long-term immunogenicity", "Product purity is unverifiable"],
    },
    flags: ["peptide", "angiogenic", "gi-protective", "research"],
    warnings: [
      "No human trials: efficacy, dose and safety are extrapolated from rats",
      "Grey-market vials are unsterile by definition; abscesses and granulomas are reported",
      "Angiogenic signalling is not automatically benign — the cancer-angle question is unanswered",
    ],
    tags: ["recovery", "tendon", "research"],
    pubmed: "BPC-157 angiogenesis tendon healing rat model",
  },
  {
    id: "tb-500",
    name: "TB-500 (thymosin beta-4 fragment)",
    aliases: ["TB4", "thymosin beta-4", "Tβ4 fragment"],
    cls: "Peptide",
    subcls: "Actin-binding peptide fragment (7 aa)",
    status: "Research chemical",
    evidence: "preclinical",
    summary:
      "The active actin-binding fragment of thymosin beta-4, promoted for flexibility and tissue repair. The parent peptide has genuine cell-migration biology; the marketed fragment has no human outcome data.",
    moa: [
      "Binds G-actin and promotes actin filament turnover, enabling cell migration",
      "Upregulates laminin-5 and integrin-linked kinase in wound models",
      "Reduces inflammatory cell infiltration and fibrosis in animal tissue",
      "Promotes endothelial and keratinocyte migration in vitro",
    ],
    targets: [
      { name: "G-actin", action: "sequestering", note: "actin cytoskeleton dynamics" },
      { name: "Integrin-linked kinase", action: "upregulator", note: "cell migration" },
    ],
    pk: {
      halfLife: 2,
      tmax: 1,
      onset: 1,
      duration: 12,
      metabolism: "proteolysis to amino acids",
      excretion: "renal",
    },
    doses: [
      { route: "subcutaneous", low: 2, high: 5, unit: "mg", note: "community figures only; no human data" },
    ],
    effects: {
      good: ["Reported mobility improvement", "Reduced fibrosis in animal models"],
      bad: ["Injection-site reactions", "Unknown immunogenicity", "Oedema in some reports"],
    },
    flags: ["peptide", "tissue-repair", "research"],
    warnings: [
      "Thymosin beta-4 has been studied in clinical trials as a drug (RGN-259) — the grey-market fragment is not the same product",
      "No human safety data for repeated subcutaneous administration",
      "Actin-binding peptides can influence cell motility broadly; long-term consequences are unknown",
    ],
    tags: ["recovery", "connective-tissue", "research"],
    pubmed: "thymosin beta-4 fragment actin cell migration",
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    aliases: ["NNC 26-0161", "IPA"],
    cls: "Growth hormone secretagogue",
    subcls: "Pentapeptide ghrelin-receptor agonist",
    status: "Research chemical",
    evidence: "preclinical",
    summary:
      "A selective growth-hormone secretagogue that stimulates GH release with minimal effect on ACTH or prolactin — the cleanest of the GHRP family in that respect. Human pharmacokinetic data are minimal and no clinical endpoint trial exists.",
    moa: [
      "Agonist at the ghrelin receptor (GHS-R1a) in the pituitary and hypothalamus",
      "Triggers Gq-coupled phospholipase C signalling, raising intracellular calcium and GH vesicle release",
      "Preserves somatostatin negative feedback, so GH pulses remain pulsatile rather than continuous",
      "Minimal ACTH/cortisol and prolactin stimulation compared with GHRP-6",
    ],
    targets: [
      { name: "GHS-R1a (ghrelin receptor)", action: "agonist", note: "pituitary somatotrophs" },
      { name: "GH secretion", action: "stimulant", note: "pulsatile, somatostatin-sensitive" },
    ],
    pk: {
      halfLife: 1.5,
      tmax: 0.5,
      onset: 0.2,
      duration: 3,
      metabolism: "plasma proteolysis",
      excretion: "renal fragments",
    },
    doses: [
      { route: "subcutaneous", low: 0.1, high: 0.2, unit: "mg", note: "research figures; not an established human dose" },
    ],
    effects: {
      good: ["Pulsatile GH release", "Improved sleep quality in user reports", "Appetite stimulation is milder than GHRP-6"],
      bad: ["Hunger increase", "Water retention via GH", "Injection burden", "Numbness and tingling at higher exposure"],
    },
    flags: ["peptide", "gh-axis", "ghrelin-agonist", "research"],
    warnings: [
      "Raises GH and therefore IGF-1: the long-term risks of elevated IGF-1 (insulin resistance, tissue growth) apply",
      "Grey-market purity is unverifiable; sterility is not guaranteed",
      "Not approved anywhere for human use",
    ],
    tags: ["growth-hormone", "sleep", "recovery"],
    pubmed: "ipamorelin GHS-R1a growth hormone secretagogue",
  },
  {
    id: "cjc-1295",
    name: "CJC-1295",
    aliases: ["CJC-1295 DAC", "modified GRF 1-29", "sermorelin analogue"],
    cls: "Growth hormone secretagogue",
    subcls: "GHRH analogue with drug-affinity complex",
    status: "Research chemical",
    evidence: "preclinical",
    summary:
      "A GHRH analogue modified to resist DPP-4 degradation, with or without a drug-affinity complex (DAC) that covalently binds albumin and extends its half-life to days. The DAC version produces continuous rather than pulsatile GH exposure.",
    moa: [
      "Binds the GHRH receptor on pituitary somatotrophs",
      "Gs-coupled cAMP rise drives GH synthesis and secretion",
      "DAC version maleimide-couples to albumin Cys34, giving a week-long half-life",
      "Continuous GH exposure from the DAC form blunts the natural pulsatile pattern and can downregulate the axis",
    ],
    targets: [
      { name: "GHRH receptor", action: "agonist", note: "somatotroph cAMP" },
      { name: "DPP-4", action: "resistant", note: "N-terminal modification" },
      { name: "Serum albumin", action: "covalent conjugate", note: "DAC form only" },
    ],
    pk: {
      halfLife: 168,
      tmax: 24,
      onset: 6,
      duration: 240,
      metabolism: "slow proteolysis, albumin conjugate clearance",
      excretion: "reticuloendothelial and renal",
    },
    doses: [
      { route: "subcutaneous", low: 1, high: 2, unit: "mg", note: "community figures for the DAC form; no human trials" },
    ],
    effects: {
      good: ["Sustained GH and IGF-1 elevation", "Fewer injections with the DAC form"],
      bad: ["Non-physiological continuous GH", "Water retention", "Insulin resistance", "Carpal tunnel symptoms"],
    },
    flags: ["peptide", "gh-axis", "ghrh-agonist", "research"],
    warnings: [
      "Continuous GH elevation is the opposite of the physiological pulsatile pattern and is the pattern linked to insulin resistance",
      "No human efficacy trials; pharmacokinetics come from a single small study of the DAC conjugate",
      "Albumin conjugation means the effect cannot be stopped quickly if side effects appear",
    ],
    tags: ["growth-hormone", "peptide", "research"],
    pubmed: "CJC-1295 GHRH analogue albumin conjugation pharmacokinetics",
  },
  {
    id: "sermorelin",
    name: "Sermorelin",
    aliases: ["GRF 1-29", "Geref"],
    cls: "Growth hormone secretagogue",
    subcls: "GHRH(1-29) fragment",
    status: "Rx",
    evidence: "limited",
    summary:
      "The first 29 amino acids of growth-hormone-releasing hormone, once approved as a diagnostic agent and for paediatric GH deficiency. It acts on the pituitary rather than bypassing it, so endogenous feedback still applies.",
    moa: [
      "GHRH receptor agonism on somatotrophs, raising cAMP and GH transcription",
      "Preserves somatostatin feedback, so GH release remains partly physiological",
      "Degraded quickly by DPP-4, hence a short effect window",
    ],
    targets: [
      { name: "GHRH receptor", action: "agonist", note: "pituitary" },
      { name: "DPP-4", action: "substrate", note: "rapid cleavage" },
    ],
    pk: {
      halfLife: 0.2,
      tmax: 0.3,
      onset: 0.1,
      duration: 2,
      metabolism: "rapid DPP-4 and plasma proteolysis",
      excretion: "renal fragments",
    },
    doses: [
      { route: "subcutaneous", low: 0.1, high: 0.3, unit: "mg", note: "historical diagnostic/injection reference range; education only" },
    ],
    effects: {
      good: ["Pulsatile GH release", "Improved body composition in GH-deficient adults"],
      bad: ["Injection-site pain", "Flushing", "Headache"],
    },
    flags: ["peptide", "gh-axis", "ghrh-agonist"],
    warnings: [
      "Withdrawn from most markets as a commercial product; compounded versions vary in potency",
      "Only effective if the pituitary is functional — in hypopituitarism it does nothing",
      "Very short half-life makes single daily dosing pharmacologically weak",
    ],
    tags: ["growth-hormone", "peptide"],
    pubmed: "sermorelin GHRH 1-29 growth hormone deficiency",
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    aliases: ["Egrifta", "TH9507"],
    cls: "Growth hormone secretagogue",
    subcls: "Stabilised GHRH analogue",
    status: "Rx",
    evidence: "strong",
    summary:
      "A GHRH analogue approved specifically for visceral adiposity in HIV-associated lipodystrophy. It is the only GHRH analogue with a modern regulatory approval and randomised trial data.",
    moa: [
      "GHRH receptor agonism with a trans-3-hexenoyl modification that resists DPP-4",
      "Raises endogenous pulsatile GH and IGF-1 within the physiological range",
      "Preferentially reduces visceral fat without proportional subcutaneous loss in trials",
    ],
    targets: [
      { name: "GHRH receptor", action: "agonist", note: "pulsatile GH release" },
      { name: "IGF-1", action: "indirect upregulator", note: "hepatic, GH-mediated" },
    ],
    pk: {
      halfLife: 0.5,
      tmax: 0.3,
      onset: 0.2,
      duration: 3,
      metabolism: "proteolysis, renal clearance",
      excretion: "renal",
    },
    doses: [
      { route: "subcutaneous", low: 1.4, high: 2, unit: "mg", note: "approved daily dose range; education only" },
    ],
    effects: {
      good: ["Reduced visceral adipose tissue", "Improved triglycerides", "Preserved lean mass"],
      bad: ["Injection-site reactions", "Arthralgia", "Peripheral oedema", "Raised IGF-1", "Possible increased diabetes risk"],
    },
    flags: ["peptide", "gh-axis", "ghrh-agonist", "prescription-only"],
    warnings: [
      "Contraindicated with active malignancy, and IGF-1 must be monitored",
      "Increases the risk of type 2 diabetes in predisposed patients in trial data",
      "Not a weight-loss drug for general obesity — approval is limited to HIV lipodystrophy",
    ],
    tags: ["growth-hormone", "visceral-fat", "prescription"],
    pubmed: "tesamorelin GHRH visceral adipose tissue HIV lipodystrophy",
  },
  {
    id: "hexarelin",
    name: "Hexarelin",
    aliases: ["Examorelin", "EP-23905"],
    cls: "Growth hormone secretagogue",
    subcls: "Hexapeptide GHRP",
    status: "Research chemical",
    evidence: "preclinical",
    summary:
      "A potent hexapeptide GH secretagogue from the early GHRP series, with additional cardiac and cardioprotective signalling through CD36. Its GH release desensitises faster than other GHRPs.",
    moa: [
      "GHS-R1a agonism producing strong GH release",
      "Binds CD36 in cardiac and endothelial tissue, activating ERK and anti-apoptotic signalling in animal models",
      "Raises prolactin and ACTH modestly at higher doses",
      "Rapid desensitisation of GH response with frequent dosing",
    ],
    targets: [
      { name: "GHS-R1a", action: "agonist", note: "potent GH release" },
      { name: "CD36", action: "ligand", note: "cardiac signalling in rodents" },
    ],
    pk: {
      halfLife: 1.2,
      tmax: 0.3,
      onset: 0.2,
      duration: 2.5,
      metabolism: "plasma proteolysis",
      excretion: "renal fragments",
    },
    doses: [
      { route: "subcutaneous", low: 0.1, high: 0.2, unit: "mg", note: "research figures; no established human dose" },
    ],
    effects: {
      good: ["Strong GH pulse", "Reported cardioprotection in animal models"],
      bad: ["Prolactin and cortisol rise", "Tachyphylaxis", "Appetite increase"],
    },
    flags: ["peptide", "gh-axis", "ghrelin-agonist", "research"],
    warnings: [
      "Desensitises quickly: response falls within days of repeated dosing",
      "Raises prolactin and ACTH, unlike ipamorelin",
      "No human safety data for chronic use",
    ],
    tags: ["growth-hormone", "cardiac", "research"],
    pubmed: "hexarelin CD36 cardioprotection growth hormone",
  },
  {
    id: "ghrp-2",
    name: "GHRP-2 (pralmorelin)",
    aliases: ["pralmorelin", "KP-102", "GHRP-2"],
    cls: "Growth hormone secretagogue",
    subcls: "Pentapeptide GHRP",
    status: "Research chemical",
    evidence: "limited",
    summary:
      "A synthetic ghrelin-receptor agonist with a stronger and more reproducible GH response than GHRP-6 and less appetite stimulation. It was developed as a diagnostic agent for GH reserve testing.",
    moa: [
      "GHS-R1a agonism with high potency at the pituitary",
      "Gq/PLC signalling raises calcium and triggers GH granule release",
      "Moderate ACTH/cortisol and prolactin stimulation",
      "Synergises with GHRH analogues when co-administered",
    ],
    targets: [
      { name: "GHS-R1a", action: "agonist", note: "high potency" },
      { name: "GH secretion", action: "stimulant", note: "strong, reproducible pulse" },
    ],
    pk: {
      halfLife: 0.6,
      tmax: 0.25,
      onset: 0.15,
      duration: 2,
      metabolism: "plasma proteolysis",
      excretion: "renal",
    },
    doses: [
      { route: "subcutaneous", low: 0.1, high: 0.3, unit: "mg", note: "diagnostic reference range; education only" },
    ],
    effects: {
      good: ["Robust GH release", "Less hunger than GHRP-6", "Useful in GH-reserve testing"],
      bad: ["Prolactin and cortisol elevation", "Flushing", "Water retention"],
    },
    flags: ["peptide", "gh-axis", "ghrelin-agonist"],
    warnings: [
      "Raises cortisol and prolactin, so it is not a 'clean' secretagogue",
      "Chronic use raises IGF-1 with the same metabolic caveats as GH itself",
      "No approved human indication outside diagnostic testing",
    ],
    tags: ["growth-hormone", "diagnostic", "peptide"],
    pubmed: "pralmorelin GHRP-2 growth hormone release",
  },
];
// END_F