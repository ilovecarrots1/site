# NeuroDifference 3.0.0

A neuropharmacology reference that runs entirely in your browser.
No account. No backend. No tracking. Free.

## What's inside

**Compounds** — 148 substances across 55 classes. Mechanism of action,
receptor targets, pharmacokinetics, dose ranges (education only, every note
says so), wanted and unwanted effects, warnings, flags, PubMed deep link.

**Brain** — a 2.5D atlas: layered translucent SVG, 28 regions you can tap,
camera zoom, deep links like `#/brain/amygdala?compound=ssri`. Ten
neurotransmitter systems, nineteen regions, all cross-linked.

**Atlas & organs** — 20 pathways, 30 molecular targets, 29 organs, each
wired back to the compounds that touch them.

**Interaction lab** — 91 pairwise rules, 45 class-level rules, plus flag
rules for QT, serotonin load, seizure threshold, bleeding risk.

**Conditions** — 46 disorders in 11 chapters, 112 subtypes, 221 symptoms,
cross-mapped to ICD-9, ICD-10 and ICD-11. Zero missing ICD-11 codes.

**Bloodwork** — 59 markers in 11 groups, 306 links to compounds that shift
them. Universal ranges, no sex branching.

**PK calculator** — half-life curve, repeated dosing, five-compound overlay,
so you can see accumulation instead of guessing.

**Do more with it** — stack builder (8 compounds), side-by-side compare,
taper planner, symptom → hypothesis, spaced-repetition cards with XP,
streaks and levels.

**Research** — live PubMed search across 40+ million citations (MEDLINE,
life-science journals, books). Results live in memory for 30 minutes and are
never written to disk.

**Notes** — page-level notes and history, stored locally.

**Emergency** — red flags, serotonin syndrome, neuroleptic malignant
syndrome, seizure first steps. The one tab nobody wants to open, and the one
that matters most.

## Under the hood

- No build step. Vanilla ES modules, hand-written CSS, zero dependencies.
- 30+ screens behind a hash router, every view mounted fresh.
- Installable PWA: service worker, offline shell, update pill when a new
  version lands.
- Skins, custom accent colour, density and motion controls. Honours
  `prefers-reduced-motion`.
- Animation budget: `transform` and `opacity` only.
- Self-audit at `#/dev/audit` — twelve checks, including the invariant that
  every dose note states it is education only.

## Privacy

Nothing leaves the device. No accounts, no analytics, no cloud. PubMed
queries go straight to NCBI and are never persisted.

## Not medical advice

Education only. Doses are context, not instructions. Talk to a clinician.
