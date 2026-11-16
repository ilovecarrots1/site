/* Human organ map — anatomy, hormones, diseases and drug links.
 * Coordinates are in the 300 x 640 viewBox used by app/views/organs.js.
 */

export const ORGAN_GROUPS = ["Neuro", "Endocrine", "Viscera", "Cardiorespiratory", "Reproductive", "Structural"];

export const ORGANS = [
  {
    id: "brain",
    name: "Brain",
    group: "Neuro",
    x: 150, y: 52, rx: 20, ry: 16,
    system: "Central nervous system",
    summary:
      "About 86 billion neurons and a similar number of glia, consuming 20% of the body's oxygen. It is the organ every psychoactive compound in this database acts on, and the reason receptor-level detail matters.",
    hormones: ["CRH", "TRH", "GnRH", "GHRH", "dopamine (as a neurohormone)", "somatostatin"],
    functions: [
      "Integration of sensory input and generation of behaviour",
      "Hypothalamic control of temperature, appetite, thirst and circadian timing",
      "Homeostatic feedback on every endocrine axis",
      "Memory consolidation and synaptic plasticity",
    ],
    diseases: [
      { name: "Alzheimer's disease", note: "Amyloid and tau pathology with cholinergic and glutamatergic loss" },
      { name: "Parkinson's disease", note: "Dopamine neuron loss in the substantia nigra" },
      { name: "Epilepsy", note: "Network hyperexcitability from imbalance of excitation and inhibition" },
      { name: "Depression and anxiety disorders", note: "Monoamine, glutamate and HPA-axis dysfunction" },
      { name: "Stroke", note: "Excitotoxic injury after ischaemia" },
    ],
    drugs: ["caffeine", "modafinil", "sertraline", "memantine", "levodopa", "psilocybin"],
    systems: ["dopamine", "serotonin", "gaba", "glutamate"],
    note: "Blood-brain barrier permeability decides whether a compound is a neuroactive drug or a peripheral one; it is the single most important filter in this database.",
  },
  {
    id: "hypothalamus",
    name: "Hypothalamus",
    group: "Neuro",
    x: 150, y: 66, rx: 8, ry: 5,
    system: "Neuroendocrine interface",
    summary:
      "A one-gram region that runs the endocrine system: it releases releasing hormones into the portal blood and integrates temperature, hunger, satiety and circadian signals.",
    hormones: ["CRH", "TRH", "GnRH", "GHRH", "somatostatin", "dopamine", "vasopressin", "orexin"],
    functions: [
      "Master control of the pituitary axes",
      "Thermoregulation and fever responses",
      "Appetite, satiety and energy balance",
      "Circadian rhythm via the suprachiasmatic nucleus",
      "Sympathetic and parasympathetic outflow control",
    ],
    diseases: [
      { name: "Hypothalamic obesity", note: "Structural damage or craniopharyngioma" },
      { name: "Kallmann syndrome", note: "GnRH neuron migration failure with anosmia" },
      { name: "Narcolepsy type 1", note: "Orexin neuron loss" },
      { name: "Functional hypothalamic amenorrhoea", note: "Energy deficit suppressing GnRH" },
    ],
    drugs: ["semaglutide", "suvorexant", "clomiphene", "kisspeptin-10", "mk-677"],
    systems: ["orexin", "dopamine", "histamine"],
    note: "Reproductive, thyroid, adrenal and growth axes all pass through here, which is why stress and energy deficit disturb every hormone at once.",
  },
  {
    id: "pituitary",
    name: "Pituitary gland",
    group: "Endocrine",
    x: 160, y: 72, rx: 7, ry: 5,
    system: "Endocrine",
    summary:
      "Two lobes in a bony saddle: the anterior lobe makes the tropic hormones that command other glands, the posterior lobe stores vasopressin and oxytocin made in the hypothalamus.",
    hormones: ["ACTH", "TSH", "LH", "FSH", "GH", "prolactin", "vasopressin", "oxytocin"],
    functions: [
      "Tropic control of thyroid, adrenal and gonadal output",
      "Growth hormone secretion in sleep-related pulses",
      "Prolactin release for lactation",
      "Water retention through vasopressin",
    ],
    diseases: [
      { name: "Prolactinoma", note: "Prolactin-secreting adenoma causing hypogonadism" },
      { name: "Acromegaly", note: "GH excess with metabolic and cardiac complications" },
      { name: "Cushing's disease", note: "ACTH-secreting adenoma" },
      { name: "Hypopituitarism", note: "Panhypopituitarism after trauma, radiation or apoplexy" },
    ],
    drugs: ["cabergoline", "somatropin", "cjc-1295", "hcg", "semaglutide"],
    systems: ["dopamine", "serotonin"],
    note: "Pituitary adenomas can compress the optic chiasm, so visual field loss plus hormonal symptoms is a red flag.",
  },
  {
    id: "pineal",
    name: "Pineal gland",
    group: "Neuro",
    x: 141, y: 52, rx: 6, ry: 4,
    system: "Neuroendocrine",
    summary:
      "A tiny gland that converts the light-dark signal into melatonin, telling the body what time it is. Calcifies with age and is often used as a midline landmark on scans.",
    hormones: ["melatonin"],
    functions: ["Circadian rhythm entrainment", "Seasonal reproductive timing in animals", "Antioxidant and immune modulation"],
    diseases: [{ name: "Pineal tumours", note: "Rare; cause hydrocephalus or precocious puberty" }, { name: "Calcification", note: "Common with age, usually incidental" }],
    drugs: ["melatonin", "ramelteon", "epithalon"],
    systems: ["serotonin"],
    note: "Melatonin secretion is suppressed by blue light, which is why evening screen exposure delays sleep onset.",
  },
  {
    id: "thyroid",
    name: "Thyroid gland",
    group: "Endocrine",
    x: 150, y: 108, rx: 13, ry: 8,
    system: "Endocrine",
    summary:
      "Two lobes wrapped around the trachea that set the body's metabolic rate. Every cell in the body depends on its output, and iodine is the bottleneck.",
    hormones: ["thyroxine (T4)", "triiodothyronine (T3)", "calcitonin"],
    functions: ["Basal metabolic rate", "Thermogenesis", "Protein synthesis and growth", "Calcium lowering via calcitonin"],
    diseases: [
      { name: "Hashimoto's thyroiditis", note: "Autoimmune hypothyroidism with antibody-mediated destruction" },
      { name: "Graves' disease", note: "TSH-receptor antibodies causing hyperthyroidism and ophthalmopathy" },
      { name: "Thyroid nodules and carcinoma", note: "Usually indolent papillary forms" },
      { name: "Iodine deficiency goitre", note: "Compensatory gland enlargement" },
    ],
    drugs: ["liothyronine", "lithium", "semaglutide"],
    systems: ["noradrenaline"],
    note: "Lithium concentrates in the thyroid and can cause both goitre and hypothyroidism with long-term use.",
  },
  {
    id: "parathyroid",
    name: "Parathyroid glands",
    group: "Endocrine",
    x: 163, y: 110, rx: 5, ry: 4,
    system: "Endocrine",
    summary:
      "Four pea-sized glands that control calcium by acting on bone, kidney and gut vitamin D activation. Calcium regulation has almost nothing to do with how much calcium you swallow.",
    hormones: ["parathyroid hormone (PTH)"],
    functions: ["Calcium homeostasis", "Phosphate excretion", "Activation of vitamin D to calcitriol"],
    diseases: [
      { name: "Primary hyperparathyroidism", note: "'Stones, bones, groans and psychiatric moans'" },
      { name: "Hypoparathyroidism", note: "Usually post-surgical; causes tetany and seizures" },
      { name: "Secondary hyperparathyroidism", note: "Chronic kidney disease and vitamin D deficiency" },
    ],
    drugs: ["abaloparatide"],
    systems: [],
    note: "Intermittent PTH-analogue dosing builds bone, while continuous PTH elevation destroys it — timing is everything.",
  },
  {
    id: "thymus",
    name: "Thymus",
    group: "Viscera",
    x: 150, y: 148, rx: 14, ry: 10,
    system: "Lymphatic and immune",
    summary:
      "Where T lymphocytes learn self-tolerance. Largest in childhood and largely replaced by fat in adults, but it remains functional throughout life.",
    hormones: ["thymosin", "thymopoietin", "thymulin"],
    functions: ["T cell maturation and selection", "Immune self-tolerance", "Cytokine signalling"],
    diseases: [{ name: "Thymoma", note: "Associated with myasthenia gravis" }, { name: "Thymic hyperplasia", note: "Autoimmune association" }, { name: "DiGeorge syndrome", note: "Congenital thymic hypoplasia" }],
    drugs: ["tb-500", "ghk-cu"],
    systems: [],
    note: "Glucocorticoids shrink the thymus quickly, which is why steroid exposure changes lymphocyte counts.",
  },
  {
    id: "heart",
    name: "Heart",
    group: "Cardiorespiratory",
    x: 137, y: 180, rx: 16, ry: 14,
    system: "Cardiovascular",
    summary:
      "A four-chambered pump that moves about five litres a minute at rest and five times that during hard exercise. It is the organ whose injury most often ends stimulant and anabolic misuse stories.",
    hormones: ["atrial natriuretic peptide", "B-type natriuretic peptide"],
    functions: ["Systemic circulation", "Blood pressure regulation via natriuretic peptides", "Coronary perfusion and cardiac output control"],
    diseases: [
      { name: "Heart failure", note: "Reduced ejection fraction from hypertension, ischaemia or toxicity" },
      { name: "Arrhythmia including atrial fibrillation", note: "Excess thyroid hormone, stimulants and electrolyte shifts" },
      { name: "Cardiomyopathy", note: "Hypertrophic, dilated or toxic (clenbuterol, cocaine)" },
      { name: "Ischaemic heart disease", note: "Atherosclerosis driven by lipids, pressure and inflammation" },
    ],
    drugs: ["clenbuterol", "liothyronine", "caffeine", "propranolol", "tirzepatide"],
    systems: ["noradrenaline"],
    note: "Sympathomimetic drugs and supraphysiological thyroid hormone both increase stroke volume demand on a heart that adapts by thickening and then failing.",
  },
  {
    id: "lungs",
    name: "Lungs",
    group: "Cardiorespiratory",
    x: 122, y: 166, rx: 18, ry: 16,
    system: "Respiratory",
    summary:
      "Seventy square metres of alveolar surface for gas exchange, plus a second job as a filter and metabolic organ that deactivates many drugs on their first pass.",
    hormones: ["surfactant-associated proteins", "angiotensin-converting enzyme products"],
    functions: ["Oxygen and carbon dioxide exchange", "Acid-base buffering via CO₂ regulation", "First-pass drug metabolism for inhaled agents", "Particle and microbe filtration"],
    diseases: [
      { name: "Asthma", note: "Reversible airway obstruction, beta-2 responsive" },
      { name: "COPD", note: "Fixed obstruction, usually from smoking" },
      { name: "Pulmonary embolism", note: "Thrombotic; relevant to SERM and hormone exposure" },
      { name: "Pulmonary hypertension", note: "Raised pressures, worsened by some stimulants" },
    ],
    drugs: ["nicotine", "clenbuterol", "cbd"],
    systems: ["acetylcholine", "noradrenaline"],
    note: "Beta-2 agonists relax the airways but also the heart's rhythm at high dose, which is why 'clen' is a cardiac gamble.",
  },
  {
    id: "liver",
    name: "Liver",
    group: "Viscera",
    x: 176, y: 214, rx: 20, ry: 14,
    system: "Hepatobiliary",
    summary:
      "The metabolic clearing house: first-pass metabolism, gluconeogenesis, cholesterol and hormone synthesis, and detoxification. Nearly every oral drug in this database passes through it.",
    hormones: ["IGF-1", "angiotensinogen", "thrombopoietin", "SHBG"],
    functions: ["First-pass drug metabolism (CYP450)", "Gluconeogenesis and glycogen storage", "Bile production and lipid handling", "Conjugation and elimination of hormones", "Clotting factor synthesis"],
    diseases: [
      { name: "Metabolic dysfunction-associated steatotic liver disease", note: "Fat accumulation linked to obesity and insulin resistance" },
      { name: "Drug-induced liver injury", note: "17-alpha-alkylated steroids, ketamine, paracetamol, methotrexate" },
      { name: "Cirrhosis", note: "Fibrosis with portal hypertension" },
      { name: "Viral hepatitis", note: "A, B, C with different chronicity" },
    ],
    drugs: ["oxandrolone", "stanozolol", "methandienone", "ketamine", "n-acetylcysteine", "semaglutide"],
    systems: [],
    note: "Oral 17-alpha-alkylated anabolic steroids are the classic cause of cholestatic hepatotoxicity; injectable esters bypass most of it.",
  },
  {
    id: "stomach",
    name: "Stomach",
    group: "Viscera",
    x: 126, y: 214, rx: 15, ry: 12,
    system: "Digestive",
    summary:
      "Acid factory and slow-release reservoir. Its pH determines whether a drug dissolves, and its emptying rate determines how fast it reaches the duodenum.",
    hormones: ["gastrin", "ghrelin", "histamine (paracrine)"],
    functions: ["Protein digestion via acid and pepsin", "Vitamin B12 absorption pathway", "Killing of ingested microbes", "Drug dissolution and controlled release"],
    diseases: [
      { name: "Peptic ulcer disease", note: "H. pylori or NSAID-related" },
      { name: "Gastroparesis", note: "Delayed emptying; worsened by incretin agonists" },
      { name: "Gastro-oesophageal reflux", note: "Acid exposure of the oesophagus" },
      { name: "Gastritis", note: "Mucosal inflammation, alcohol and NSAIDs" },
    ],
    drugs: ["semaglutide", "tirzepatide", "ghrp-6", "caffeine", "mk-677"],
    systems: ["histamine"],
    note: "GLP-1 agonists deliberately slow gastric emptying; that is both the mechanism of satiety and the source of nausea.",
  },
  {
    id: "pancreas",
    name: "Pancreas",
    group: "Viscera",
    x: 143, y: 232, rx: 16, ry: 7,
    system: "Digestive and endocrine",
    summary:
      "Two organs in one: exocrine acini that release digestive enzymes, and islets that release insulin, glucagon and somatostatin. The islet is where incretin drugs and GH side effects collide.",
    hormones: ["insulin", "glucagon", "somatostatin", "pancreatic polypeptide", "amylin"],
    functions: ["Glycaemic control via insulin and glucagon", "Exocrine enzyme secretion for digestion", "Bicarbonate neutralisation of chyme"],
    diseases: [
      { name: "Type 1 diabetes", note: "Autoimmune beta-cell destruction" },
      { name: "Type 2 diabetes", note: "Insulin resistance with progressive beta-cell failure" },
      { name: "Acute pancreatitis", note: "Gallstones, alcohol, hypertriglyceridaemia, incretins (rare)" },
      { name: "Pancreatic cancer", note: "Late presentation and poor prognosis" },
    ],
    drugs: ["insulin", "semaglutide", "tirzepatide", "retatrutide", "liothyronine"],
    systems: [],
    note: "Anything that raises insulin resistance — GH, glucocorticoids, IGF-1 use — puts long-term strain on beta cells.",
  },
];
// END_ORGANS

export const ORGAN_BY_ID = new Map(ORGANS.map((o) => [o.id, o]));

export function organsForSystem(systemId) {
  return ORGANS.filter((o) => (o.systems || []).includes(systemId));
}

export function organsForGroup(group) {
  return ORGANS.filter((o) => o.group === group);
}
