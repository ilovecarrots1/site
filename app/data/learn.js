/* Courses, lessons, quizzes and the flashcard deck. */

export const COURSES = [
  {
    id: "m1",
    title: "Neuron foundations",
    level: "Foundation",
    minutes: 28,
    accent: "violet",
    blurb: "How a single cell maintains a voltage, fires, and talks to its neighbours. Every drug in this app acts somewhere in this story.",
    lessons: [
      {
        id: "m1l1",
        title: "The resting neuron",
        minutes: 8,
        xp: 40,
        content: `## A cell that runs on batteries

A neuron is a lipid membrane studded with proteins, and the membrane is a capacitor: charge outside, charge inside, separated by an insulator.

- **Inside** the cell: high K⁺ (~140 mM), low Na⁺ (~12 mM), negative charge (~−70 mV)
- **Outside**: high Na⁺ (~145 mM), low K⁺ (~4 mM), high Cl⁻, positive charge

That gradient is not free. The **Na⁺/K⁺-ATPase** burns one ATP to push 3 Na⁺ out and 2 K⁺ in — roughly 20–40% of the brain's energy budget goes to restoring gradients.

### Why the inside is negative

Two forces fight at the membrane:

1. **Chemical gradient** — K⁺ wants to leave (it is concentrated inside)
2. **Electrical gradient** — negative charge inside pulls K⁺ back

Equilibrium is reached at the **Nernst potential** for K⁺ (about −90 mV). The resting membrane sits near −70 mV because a small Na⁺ leak pulls it up. Leaky K⁺ channels (K2P) set the baseline; the Na⁺/K⁺ pump maintains the gradient that makes any of this possible.

> Hypoxia destroys the pump first. Without ATP the gradient collapses, neurons depolarise, glutamate floods out, and excitotoxicity follows. This is why stroke damage spreads beyond the initial clot.

### Clinical hook

Anything that changes ion channel behaviour changes excitability. Local anaesthetics block Na⁺ channels. Ethanol and benzodiazepines enhance Cl⁻ flow. Magnesium blocks NMDA channels. The same physics, different levers.`,
        quiz: [
          {
            question: "Which transporter maintains the resting ion gradients?",
            options: ["Na⁺/K⁺-ATPase", "VMAT2", "SERT", "Adenylyl cyclase"],
            correctIndex: 0,
            explanation: "The Na⁺/K⁺-ATPase moves 3 Na⁺ out and 2 K⁺ in per ATP, preserving the gradients that all signalling depends on.",
          },
          {
            question: "The resting membrane potential of a typical neuron is around:",
            options: ["+40 mV", "0 mV", "−70 mV", "−150 mV"],
            correctIndex: 2,
            explanation: "−70 mV reflects a dominant K⁺ permeability with a small Na⁺ leak pulling the value above the K⁺ equilibrium potential of −90 mV.",
          },
          {
            question: "Why does stroke damage spread beyond the original clot?",
            options: ["Because blood pressure rises", "Because ATP loss collapses ion gradients and glutamate floods out", "Because myelin dissolves", "Because dopamine is depleted"],
            correctIndex: 1,
            explanation: "Without ATP the pump fails, membranes depolarise, and massive glutamate release drives excitotoxic calcium entry in surrounding tissue.",
          },
        ],
      },
      {
        id: "m1l2",
        title: "The action potential",
        minutes: 10,
        xp: 45,
        content: `## All-or-nothing

An action potential is a brief, self-regenerating reversal of membrane voltage. It is **all-or-nothing**: a stronger stimulus produces more spikes, not bigger ones.

### The sequence

1. **Threshold** (~−55 mV): voltage-gated Na⁺ channels open
2. **Depolarisation**: Na⁺ rushes in, voltage climbs toward +40 mV
3. **Inactivation**: Na⁺ channels close their inactivation gate (ball-and-chain)
4. **Repolarisation**: K⁺ channels open, K⁺ leaves
5. **Hyperpolarisation**: K⁺ channels close slowly, overshooting below rest
6. **Refractory period**: Na⁺ channels unavailable — this enforces directionality

### Encoding intensity

The nervous system encodes strength in **frequency** and **recruitment**, not amplitude. More intense stimuli recruit more neurons and fire them faster. Frequency is capped by the refractory period (~1 ms absolute, so ~1000 Hz theoretical maximum, ~200–300 Hz realistic for brief bursts).

### Myelin and speed

Myelin wraps axons and forces conduction to jump between nodes of Ranvier — **saltatory conduction**. A myelinated axon conducts at up to 120 m/s; unmyelinated at 0.5–2 m/s. Multiple sclerosis destroys myelin and slows or blocks conduction, producing the classic symptoms.

> **Local anaesthetics** work from the inside. They are weak bases that cross the membrane in uncharged form, then block the Na⁺ channel pore from within. Inflamed tissue is acidic — more drug stays charged, cannot cross, and anaesthesia fails. That is why an abscess is hard to numb.`,
        quiz: [
          {
            question: "How does a neuron signal a stronger stimulus?",
            options: ["Bigger action potentials", "Higher firing frequency and more recruited neurons", "Longer refractory periods", "Reversing the ion gradient"],
            correctIndex: 1,
            explanation: "Action potentials are all-or-nothing, so intensity is encoded in frequency and population recruitment.",
          },
          {
            question: "What does myelin do?",
            options: ["Increases membrane capacitance", "Allows saltatory conduction between nodes of Ranvier", "Blocks K⁺ channels", "Stores neurotransmitters"],
            correctIndex: 1,
            explanation: "Myelin insulates the axon so the spike regenerates only at nodes of Ranvier, raising conduction velocity up to ~100×.",
          },
          {
            question: "Why is inflamed tissue harder to numb with local anaesthetics?",
            options: ["More blood flow removes the drug", "Acidic pH keeps more drug in the charged form that cannot cross the membrane", "Sodium channels disappear", "Nerves stop firing"],
            correctIndex: 1,
            explanation: "Local anaesthetics must cross the membrane uncharged. In acidosis, a larger fraction stays protonated and cannot reach the intracellular binding site.",
          },
        ],
      },
      {
        id: "m1l3",
        title: "The synapse",
        minutes: 10,
        xp: 45,
        content: `## Where pharmacology happens

A chemical synapse has five working parts, and almost every psychoactive drug targets one of them:

1. **Synthesis** — enzymes build the transmitter
2. **Packaging** — VMAT or VAChT loads vesicles
3. **Release** — Ca²⁺ entry triggers vesicle fusion (SNARE proteins)
4. **Reception** — receptors convert chemistry into electrical or biochemical signal
5. **Clearance** — reuptake transporters and degrading enzymes end the signal

### Quantal release

Neurotransmitters are released in **quanta** (vesicles). A single vesicle contains roughly 1,000–10,000 molecules. Release probability varies by synapse and is tuned by neuromodulators — this is a major site of drug action (e.g. amphetamine increases vesicular release, adenosine A1 agonism decreases it).

### Receptors: two families

- **Ionotropic** — a channel opens in under a millisecond. Fast, brief, used for precise signalling (AMPA, NMDA, GABA-A, nAChR).
- **Metabotropic** — a G-protein cascade. Slower (100 ms to minutes), amplifies, and changes how the cell responds to future input (D2, 5-HT2A, GABA-B, mGluR).

> A drug's **affinity** (how tightly it binds, Kd) determines occupancy. Its **efficacy** (what happens after binding) determines effect. A full agonist, partial agonist, antagonist and inverse agonist can all occupy the same receptor with completely different outcomes — that is why "it hits the same receptor" tells you almost nothing on its own.

### Termination

Serotonin is cleared by SERT and MAO-A. Dopamine by DAT and COMT/MAO-B. Acetylcholine by acetylcholinesterase in under a millisecond — the fastest clearance in the brain. Peptides have no reuptake at all; they diffuse and are degraded by peptidases, which is why peptide drugs have such short windows.`,
        quiz: [
          {
            question: "Which process does amphetamine primarily amplify?",
            options: ["Receptor degradation", "Vesicular release and transporter reversal", "Enzymatic synthesis of serotonin", "Myelination"],
            correctIndex: 1,
            explanation: "Amphetamine enters terminals, displaces vesicular monoamines and reverses DAT/NET, pushing transmitters into the synapse.",
          },
          {
            question: "Affinity describes:",
            options: ["How tightly a drug binds its target", "How strong the resulting effect is", "How fast the drug is cleared", "How many receptors exist"],
            correctIndex: 0,
            explanation: "Affinity = binding strength (Kd). Efficacy = the response produced after binding. They are independent properties.",
          },
          {
            question: "Which transmitter is cleared fastest?",
            options: ["Serotonin", "Dopamine", "Acetylcholine", "Peptides"],
            correctIndex: 2,
            explanation: "Acetylcholinesterase hydrolyses acetylcholine within about a millisecond — the fastest clearance mechanism in the nervous system.",
          },
        ],
      },
    ],
  },
  {
    id: "m2",
    title: "Monoamines in practice",
    level: "Intermediate",
    minutes: 34,
    accent: "amber",
    blurb: "Dopamine, noradrenaline and serotonin: what each pathway actually does, and why 'raising' one does not produce a predictable mood.",
    lessons: [
      {
        id: "m2l1",
        title: "Dopamine: wanting, not liking",
        minutes: 12,
        xp: 55,
        content: `## Three pathways, three jobs

| Pathway | From → to | Function |
| --- | --- | --- |
| Nigrostriatal | Substantia nigra → striatum | Movement |
| Mesolimbic | VTA → nucleus accumbens | Motivation, reward learning |
| Mesocortical | VTA → prefrontal cortex | Working memory, executive control |

A fourth, **tuberoinfundibular**, runs from hypothalamus to pituitary and inhibits prolactin. This is why dopamine-blocking antipsychotics raise prolactin.

### Prediction error, not pleasure

The classic finding: dopamine neurons fire when a reward is **better than expected**, not when it arrives as expected. Once a cue reliably predicts food, the spike moves to the **cue**. The signal is a learning term — a teaching signal that updates expectations.

This is why "dopamine = pleasure" is wrong in a way that matters clinically. Dopamine drives **wanting** (incentive salience). The **liking** is mediated by opioids and endocannabinoids in small hedonic hotspots. Addiction is a pathology of wanting, not of enjoying.

### The rate-limiting step

Tyrosine → L-DOPA is catalysed by **tyrosine hydroxylase**, which is inhibited by end-product dopamine and requires BH4 and iron. This is the main control valve. L-DOPA bypasses it entirely, which is why levodopa works so powerfully in Parkinson's, and why it eventually produces dyskinesia: it floods a system that has lost its ability to buffer.

> **Caffeine** is not dopaminergic directly. It blocks adenosine A2A receptors, which normally dampen D2 signalling in the striatum. The dopamine effect is indirect — and it is why A2A antagonists feel stimulating without releasing dopamine.`,
        quiz: [
          {
            question: "Dopamine neurons primarily encode:",
            options: ["Absolute pleasure intensity", "Reward prediction error", "Muscle length", "Serotonin levels"],
            correctIndex: 1,
            explanation: "Dopamine firing shifts to the earliest predictor of reward and scales with the difference between expected and received value.",
          },
          {
            question: "Which pathway is damaged in Parkinson's disease?",
            options: ["Mesolimbic", "Mesocortical", "Nigrostriatal", "Tuberoinfundibular"],
            correctIndex: 2,
            explanation: "Degeneration of substantia nigra pars compacta neurons removes the nigrostriatal dopamine supply to the striatum.",
          },
          {
            question: "Caffeine increases dopamine signalling indirectly by:",
            options: ["Blocking DAT", "Antagonising adenosine A2A receptors", "Inhibiting MAO-B", "Releasing vesicular dopamine"],
            correctIndex: 1,
            explanation: "A2A receptors normally suppress D2 signalling; blocking them disinhibits the striatal dopamine system.",
          },
        ],
      },
      {
        id: "m2l2",
        title: "Noradrenaline: the arousal dial",
        minutes: 10,
        xp: 50,
        content: `## One nucleus, whole-brain reach

The **locus coeruleus** contains only a few tens of thousands of neurons in humans, yet it supplies almost all forebrain noradrenaline. Its firing pattern maps onto arousal:

- **Tonic firing** (low, steady): drowsy or relaxed attention
- **Phasic bursts**: novel or salient stimuli — a sharp increase in signal-to-noise
- **High tonic** (stress): poor discrimination, anxiety, distractibility

This inverted-U explains a lot: too little noradrenaline means poor vigilance; too much means the prefrontal cortex goes offline and the amygdala takes over. Optimal performance sits in the middle, and the middle moves with sleep, stress and genetics.

### Receptors and their jobs

- **α1** (Gq, excitatory): vasoconstriction, arousal; the reason noradrenaline raises blood pressure
- **α2** (Gi, inhibitory): presynaptic autoreceptor. Agonists like clonidine quiet the system; antagonists like yohimbine wake it up
- **β1/β2** (Gs): cardiac output, tremor, bronchodilation. Propranolol blocks these peripherally

### Why stimulants feel different from each other

Methylphenidate blocks DAT and NET with similar affinity. Amphetamine reverses the transporters. Atomoxetine blocks NET only, which in prefrontal cortex also raises dopamine (because NET clears dopamine there) but leaves the nucleus accumbens almost untouched — hence no euphoria and no abuse potential.

> **Rebound** is not a side effect, it is the pharmacology: when the reuptake block wears off, presynaptic depletion and receptor adaptation leave you below baseline for a few hours. That is the crash.`,
        quiz: [
          {
            question: "The inverted-U relationship for noradrenaline means:",
            options: ["More is always better", "Both too little and too much impair prefrontal function", "Noradrenaline only affects the heart", "Receptor number never changes"],
            correctIndex: 1,
            explanation: "Optimal arousal sits in the middle. High tonic noradrenaline under stress degrades prefrontal control and shifts control to subcortical circuits.",
          },
          {
            question: "α2 receptors are usually:",
            options: ["Excitatory postsynaptic", "Presynaptic inhibitory autoreceptors", "Ion channels for chloride", "Dopamine transporters"],
            correctIndex: 1,
            explanation: "α2 receptors sit on the presynaptic terminal and inhibit further noradrenaline release — the basis of clonidine's action.",
          },
          {
            question: "Atomoxetine has low abuse potential because:",
            options: ["It is not absorbed orally", "It blocks NET but leaves striatal DAT largely untouched", "It destroys dopamine", "It cannot cross the blood-brain barrier"],
            correctIndex: 1,
            explanation: "Without direct DAT blockade in the nucleus accumbens, the reinforcing dopamine surge of stimulants does not occur.",
          },
        ],
      },
      {
        id: "m2l3",
        title: "Serotonin: patience and inhibition",
        minutes: 12,
        xp: 55,
        content: `## Fourteen receptors, one transmitter

Serotonin (5-HT) has the most diverse receptor family in the brain: 13–14 subtypes across ionotropic (5-HT3) and metabotropic (5-HT1, 2, 4, 5, 6, 7) families. This is why serotonergic drugs can be anxiolytic, psychedelic, antiemetic or appetite-suppressing depending on which subtype they touch.

### The synthesis chain

Tryptophan → (TPH, BH4) → 5-HTP → (AADC, B6) → serotonin → (in pineal) → melatonin

**Tryptophan hydroxylase** is rate-limiting and is not saturated at normal dietary intakes — so tryptophan availability can shift serotonin output. **5-HTP bypasses TPH entirely**, which is why it is pharmacologically much stronger than tryptophan and much easier to overdo.

### What SSRIs actually do

Acutely, an SSRI blocks SERT and serotonin rises — but clinical benefit takes 2–4 weeks. During that lag, **5-HT1A autoreceptors** desensitise, so raphe firing recovers and serotonin release increases in projection areas. The therapeutic effect tracks the downstream adaptation, not the transporter occupancy.

This explains several clinical facts: early side effects (nausea, anxiety) appear immediately, onset of benefit is delayed, and the first two weeks carry the highest risk of activation or suicidal ideation in vulnerable patients.

### The dark side

Serotonin syndrome is a **triad**: mental status change, autonomic instability, neuromuscular hyperactivity (clonus, hyperreflexia). Clonus is the most specific sign. It is caused by too much serotonergic activity — usually two drugs, sometimes one at a high dose.

> Serotonin also depletes platelet stores, which is why SSRIs increase bleeding risk with NSAIDs. Platelets cannot synthesise serotonin; they depend entirely on SERT uptake.`,
        quiz: [
          {
            question: "Why do SSRIs take weeks to work?",
            options: ["They accumulate slowly", "Autoreceptor desensitisation is required before serotonin release rises", "The drug only reaches the brain after 3 weeks", "Serotonin is stored in fat"],
            correctIndex: 1,
            explanation: "Acute SERT blockade raises serotonin but also activates 5-HT1A autoreceptors. Clinical benefit follows their desensitisation and increased terminal release.",
          },
          {
            question: "The most specific sign of serotonin syndrome is:",
            options: ["Dry mouth", "Clonus", "Bradycardia", "Pupil constriction"],
            correctIndex: 1,
            explanation: "Clonus (especially inducible ankle clonus) and hyperreflexia are the neuromuscular hallmarks of serotonin toxicity.",
          },
          {
            question: "5-HTP is stronger than tryptophan because:",
            options: ["It is lipid soluble", "It bypasses the rate-limiting enzyme TPH", "It blocks SERT", "It is a receptor agonist"],
            correctIndex: 1,
            explanation: "5-HTP is one step past the rate-limiting enzyme, so conversion to serotonin depends only on AADC, which is not rate-limiting.",
          },
        ],
      },
    ],
  },
  {
    id: "m3",
    title: "Inhibition & excitation",
    level: "Intermediate",
    minutes: 26,
    accent: "green",
    blurb: "GABA keeps the system stable, glutamate makes it plastic, acetylcholine decides what gets attention. The three systems most drugs borrow.",
    lessons: [
      {
        id: "m3l1",
        title: "GABA: the brakes",
        minutes: 9,
        xp: 45,
        content: `## One decarboxylation flips the signal

Glutamate → (GAD65/67, vitamin B6) → GABA. The same molecule that excites most of the brain becomes the main inhibitory transmitter after a single decarboxylation.

**GABA-A** is a pentameric chloride channel. When GABA (or a benzodiazepine, barbiturate, neurosteroid or alcohol) binds, Cl⁻ enters and the membrane hyperpolarises. Subunit composition determines the effect:

- **α1** → sedation, amnesia (Z-drugs are selective here)
- **α2/α3** → anxiolysis, muscle relaxation (classic benzodiazepines)
- **α4/α6** → insensitive to benzodiazepines, sensitive to alcohol and neurosteroids

**GABA-B** is a G-protein receptor that opens K⁺ channels and closes Ca²⁺ channels. Baclofen, phenibut and GHB act here — a completely different pharmacology with a completely different withdrawal profile.

### Tolerance and withdrawal, mechanistically

Chronic benzodiazepine use causes GABA-A receptors to internalise and uncouple from their chloride channel. The inhibitory system becomes weaker at baseline, which is **why** anxiety, insomnia and hyperalgesia appear during withdrawal — the excitatory systems were never inhibited differently, they were simply unmasked.

This is also why withdrawal from benzodiazepines, alcohol and phenibut can cause seizures and delirium: the excitatory/inhibitory balance rebounds past normal.

> **Flumazenil** is a benzodiazepine antagonist. In an overdose it reverses sedation, but it can precipitate seizures in dependent patients — because their brain has adapted to constant inhibition.`,
        quiz: [
          {
            question: "Which GABA-A subunits mediate sedation and amnesia?",
            options: ["α1", "α4", "β2", "γ3"],
            correctIndex: 0,
            explanation: "α1-containing receptors mediate sedation, anterograde amnesia and anticonvulsant effects; Z-drugs preferentially target them.",
          },
          {
            question: "GABA-B receptors act mainly by:",
            options: ["Opening chloride channels", "Opening K⁺ channels and closing Ca²⁺ channels via G proteins", "Blocking sodium channels", "Releasing glutamate"],
            correctIndex: 1,
            explanation: "GABA-B is metabotropic: Gβγ opens GIRK potassium channels and inhibits voltage-gated calcium channels, reducing transmitter release.",
          },
          {
            question: "Why is benzodiazepine withdrawal excitatory?",
            options: ["The drug becomes a stimulant", "GABA-A receptors internalise, unmasking baseline excitation", "Dopamine rises", "Serotonin is depleted"],
            correctIndex: 1,
            explanation: "Chronic potentiation leads to receptor downregulation; removing the drug leaves inhibitory tone below baseline, so excitatory systems dominate.",
          },
        ],
      },
      {
        id: "m3l2",
        title: "Glutamate & plasticity",
        minutes: 9,
        xp: 45,
        content: `## The coincidence detector

The **NMDA receptor** is the most important coincidence detector in the brain. It opens only when two things happen together:

1. Glutamate binds (presynaptic activity)
2. The membrane is already depolarised enough to expel the Mg²⁺ block (postsynaptic activity)

That AND-gate is the molecular basis of **Hebbian learning**: cells that fire together wire together. Ca²⁺ entry through NMDA triggers CaMKII, then AMPA receptors are inserted into the membrane — **long-term potentiation (LTP)**. Weak or unpaired stimulation produces the reverse, **LTD**.

### Why NMDA antagonists dissociate

Ketamine and memantine block the channel, reducing the coincidence signal. Normal perception continues, but the binding of experience into coherent self-models frays — hence dissociation, depersonalisation and altered time sense.

**Memantine's trick** is its fast off-rate: it leaves the channel quickly when normal physiological activity resumes, so it dampens pathological excess while leaving learning intact. Ketamine's slower off-rate produces full dissociation.

### The rapid antidepressant paradox

Ketamine works in hours, not weeks — and the mechanism is not "more glutamate". Blocking NMDA on GABAergic interneurons disinhibits glutamate release onto AMPA receptors, which triggers **BDNF release and mTORC1-dependent synaptogenesis** in prefrontal cortex. New spines appear within 24 hours in animal models.

> This is the emerging common pathway: psilocybin, ketamine, sleep deprivation and electroconvulsive therapy all increase BDNF signalling and dendritic spine density within days. The interesting question is why the effect fades — and that is where maintenance and integration matter.`,
        quiz: [
          {
            question: "The NMDA receptor requires which two events to open?",
            options: ["Glutamate binding and membrane depolarisation to relieve Mg²⁺ block", "GABA binding and hyperpolarisation", "Two glutamate molecules and no calcium", "Serotonin and dopamine together"],
            correctIndex: 0,
            explanation: "The voltage-dependent Mg²⁺ block is expelled by depolarisation, so the channel opens only with coincident pre- and postsynaptic activity.",
          },
          {
            question: "Ketamine's rapid antidepressant effect is linked to:",
            options: ["Direct dopamine release", "AMPA-driven BDNF release and synaptogenesis", "GABA-A blockade", "Serotonin reuptake inhibition"],
            correctIndex: 1,
            explanation: "Disinhibition of glutamate release increases AMPA throughput, activating mTORC1 and rapidly increasing BDNF and dendritic spines.",
          },
          {
            question: "Memantine causes less dissociation than ketamine mainly because:",
            options: ["It does not reach the brain", "It has a fast off-rate and lower affinity", "It is a GABA agonist", "It is a partial agonist"],
            correctIndex: 1,
            explanation: "Fast channel unblocking preserves physiological NMDA activity, so the pathological tone is dampened without full dissociation.",
          },
        ],
      },
      {
        id: "m3l3",
        title: "Acetylcholine & attention",
        minutes: 8,
        xp: 40,
        content: `## Two cholinergic systems

- **Basal forebrain** (nucleus basalis of Meynert) → cortex and hippocampus: attention, arousal, memory encoding. Degenerates early in Alzheimer's.
- **Brainstem + autonomic** → arousal, REM sleep, parasympathetic organs, neuromuscular junction.

Acetylcholine synthesis is a two-component reaction: choline + acetyl-CoA → ACh, catalysed by **ChAT**. The rate-limiting factor is **choline supply** through the CHT transporter — not enzyme activity. That is the rationale behind choline donors like citicoline and alpha-GPC.

### Clearance is violent

Acetylcholinesterase hydrolyses ACh in **under one millisecond** — the fastest termination of any neurotransmitter. This is why:
- Cholinesterase inhibitors (donepezil, galantamine, huperzine A) have such broad effects — they extend a signal that is normally almost instantaneous
- Organophosphate poisoning is so catastrophic — ACh accumulates at every synapse, causing SLUDGE: salivation, lacrimation, urination, defecation, GI distress, emesis, plus bradycardia and bronchospasm

### Receptor logic

- **M1** (Gq, cortex/hippocampus): cognition — the target of investigational Alzheimer's drugs
- **M2** (Gi, heart): bradycardia — why cholinergic excess slows the heart
- **α4β2** nicotinic: addiction and attention; nicotine desensitises it within minutes
- **α7** nicotinic: calcium-permeable, attention and inflammation; galantamine potentiates it allosterically

> **Galantamine** is unique among AChE inhibitors because it also positively modulates nicotinic receptors. Two mechanisms, one molecule — and a side-effect profile that still includes nausea, bradycardia and vivid dreams.`,
        quiz: [
          {
            question: "The rate-limiting factor for acetylcholine synthesis is:",
            options: ["ChAT enzyme activity", "Choline availability via the CHT transporter", "Acetyl-CoA supply", "Vesicle count"],
            correctIndex: 1,
            explanation: "ChAT is not saturated; choline uptake through the high-affinity transporter limits how much ACh can be produced.",
          },
          {
            question: "Why do cholinesterase inhibitors cause bradycardia?",
            options: ["They block beta receptors", "ACh accumulation activates cardiac M2 receptors", "They increase noradrenaline", "They block sodium channels"],
            correctIndex: 1,
            explanation: "M2 muscarinic receptors in the heart slow the SA node; excess acetylcholine therefore reduces heart rate.",
          },
          {
            question: "Galantamine differs from donepezil because it also:",
            options: ["Blocks NMDA receptors", "Positively modulates nicotinic receptors", "Inhibits MAO", "Releases dopamine"],
            correctIndex: 1,
            explanation: "Galantamine is an allosteric potentiator of α7 and α4β2 nicotinic receptors in addition to inhibiting AChE.",
          },
        ],
      },
    ],
  },
  {
    id: "m4",
    title: "How drugs behave",
    level: "Applied",
    minutes: 30,
    accent: "cyan",
    blurb: "Half-life, bioavailability, tolerance and withdrawal — the maths that turns a molecule into an experience.",
    lessons: [
      {
        id: "m4l1",
        title: "Half-life, steady state, accumulation",
        minutes: 11,
        xp: 55,
        content: `## The single most useful number

**Half-life (t½)** is the time for blood concentration to fall by half. For most drugs with first-order kinetics, five half-lives bring you to ~97% of steady state — and about five more take you back down.

| t½ | Time to steady state | Time to near-elimination |
| --- | --- | --- |
| 2 h (nicotine) | ~10 h | ~10 h |
| 5 h (caffeine) | ~25 h | ~25 h |
| 15 h (armodafinil) | ~3 days | ~3 days |
| 30 h (fluoxetine's parent) | ~6 days | ~6 days |
| 96 h (norfluoxetine) | ~20 days | ~20 days |

### Accumulation

If you dose more often than every ~4 half-lives, the drug accumulates. The **accumulation ratio** is roughly 1 / (1 − e^(−0.693 × τ / t½)), where τ is the dosing interval. Halve the interval and you roughly double accumulation.

This is why:
- Caffeine twice daily is fine; caffeine every 2 hours builds a permanent baseline
- Lithium (t½ ~24 h) needs days to reach steady state, and levels taken too early mislead
- Memantine (t½ ~70 h) creeps up on people — side effects appear in week two, not day one

### Bioavailability and first pass

Oral drugs pass the gut wall and liver before reaching systemic circulation. **First-pass metabolism** can destroy most of a dose: propranolol has ~25% bioavailability, morphine ~30%, and oral testosterone is almost completely inactivated. This is also why grapefruit juice matters — it inhibits intestinal CYP3A4 and can double exposure to some statins and calcium channel blockers.

> **Zero-order kinetics** is the exception that kills: alcohol, phenytoin and high-dose aspirin saturate their metabolising enzymes, so a fixed amount is cleared per hour regardless of concentration. Small dose increases then produce large, unpredictable level jumps.`,
        quiz: [
          {
            question: "Roughly how long until a drug with a 6-hour half-life reaches steady state?",
            options: ["6 hours", "12 hours", "About 30 hours", "About 6 days"],
            correctIndex: 2,
            explanation: "Steady state arrives after ~5 half-lives: 5 × 6 h = 30 hours.",
          },
          {
            question: "First-pass metabolism primarily affects:",
            options: ["Intravenous drugs", "Orally administered drugs before they reach systemic circulation", "Topical drugs", "Drugs given sublingually"],
            correctIndex: 1,
            explanation: "Oral drugs are metabolised by gut wall and liver before entering systemic circulation, reducing bioavailability.",
          },
          {
            question: "Zero-order kinetics means:",
            options: ["Half the drug is cleared per half-life", "A constant amount is cleared per unit time because enzymes are saturated", "The drug is not absorbed", "Clearance doubles with dose"],
            correctIndex: 1,
            explanation: "Saturated enzymes cannot scale with concentration, so elimination becomes linear in amount rather than proportional — small dose changes cause disproportionate level changes.",
          },
        ],
      },
      {
        id: "m4l2",
        title: "Affinity, efficacy, dose-response",
        minutes: 9,
        xp: 45,
        content: `## Occupancy is not effect

- **Kd**: the concentration where half the receptors are occupied. Lower Kd = higher affinity.
- **EC50**: the concentration producing half the maximal effect.
- **Emax**: the maximal effect achievable.

A drug can have very high affinity and zero efficacy — that is a competitive antagonist. It can have moderate affinity and *negative* efficacy — an inverse agonist, which reduces constitutive activity below baseline (many antipsychotics are inverse agonists at D2).

### Partial agonists

A partial agonist produces less than the full response even at 100% occupancy. **Buprenorphine** at µ-opioid receptors is the classic example: enough effect to stop withdrawal and cravings, not enough to cause profound respiratory depression. That ceiling is why it is safer than full agonists — and why it blocks other opioids from working.

### The therapeutic window

The gap between effective and toxic concentration. Narrow windows demand monitoring:

- **Lithium**: 0.6–0.8 mmol/L therapeutic; >1.5 mmol/L toxic; >2.5 mmol/L life-threatening
- **Digoxin**, **warfarin**, **phenytoin**, **clozapine** — all require levels or counts

### Receptor reserve and tolerance

If a tissue has spare receptors, a low-occupancy signal can still produce a full response. This is why some drugs keep working as receptor density falls — and why others lose effect quickly. Tolerance mechanisms differ:

- **Pharmacodynamic**: receptor downregulation (opioids, benzodiazepines)
- **Pharmacokinetic**: enzyme induction (carbamazepine induces its own metabolism)
- **Behavioural**: learned compensation (caffeine tolerance is largely this)

> **Idiosyncratic reactions** do not follow dose-response at all. Stevens-Johnson syndrome from lamotrigine, hepatotoxicity from ashwagandha, agranulocytosis from clozapine — immune-mediated, unpredictable, and unrelated to pharmacology.`,
        quiz: [
          {
            question: "A drug with high affinity but zero intrinsic efficacy is a:",
            options: ["Full agonist", "Partial agonist", "Competitive antagonist", "Inverse agonist"],
            correctIndex: 2,
            explanation: "It occupies the receptor without activating it, blocking agonists that would otherwise bind.",
          },
          {
            question: "Buprenorphine's safety ceiling comes from being:",
            options: ["A full agonist", "A partial agonist at µ-opioid receptors", "An antagonist", "A reuptake inhibitor"],
            correctIndex: 1,
            explanation: "Partial agonism caps the maximum respiratory depression while still suppressing withdrawal and cravings.",
          },
          {
            question: "Which is a pharmacokinetic tolerance mechanism?",
            options: ["Receptor downregulation", "Enzyme induction increasing metabolism", "Learning to compensate behaviourally", "Reduced receptor affinity"],
            correctIndex: 1,
            explanation: "Enzyme induction means the body clears the drug faster — a change in what the body does to the drug, not the drug to the body.",
          },
        ],
      },
      {
        id: "m4l3",
        title: "Tolerance, dependence, withdrawal",
        minutes: 10,
        xp: 50,
        content: `## Three words people confuse

- **Tolerance**: the same dose produces less effect (or more is needed for the same effect)
- **Physical dependence**: adaptation such that stopping produces withdrawal — happens to anyone on long-term benzodiazepines, opioids, SSRIs or steroids, with or without addiction
- **Addiction**: compulsive use despite harm, with craving and loss of control

You can be dependent without being addicted (SSRI discontinuation), and addicted without classic physical dependence (cocaine, gambling).

### Withdrawal patterns by system

| Drug class | Time to onset | Signature | Danger |
| --- | --- | --- | --- |
| Benzodiazepines (short) | 12–24 h | Anxiety, tremor, insomnia | **Seizures, delirium — can be fatal** |
| Alcohol | 6–24 h | Tremor, sweating, hallucinosis | **Seizures, DT — can be fatal** |
| Opioids | 8–24 h | Flu-like, cramps, diarrhoea | Very unpleasant, rarely fatal |
| SSRIs | 1–3 days | Dizziness, "brain zaps", irritability | Uncomfortable, not dangerous |
| Caffeine | 12–24 h | Headache, fatigue, irritability | Benign |
| Phenibut | 12–48 h | Anxiety, insomnia, psychosis | **Can be severe — taper** |

### Kindling and why repeated withdrawals matter

Each withdrawal episode lowers the seizure threshold and makes the next one worse. This is **kindling**, best documented with alcohol and benzodiazepines. It is the strongest argument against repeated stop-start cycles and for a single, slow, structured taper.

### Tapering principles

1. Stabilise on a long-acting equivalent first (e.g. diazepam for benzodiazepines)
2. Reduce by 5–10% of the current dose every 2–4 weeks
3. Slow down near the end — the last steps are the hardest
4. Never taper two dependence-forming drugs simultaneously without supervision

> **Post-acute withdrawal** (PAWS) can last months: anhedonia, sleep disruption, anxiety, low stress tolerance. It is not relapse; it is a nervous system recalibrating. Knowing that difference prevents a lot of unnecessary self-blame.`,
        quiz: [
          {
            question: "Physical dependence is best defined as:",
            options: ["Compulsive use despite harm", "Adaptation that produces withdrawal on cessation", "Needing a higher dose for the same effect", "Allergic reaction"],
            correctIndex: 1,
            explanation: "Dependence is an adaptation state; addiction is a behavioural syndrome. They often coexist but are not the same thing.",
          },
          {
            question: "Which withdrawal syndrome can be fatal without medical care?",
            options: ["SSRI discontinuation", "Caffeine withdrawal", "Benzodiazepine withdrawal", "Nicotine withdrawal"],
            correctIndex: 2,
            explanation: "Benzodiazepine (and alcohol) withdrawal can cause seizures and delirium tremens, both potentially lethal.",
          },
          {
            question: "Kindling refers to:",
            options: ["Increasing sensitivity to withdrawal with each episode", "Building tolerance faster over time", "A type of receptor", "Metabolic clearance"],
            correctIndex: 0,
            explanation: "Repeated withdrawal episodes progressively lower the seizure threshold and worsen subsequent withdrawals.",
          },
        ],
      },
    ],
  },
  {
    id: "m5",
    title: "Evidence & interactions",
    level: "Advanced",
    minutes: 24,
    accent: "rose",
    blurb: "How to read a study without being fooled, and how to reason about combinations when nobody has studied them.",
    lessons: [
      {
        id: "m5l1",
        title: "Reading evidence honestly",
        minutes: 9,
        xp: 50,
        content: `## The hierarchy, and its limits

1. **Systematic review / meta-analysis** of RCTs
2. **Randomised controlled trial** (double-blind)
3. **Cohort study** (observational, prospective)
4. **Case-control study**
5. **Case series / case report**
6. **Animal and in vitro data**
7. **Anecdote and forum reports**

Higher is generally better — but a bad meta-analysis of bad trials is worse than one good trial. Read the methods, not just the label.

### Five questions that deflate most claims

1. **Compared to what?** A supplement that beats placebo by 2 points on a 60-point scale is not "dramatically effective".
2. **Who was studied?** Healthy 20-year-olds vs people with a deficiency vs Alzheimer's patients produce completely different results. Replication in the target population matters.
3. **How big was it?** Small trials overestimate effects — the "winner's curse". Effect sizes shrink as sample size grows.
4. **Who paid?** Industry-funded trials are more likely to report favourable results, though the gap has narrowed with trial registration.
5. **Was it preregistered?** If the outcome was chosen after seeing the data, it is a hypothesis, not a finding.

### The replication problem

More than half of published psychology and cancer-biology findings fail to replicate at the same effect size. Nutrition and supplement research is especially fragile: food-frequency questionnaires, short durations, and publication bias toward positive results.

> **Absence of evidence is not evidence of absence** — but it is a reason to lower your confidence and your dose. The honest position on most nootropics is: unknown, not proven and not disproven. "Unknown" is a finding.`,
        quiz: [
          {
            question: "Which design provides the strongest causal evidence for a drug's effect?",
            options: ["Case report", "Randomised controlled trial", "Animal study", "Expert opinion"],
            correctIndex: 1,
            explanation: "Randomisation and blinding control for confounding and placebo effects, which is why RCTs sit near the top of the hierarchy.",
          },
          {
            question: "Small trials tend to:",
            options: ["Underestimate effects", "Overestimate effects due to publication and selection bias", "Be more reliable than large trials", "Have no placebo effect"],
            correctIndex: 1,
            explanation: "Small studies with significant results are more likely to be published, inflating apparent effect sizes — the winner's curse.",
          },
          {
            question: "'Absence of evidence' means:",
            options: ["The intervention is proven ineffective", "Confidence should be lowered but the question remains open", "The study was fraudulent", "The effect is zero"],
            correctIndex: 1,
            explanation: "Not finding an effect is not proof of no effect, especially with underpowered research — but it justifies caution.",
          },
        ],
      },
      {
        id: "m5l2",
        title: "Interaction mechanisms",
        minutes: 8,
        xp: 45,
        content: `## Two kinds of interaction

**Pharmacokinetic (PK)** — one drug changes what the body does to another:

- **Absorption**: calcium binds tetracyclines; grapefruit inhibits intestinal CYP3A4
- **Distribution**: displacement from albumin (warfarin + NSAIDs)
- **Metabolism**: CYP inhibition (fluoxetine, CBD, grapefruit) or induction (St John's Wort, carbamazepine, rifampicin)
- **Excretion**: lithium clearance falls with dehydration, NSAIDs, ACE inhibitors

**Pharmacodynamic (PD)** — one drug changes what the other does at the target:

- **Additive**: two sedatives; two QT prolongers
- **Synergistic**: alcohol + benzodiazepines on GABA-A (more than additive)
- **Antagonistic**: anticholinergic vs cholinergic drugs

### The interaction iceberg

Only a fraction of interactions are formally studied. The practical method:

1. List every substance, including supplements and recreational drugs
2. Map each to its **mechanism flags** (serotonergic, sedative, CYP inhibitor…)
3. Look for **overlapping mechanisms**, not just known pairs
4. Escalate when the overlap touches **breathing, heart rhythm, serotonin or seizures**

That last list is where harm concentrates. Most other interactions are inconvenient; those four are the ones that kill.

> **Grapefruit** is not a meme. It irreversibly inhibits intestinal CYP3A4 for up to 72 hours, so "I took it yesterday" still matters. The same applies to St John's Wort induction, which takes 1–2 weeks to develop and 1–2 weeks to wear off.`,
        quiz: [
          {
            question: "Fluoxetine raising another drug's level via CYP2D6 is what kind of interaction?",
            options: ["Pharmacodynamic", "Pharmacokinetic", "Idiosyncratic", "Placebo"],
            correctIndex: 1,
            explanation: "It changes the metabolism (and therefore concentration) of the other drug — a pharmacokinetic interaction.",
          },
          {
            question: "Which combination is pharmacodynamic rather than pharmacokinetic?",
            options: ["St John's Wort lowering oral contraceptive levels", "CBD raising clobazam levels", "Alcohol plus a benzodiazepine increasing sedation", "Grapefruit raising simvastatin levels"],
            correctIndex: 2,
            explanation: "Both act on GABA-A inhibition, so the interaction happens at the target — pharmacodynamic additivity.",
          },
          {
            question: "Which four interaction outcomes are most dangerous?",
            options: ["Nausea, headache, rash, fatigue", "Respiratory depression, arrhythmia, serotonin toxicity, seizures", "Dry mouth, constipation, sweating, tremor", "Insomnia, anxiety, appetite loss, thirst"],
            correctIndex: 1,
            explanation: "These four are the mechanisms behind most serious and fatal drug interactions.",
          },
        ],
      },
      {
        id: "m5l3",
        title: "Harm reduction reasoning",
        minutes: 7,
        xp: 40,
        content: `## A practical framework

For any substance decision, four questions:

1. **What is the dose-response curve?** Is there a wide margin before serious harm, or a cliff? (Cannabis vs fentanyl.)
2. **What is reversible?** Sleep disruption reverses in days. Ketamine bladder fibrosis and MPTP-like neurotoxicity may not.
3. **Who is vulnerable?** Personal or family history of psychosis, bipolar disorder, cardiac disease, epilepsy, pregnancy, adolescence, renal or hepatic impairment.
4. **What is the exit?** Can you stop safely? Is a taper needed? Is there an antidote or rescue (naloxone, flumazenil)?

### Risk stacking

Risks multiply rather than add. Stimulant + heat + dehydration + sleep deprivation is far more dangerous than any one of those alone. The practical rule: **change one variable at a time**, and never stack a new substance during a period of poor sleep or high stress.

### Testing and dose verification

- **Reagent testing** catches some substitutions but not all
- **Fentanyl test strips** detect the presence of fentanyl in a sample, not the dose
- **Volumetric dosing** for potent compounds (dissolve and measure) prevents the milligram-scale errors that cause most research-chemical hospitalisations

### What this app is for

NeuroDifference is an **educational** reference. It exists so that people can read primary sources with better questions, recognise mechanisms, and have more useful conversations with clinicians and pharmacists. It is not a dosing guide, and no entry here should be treated as a recommendation to use anything.

> The most valuable harm-reduction skill is not memorising half-lives. It is being able to say "I do not know, and I will not stack it until I do."`,
        quiz: [
          {
            question: "Why does risk stacking matter more than single-substance risk?",
            options: ["Because effects add linearly", "Because physiological stressors multiply each other's impact", "Because the liver gets bored", "Because tolerance resets"],
            correctIndex: 1,
            explanation: "Heat, dehydration, sleep loss and stimulants compound cardiovascular and thermal strain far beyond simple addition.",
          },
          {
            question: "Volumetric dosing is used to:",
            options: ["Increase absorption", "Avoid milligram-scale weighing errors with potent compounds", "Extend half-life", "Test for fentanyl"],
            correctIndex: 1,
            explanation: "Dissolving a known mass in a known volume allows accurate small doses without microgram balances.",
          },
          {
            question: "Which harm is least likely to be fully reversible?",
            options: ["Caffeine withdrawal headache", "SSRI discontinuation dizziness", "Ketamine-related bladder fibrosis", "Nicotine irritability"],
            correctIndex: 2,
            explanation: "Chronic ketamine use causes dose-dependent cystitis and bladder wall fibrosis that can be permanent.",
          },
        ],
      },
    ],
  },
];

export const LESSON_INDEX = new Map();
for (const course of COURSES) {
  for (const lesson of course.lessons) {
    LESSON_INDEX.set(lesson.id, { ...lesson, courseId: course.id, courseTitle: course.title });
  }
}

export const TOTAL_LESSONS = COURSES.reduce((n, c) => n + c.lessons.length, 0);

/* ------------------------------------------------------------------ */
/* Flashcards                                                          */
/* ------------------------------------------------------------------ */

export const FLASHCARDS = [
  { id: "fc1", system: "dopamine", front: "Rate-limiting enzyme in dopamine synthesis", back: "Tyrosine hydroxylase (tyrosine → L-DOPA). Requires BH4 and Fe²⁺; inhibited by end-product dopamine." },
  { id: "fc2", system: "dopamine", front: "D1 vs D2 receptor coupling", back: "D1 = Gs (excitatory, direct pathway). D2 = Gi (inhibitory, indirect pathway + autoreceptor)." },
  { id: "fc3", system: "dopamine", front: "Which dopamine pathway degenerates in Parkinson's?", back: "Nigrostriatal — substantia nigra pars compacta to dorsal striatum." },
  { id: "fc4", system: "dopamine", front: "What does dopamine encode?", back: "Reward prediction error and incentive salience ('wanting') — not pleasure ('liking')." },
  { id: "fc5", system: "dopamine", front: "Enzyme that degrades dopamine in prefrontal cortex", back: "COMT (catechol-O-methyltransferase). The Val158Met variant changes clearance ~4×." },
  { id: "fc6", system: "noradrenaline", front: "Nucleus supplying most forebrain noradrenaline", back: "Locus coeruleus — only a few tens of thousands of neurons." },
  { id: "fc7", system: "noradrenaline", front: "α2 receptor function and drug example", back: "Presynaptic inhibitory autoreceptor; clonidine and guanfacine are agonists, yohimbine an antagonist." },
  { id: "fc8", system: "noradrenaline", front: "Enzyme converting dopamine to noradrenaline", back: "Dopamine β-hydroxylase (DBH), inside synaptic vesicles, requires vitamin C." },
  { id: "fc9", system: "noradrenaline", front: "Why does atomoxetine have low abuse potential?", back: "It blocks NET only; prefrontal dopamine rises but striatal DAT is untouched, so no reinforcing surge." },
  { id: "fc10", system: "serotonin", front: "Rate-limiting enzyme in serotonin synthesis", back: "Tryptophan hydroxylase (TPH1/TPH2) — requires BH4 and O₂. 5-HTP bypasses it." },
  { id: "fc11", system: "serotonin", front: "Main serotonin metabolite measured clinically", back: "5-HIAA (produced by MAO-A then aldehyde dehydrogenase)." },
  { id: "fc12", system: "serotonin", front: "Why do SSRIs take 2–4 weeks?", back: "5-HT1A autoreceptor desensitisation must occur before raphe firing and terminal release increase." },
  { id: "fc13", system: "serotonin", front: "Most specific sign of serotonin syndrome", back: "Clonus (inducible ankle clonus), with hyperreflexia and autonomic instability." },
  { id: "fc14", system: "serotonin", front: "Which receptor do classical psychedelics agonise?", back: "5-HT2A (cortical layer V). Psilocin and LSD are full agonists there." },
  { id: "fc15", system: "gaba", front: "GABA-A subunit responsible for sedation", back: "α1 — the selectivity of Z-drugs like zolpidem." },
  { id: "fc16", system: "gaba", front: "GABA-B mechanism", back: "Gi-coupled: opens GIRK K⁺ channels, closes voltage-gated Ca²⁺ channels. Baclofen, phenibut, GHB." },
  { id: "fc17", system: "gaba", front: "Why is benzodiazepine withdrawal excitatory?", back: "Chronic potentiation causes GABA-A internalisation; removing the drug unmasks baseline excitation." },
  { id: "fc18", system: "glutamate", front: "Two conditions for NMDA channel opening", back: "Glutamate (plus glycine co-agonist) binding AND depolarisation to expel the Mg²⁺ block." },
  { id: "fc19", system: "glutamate", front: "Memantine vs ketamine NMDA blockade", back: "Memantine: low affinity, fast off-rate → less dissociation. Ketamine: higher affinity, slower off-rate → full dissociation." },
  { id: "fc20", system: "glutamate", front: "Downstream pathway of rapid antidepressants", back: "AMPA → BDNF release → TrkB → mTORC1 → dendritic spine growth in prefrontal cortex." },
  { id: "fc21", system: "acetylcholine", front: "Enzyme synthesising acetylcholine", back: "Choline acetyltransferase (ChAT): choline + acetyl-CoA → ACh. Choline supply is rate-limiting." },
  { id: "fc22", system: "acetylcholine", front: "Why is cholinergic excess dangerous to the heart?", back: "M2 muscarinic activation slows the SA node → bradycardia, heart block." },
  { id: "fc23", system: "acetylcholine", front: "What makes galantamine unique?", back: "It inhibits AChE AND positively modulates nicotinic receptors (α7, α4β2)." },
  { id: "fc24", system: "adenosine", front: "How does caffeine work?", back: "Competitive antagonism at A1 and A2A adenosine receptors — it removes sleep pressure signalling, adding no energy." },
  { id: "fc25", system: "adenosine", front: "Why does caffeine tolerance develop?", back: "Chronic blockade upregulates adenosine receptors, so the same dose produces less effect and withdrawal causes fatigue." },
  { id: "fc26", system: "orexin", front: "What happens when orexin neurons are lost?", back: "Narcolepsy with cataplexy — unstable wake/sleep boundaries." },
  { id: "fc27", system: "orexin", front: "How do DORAs treat insomnia?", back: "They block OX1R/OX2R, reducing wake drive without GABA sedation — no dependence or respiratory depression." },
  { id: "fc28", system: "endocannabinoid", front: "How do endocannabinoids signal differently from monoamines?", back: "Synthesised on demand, travel retrogradely from post- to presynaptic terminal, and suppress transmitter release via CB1 (Gi)." },
  { id: "fc29", system: "endocannabinoid", front: "Is CBD a CB1 agonist?", back: "No — it is a negative allosteric modulator, plus 5-HT1A agonist, TRPV1 modulator and CYP2C19/3A4 inhibitor." },
  { id: "fc30", system: "pharmacokinetics", front: "Time to steady state in half-lives", back: "About 5 half-lives (~97%). Elimination takes about 5 more." },
  { id: "fc31", system: "pharmacokinetics", front: "First-pass metabolism", back: "Gut wall and hepatic metabolism before systemic circulation — lowers oral bioavailability (propranolol ~25%)." },
  { id: "fc32", system: "pharmacokinetics", front: "Zero-order kinetics examples", back: "Alcohol, phenytoin, high-dose aspirin — saturated enzymes clear a fixed amount per hour." },
  { id: "fc33", system: "pharmacokinetics", front: "Accumulation ratio approximation", back: "1 / (1 − e^(−0.693 × τ / t½)). Dosing faster than every ~4 half-lives accumulates." },
  { id: "fc34", system: "pharmacodynamics", front: "Affinity vs efficacy", back: "Affinity = binding strength (Kd). Efficacy = response produced after binding (Emax). Independent properties." },
  { id: "fc35", system: "pharmacodynamics", front: "Why is buprenorphine safer than full agonists?", back: "Partial µ-agonism caps respiratory depression while still relieving withdrawal — a ceiling effect." },
  { id: "fc36", system: "pharmacodynamics", front: "Therapeutic window", back: "The concentration range between effective and toxic. Narrow: lithium, digoxin, warfarin, phenytoin, clozapine." },
  { id: "fc37", system: "interactions", front: "Potent CYP3A4 inducer with major interaction burden", back: "St John's Wort (hyperforin) — also induces P-glycoprotein; reduces contraceptives, warfarin, ciclosporin." },
  { id: "fc38", system: "interactions", front: "CYP2D6 inhibitor that blocks codeine activation", back: "Fluoxetine (and bupropion, paroxetine). Codeine needs CYP2D6 to become morphine." },
  { id: "fc39", system: "interactions", front: "Four dangerous interaction outcomes", back: "Respiratory depression, arrhythmia (QT), serotonin toxicity, seizures." },
  { id: "fc40", system: "interactions", front: "MAOI + tyramine mechanism", back: "Tyramine is an indirect sympathomimetic normally destroyed by MAO-A in the gut/liver; MAOI allows it into circulation → hypertensive crisis." },
  { id: "fc41", system: "interactions", front: "Why is grapefruit a real interaction?", back: "Irreversibly inhibits intestinal CYP3A4 for up to 72 h, raising exposure to statins, some CCBs and immunosuppressants." },
  { id: "fc42", system: "withdrawal", front: "Withdrawal timelines: alcohol vs opioids", back: "Alcohol: 6–24 h, seizures/DT possible. Opioids: 8–24 h, flu-like and miserable but rarely fatal." },
  { id: "fc43", system: "withdrawal", front: "Kindling", back: "Repeated withdrawal episodes progressively lower seizure threshold and worsen subsequent withdrawals (alcohol, benzodiazepines)." },
  { id: "fc44", system: "withdrawal", front: "Tapering rule of thumb", back: "Reduce 5–10% of the current dose every 2–4 weeks; slow down near the end; one drug at a time." },
  { id: "fc45", system: "evidence", front: "Winner's curse", back: "Small trials that reach significance overestimate effect size; effects shrink as sample size grows." },
  { id: "fc46", system: "evidence", front: "Open-label vs double-blind", back: "Double-blind controls for expectancy on both participant and assessor sides — essential when outcomes are subjective." },
  { id: "fc47", system: "evidence", front: "Number needed to treat (NNT)", back: "1 / absolute risk reduction. Turns relative risk into a clinically meaningful number." },
  { id: "fc48", system: "evidence", front: "Why is 'statistically significant' not 'important'?", back: "With large n, trivial differences become significant. Effect size and confidence intervals tell you if it matters." },
];

export function systemCardCount(systemId) {
  return FLASHCARDS.filter((c) => c.system === systemId).length;
}