/* Evidence: research topics, hierarchy of evidence, saved shelf */

import { esc, icon, store, copyText, evidenceChip, emptyState } from "../core.js";
import { COMPOUND_BY_ID, getCompound, pubmedUrl } from "../data/compounds.js";
import { pageHead, callout, compoundCard, liveBadge } from "./ui.js";
import { searchPapers, LINK as PM_LINK } from "../lib/pubmed.js";
import { paperCard } from "./research.js";

const TOPICS = [
  {
    id: "modafinil-healthy",
    title: "Modafinil in healthy adults",
    question: "Does it actually improve cognition, or only wakefulness?",
    query: "modafinil cognitive enhancement healthy volunteers randomized",
    lean: "moderate",
    compounds: ["modafinil", "armodafinil"],
    note: "Effects concentrate on attention and vigilance under sleep deprivation. Well-rested adults show small, inconsistent gains — and publication bias inflates the positive ones.",
  },
  {
    id: "creatine-brain",
    title: "Creatine and the brain",
    question: "Beyond muscle: does it help cognition or mood?",
    query: "creatine supplementation cognition brain randomized controlled trial",
    lean: "limited",
    compounds: ["creatine"],
    note: "Signal is strongest for short-term memory and reasoning under stress, sleep loss or vegetarian diets. Brain creatine uptake is slow — studies run weeks, not days.",
  },
  {
    id: "omega3-depression",
    title: "Omega-3 in depression",
    question: "Adjunct, monotherapy, or marketing?",
    query: "omega-3 fatty acids depression adjunct randomized trial EPA DHA",
    lean: "moderate",
    compounds: ["omega-3"],
    note: "Adjunct signal is modest and EPA-dominant formulas look better than DHA-heavy ones. Effect sizes shrink as trial quality rises — a familiar pattern.",
  },
  {
    id: "psilocybin-trd",
    title: "Psilocybin for treatment-resistant depression",
    question: "Breakthrough therapy or over-hyped single-site result?",
    query: "psilocybin treatment-resistant depression randomized controlled trial",
    lean: "limited",
    compounds: ["psilocybin"],
    note: "Short-term effects look large in open-label work; blinded trials are much harder than they sound because the experience is unmistakable. Durability beyond a few months is unproven.",
  },
  {
    id: "ssri-severity",
    title: "SSRIs and baseline severity",
    question: "Do antidepressants only beat placebo in severe depression?",
    query: "SSRI efficacy baseline severity depression meta-analysis Fournier",
    lean: "moderate",
    compounds: ["sertraline", "fluoxetine", "escitalopram"],
    note: "The severity argument rests on a few influential meta-analyses; later re-analyses with individual patient data find benefit across the range, smaller at the mild end.",
  },
  {
    id: "stimulant-tolerance",
    title: "Stimulant tolerance and sensitisation",
    question: "Why does the same dose stop working?",
    query: "methylphenidate tolerance sensitization dopamine human",
    lean: "limited",
    compounds: ["methylphenidate", "lisdexamfetamine", "dextroamphetamine"],
    note: "Therapeutic-dose tolerance is less dramatic than folklore suggests; sleep debt, tolerance to side effects and changing expectations explain more than receptor downregulation.",
  },
  {
    id: "lions-mane",
    title: "Lion's mane and nerve growth factor",
    question: "Human cognition or petri-dish promise?",
    query: "Hericium erinaceus cognition mild cognitive impairment randomized",
    lean: "preclinical",
    compounds: ["lions-mane"],
    note: "The NGF story comes from cell and animal work. Human trials are small, short and few — one positive crossover study is not a foundation.",
  },
  {
    id: "bacopa-memory",
    title: "Bacopa monnieri and memory",
    question: "Does the 12-week trial hold up?",
    query: "Bacopa monnieri memory healthy adults randomized controlled trial",
    lean: "limited",
    compounds: ["bacopa"],
    note: "Consistent small effects on delayed recall, but the trials are small, heterogeneous and mostly from a narrow set of research groups. GI side effects are common.",
  },
  {
    id: "magnesium-threonate",
    title: "Magnesium L-threonate",
    question: "The one magnesium that reaches the brain?",
    query: "magnesium L-threonate cognition brain randomized",
    lean: "preclinical",
    compounds: ["magnesium-l-threonate"],
    note: "Brain-uptake claims are animal data. Human cognitive trials are tiny and industry-linked. In deficiency, any magnesium salt helps — that is a different claim.",
  },
  {
    id: "ashwagandha-thyroid",
    title: "Ashwagandha, cortisol and thyroid",
    question: "Adaptogen or endocrine interference?",
    query: "Withania somnifera cortisol thyroid randomized trial safety",
    lean: "limited",
    compounds: ["ashwagandha"],
    note: "Cortisol reductions are small and short-lived. Case reports of thyroid hormone elevation and liver injury mean this is not a free supplement for everyone.",
  },
  {
    id: "melatonin-timing",
    title: "Melatonin: dose and timing",
    question: "Why 0.3 mg might beat 5 mg",
    query: "melatonin dose timing circadian phase shift low dose",
    lean: "moderate",
    compounds: ["melatonin"],
    note: "Physiological doses (0.3–0.5 mg) phase-shift circadian rhythm; larger doses mostly add sedation and spillover. Timing relative to sleep matters more than the number on the label.",
  },
  {
    id: "ketamine-depression",
    title: "Ketamine for depression",
    question: "Rapid relief — and then what?",
    query: "ketamine esketamine depression rapid antidepressant randomized maintenance",
    lean: "moderate",
    compounds: ["ketamine"],
    note: "The acute effect is real and fast; durability requires maintenance and the dissociation is not the mechanism. Blinding is a persistent problem in the literature.",
  },
  {
    id: "nootropic-overview",
    title: "The nootropic literature problem",
    question: "Why is the evidence so soft?",
    query: "nootropic cognitive enhancement supplement quality bias systematic review",
    lean: "strong",
    compounds: ["piracetam", "aniracetam", "phenylpiracetam", "noopept"],
    note: "Small samples, non-blinded designs, multiple outcomes and selective reporting. The absence of harm data is the most reliable finding in the whole field.",
  },
  {
    id: "interaction-data",
    title: "How interaction data is generated",
    question: "Where do “known interactions” actually come from?",
    query: "drug-drug interaction evidence case reports pharmacovigilance limitations",
    lean: "strong",
    compounds: ["sertraline", "tramadol", "phenelzine"],
    note: "Most interaction knowledge is case reports and mechanistic extrapolation, not trials. That is why absence from a database is weak evidence of safety.",
  },
];

const HIERARCHY = [
  { tier: "Systematic reviews & meta-analyses", weight: 100, note: "Best when protocols are pre-registered and heterogeneity is addressed. Can still inherit bias from the trials inside.", tone: "good" },
  { tier: "Randomised controlled trials", weight: 78, note: "The core of causal claims. Size, blinding, and whether the outcome was pre-specified decide everything.", tone: "good" },
  { tier: "Controlled crossover trials", weight: 62, note: "Efficient for acute cognitive effects, but carry-over and practice effects are common traps.", tone: "" },
  { tier: "Prospective cohort studies", weight: 46, note: "Good for harm signals and long horizons; cannot establish causation on their own.", tone: "" },
  { tier: "Case-control & case series", weight: 30, note: "Where most drug-interaction knowledge lives. Signals, not proof.", tone: "warn" },
  { tier: "Animal & mechanistic work", weight: 18, note: "Plausibility, not efficacy. Most “promising” compounds die here.", tone: "warn" },
  { tier: "Anecdote & forum reports", weight: 6, note: "Useful as a hypothesis generator, worthless as evidence. Also the base of most supplement marketing.", tone: "bad" },
];

const EVIDENCE_LADDER = [
  ["strong", "Multiple RCTs or meta-analyses with consistent, clinically meaningful effects."],
  ["moderate", "At least one good RCT, or consistent smaller trials with some inconsistency."],
  ["limited", "Small or few trials, mixed results, or a single research group."],
  ["preclinical", "Animal or in-vitro data only — or human data that does not measure the claimed outcome."],
  ["anecdotal", "Documented only through reports. Included for completeness, not as support."],
];

const state = { tab: "topics", q: "" };

function topicsHtml() {
  const q = state.q.toLowerCase();
  const list = q ? TOPICS.filter((t) => `${t.title} ${t.question} ${t.note} ${t.query}`.toLowerCase().includes(q)) : TOPICS;
  if (!list.length) return `<div class="card">${emptyState("search", "No topic matches", "Try “depression”, “creatine”, “melatonin”…")}</div>`;
  return `<div class="grid grid-2" style="gap:10px">
    ${list
      .map(
        (t) => `<article class="card">
          <div class="row between" style="align-items:flex-start;gap:8px;margin-bottom:6px">
            <h3 style="font-size:14.5px;line-height:1.3">${esc(t.title)}</h3>
            <span class="chip chip-${t.lean === "strong" ? "good" : t.lean === "moderate" ? "ok" : t.lean === "limited" ? "warn" : "bad"} nowrap">${esc(t.lean)}</span>
          </div>
          <p class="small" style="color:var(--accent);font-style:italic;margin-bottom:7px;line-height:1.45">${esc(t.question)}</p>
          <p class="tiny dim" style="line-height:1.6;margin-bottom:10px">${esc(t.note)}</p>
          <div class="row wrap" style="gap:5px;margin-bottom:10px">
            ${t.compounds.map((id) => (COMPOUND_BY_ID.get(id) ? `<a class="chip chip-btn" href="#/compounds/${esc(id)}">${esc(COMPOUND_BY_ID.get(id).name)}</a>` : "")).join("")}
          </div>
          <div class="row wrap" style="gap:7px">
            <button class="btn soft sm" data-live="${esc(t.query)}">${icon("microscope", 13)} Live papers</button>
            <a class="btn ghost sm" href="${pubmedUrl(t.query)}" target="_blank" rel="noopener noreferrer">${icon("external", 13)} PubMed</a>
            <button class="btn ghost sm" data-copy="${esc(t.query)}">${icon("copy", 13)} Query</button>
          </div>
          <div data-live-out="${esc(t.id)}"></div>
        </article>`
      )
      .join("")}
  </div>`;
}

function ladderHtml() {  return `<div class="stack" style="gap:14px">
    ${callout("info", "Read evidence, not verdicts", "Every compound in this app carries a grade. The grade is a shorthand for the quality of human data behind the claim — not for how strongly people believe it.")}

    <div class="card">
      <div class="card-head"><h3 style="font-size:14px">Hierarchy of evidence</h3></div>
      <div class="stack" style="gap:10px">
        ${HIERARCHY.map(
          (h) => `<div>
            <div class="row between" style="gap:8px;margin-bottom:3px">
              <span style="font-size:12.5px;font-weight:600">${esc(h.tier)}</span>
              <span class="mono tiny dim">${h.weight}</span>
            </div>
            <div class="meter ${h.tone}"><i style="width:${h.weight}%"></i></div>
            <p class="tiny dim" style="margin-top:4px;line-height:1.5">${esc(h.note)}</p>
          </div>`
        ).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3 style="font-size:14px">What each grade means</h3></div>
      <div class="list" style="margin:0 -14px">
        ${EVIDENCE_LADDER.map(
          ([key, note]) => `<div class="list-row" style="align-items:flex-start">
            <div style="flex:none;padding-top:2px">${evidenceChip(key)}</div>
            <p class="tiny muted" style="line-height:1.55;margin:0">${esc(note)}</p>
          </div>`
        ).join("")}
      </div>
    </div>

    <div class="card tight">
      <div class="eyebrow" style="margin-bottom:7px">Five questions that kill most claims</div>
      <ol class="md-list" style="margin:0;padding-left:20px;font-size:13px;line-height:1.7">
        <li>Was it randomised, and did the blinding actually hold?</li>
        <li>Was the outcome pre-registered, or chosen after the data arrived?</li>
        <li>How large was the effect, and how large was the sample?</li>
        <li>Who funded it — and does the funder sell the thing being tested?</li>
        <li>Does the measured outcome mean anything in real life?</li>
      </ol>
    </div>
  </div>`;
}

function savedHtml() {
  const saved = (store.data.saved || []).map((id) => getCompound(id)).filter(Boolean);
  if (!saved.length) {
    return `<div class="card">${emptyState("star", "Nothing saved yet", "Tap the star on any compound page to keep it here.", `<a class="btn soft sm" href="#/compounds">${icon("search", 14)} Browse compounds</a>`)}</div>`;
  }
  return `<div class="grid grid-auto" style="gap:10px">${saved.map(compoundCard).join("")}</div>`;
}

export const evidence = {
  render() {
    const savedCount = (store.data.saved || []).map((id) => getCompound(id)).filter(Boolean).length;
    const tab = state.tab === "ladder" || state.tab === "saved" ? state.tab : "topics";
    const bodyHtml =
      tab === "ladder"
        ? ladderHtml()
        : tab === "saved"
          ? savedHtml()
          : `<div style="margin-bottom:12px" class="search-input">
        ${icon("search", 16)}
        <input class="input" id="ev-q" type="search" placeholder="Filter topics…" value="${esc(state.q)}">
      </div>
      <div id="ev-topics">${topicsHtml()}</div>`;
    return `
    ${pageHead(
      "Evidence",
      "Curated research questions with the honest version of each answer — plus the rules for reading a trial yourself.",
      `<a class="btn soft sm" href="#/research">${icon("microscope", 14)} Live PubMed</a>`
    )}

    <div class="tabs" id="ev-tabs">
      <button class="${tab === "topics" ? "on" : ""}" data-tab="topics">Topics</button>
      <button class="${tab === "ladder" ? "on" : ""}" data-tab="ladder">Reading evidence</button>
      <button class="${tab === "saved" ? "on" : ""}" data-tab="saved">Saved${savedCount ? ` (${savedCount})` : ""}</button>
    </div>

    <div id="ev-body">${bodyHtml}</div>`;
  },

  mount(root) {
    const body = root.querySelector("#ev-body");
    if (!body) return;

    const paintTab = (tab) => {
      state.tab = tab;
      root.querySelectorAll("#ev-tabs [data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
      if (tab === "topics") {
        body.innerHTML = `<div style="margin-bottom:12px" class="search-input">${icon("search", 16)}
          <input class="input" id="ev-q" type="search" placeholder="Filter topics…" value="${esc(state.q)}">
        </div><div id="ev-topics">${topicsHtml()}</div>`;
        bindSearch();
      } else if (tab === "ladder") {
        body.innerHTML = ladderHtml();
      } else {
        body.innerHTML = savedHtml();
      }
    };

    const bindSearch = () => {
      const q = body.querySelector("#ev-q");
      q?.addEventListener("input", () => {
        state.q = q.value;
        const t = body.querySelector("#ev-topics");
        if (t) t.innerHTML = topicsHtml();
      });
    };

    root.querySelector("#ev-tabs")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tab]");
      if (btn) paintTab(btn.dataset.tab);
    });

    bindSearch();

    body.addEventListener("click", (ev) => {
      const copyBtn = ev.target.closest("[data-copy]");
      if (copyBtn) copyText(copyBtn.dataset.copy, "Search query copied");

      const liveBtn = ev.target.closest("[data-live]");
      if (liveBtn) {
        const card = liveBtn.closest("article");
        const out = card && card.querySelector("[data-live-out]");
        if (out) toggleTopicLive(out, liveBtn.dataset.live, liveBtn);
      }
    });
  },
};

export const saved = evidence;