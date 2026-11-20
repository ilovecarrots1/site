/* Research — live PubMed search. Papers are fetched per request and never stored. */

import { esc, icon, toast, copyText, fmt } from "../core.js";
import { searchPapers, buildTerm, TOPICS, LINK, PubmedError } from "../lib/pubmed.js";
import { pageHead, callout } from "./ui.js";

const state = {
  q: "",
  sort: "relevance",
  type: "any",
  years: 0,
  papers: [],
  total: 0,
  ms: 0,
  loading: false,
  error: null,
  ran: false,
  more: false,
};

let controller = null;

const TYPE_LABEL = { any: "Everything", review: "Reviews", rct: "Trials" };
const YEAR_LABEL = { 0: "Any year", 3: "3 years", 5: "5 years", 10: "10 years" };

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function kindClass(kind) {
  return kind === "rct" ? "rct" : kind === "review" ? "review" : kind === "meta" ? "meta" : "";
}

function kindLabel(p) {
  if (p.kind === "rct") return "RCT";
  if (p.kind === "meta") return "Meta-analysis";
  if (p.kind === "review") return "Review";
  return p.types[0] ? p.types[0].slice(0, 24) : "Article";
}

export function paperCard(p, i = 0) {
  const hue = ["#8b7bff", "#3edbd3", "#6fb3ff", "#4ade80", "#e3b341"][i % 5];
  return `<article class="paper rise" style="--pc:${hue};--i:${Math.min(i, 8)}">
    <div class="row between top" style="gap:10px">
      <h3 class="paper-title grow"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a></h3>
      <span class="paper-type ${kindClass(p.kind)}">${esc(kindLabel(p))}</span>
    </div>
    <p class="paper-meta">
      ${esc(p.authorsShort || "Unknown authors")} · <cite>${esc(p.journal)}</cite>${p.year ? ` · ${esc(p.year)}` : ""}
      · <span class="mono">PMID ${esc(p.pmid)}</span>
    </p>
    ${
      p.abstract
        ? `<p class="paper-abs clamp" data-abs>${esc(p.abstract)}</p>
           <button class="btn ghost xs" data-act="expand" style="align-self:flex-start">${icon("chevronDown", 13)} Full abstract</button>`
        : `<p class="paper-abs dim">No abstract indexed for this record.</p>`
    }
    <div class="paper-actions">
      <a class="btn ghost xs" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${icon("external", 12)} PubMed</a>
      <button class="btn ghost xs" data-act="cite" data-pmid="${esc(p.pmid)}">${icon("copy", 12)} Cite</button>
      ${p.doi ? `<a class="btn ghost xs" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener noreferrer">${icon("link", 12)} DOI</a>` : ""}
    </div>
  </article>`;
}

function yearBars(papers) {
  const counts = new Map();
  papers.forEach((p) => {
    const y = Number(p.year);
    if (y > 1970 && y <= new Date().getFullYear() + 1) counts.set(y, (counts.get(y) || 0) + 1);
  });
  const rows = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  if (rows.length < 2) return "";
  const max = Math.max(...rows.map((r) => r[1]));
  return `<div class="card tight" style="margin-bottom:12px">
    <div class="row between" style="margin-bottom:9px">
      <div class="eyebrow">Publication years in this result set</div>
      <span class="tiny dim mono">n=${papers.length}</span>
    </div>
    <div class="bars">
      ${rows
        .map(
          ([y, n]) => `<div class="bar-row" style="--bc:#8b7bff">
            <span class="mono dim">${y}</span>
            <div class="bar-track"><i style="width:${Math.round((n / max) * 100)}%"></i></div>
            <span class="mono">${n}</span>
          </div>`
        )
        .join("")}
    </div>
  </div>`;
}

function skeleton(n = 3) {
  return `<div class="stack" style="gap:10px">
    ${Array.from({ length: n })
      .map(
        () => `<div class="card" style="gap:9px;display:flex;flex-direction:column">
        <div class="skeleton" style="height:15px;width:84%"></div>
        <div class="skeleton" style="height:11px;width:52%"></div>
        <div class="skeleton" style="height:11px;width:100%"></div>
        <div class="skeleton" style="height:11px;width:76%"></div>
      </div>`
      )
      .join("")}
  </div>`;
}

function idle() {
  return `<div class="card" style="text-align:center;padding:26px 18px">
    <div class="orb sm" style="margin:0 auto 14px"></div>
    <h3 style="font-size:15px;margin-bottom:5px">Search the primary literature</h3>
    <p class="small dim" style="max-width:44ch;margin:0 auto 4px;line-height:1.6">
      Queries go straight to the NCBI E-utilities API. Nothing is cached to your device or saved to any database —
      every result set is fetched live, at the moment you ask for it.
    </p>
    <p class="tiny dim" style="margin-top:10px">Pick a topic above, or type a compound, receptor or claim.</p>
  </div>`;
}

function errorBlock(err) {
  const network = err && (err.kind === "network" || err instanceof TypeError);
  return `<div class="stack" style="gap:12px">
    ${callout(
      "warn",
      network ? "Network blocked the request" : "PubMed did not answer",
      network
        ? "The browser could not reach eutils.ncbi.nlm.nih.gov. That usually means an offline device or a network that strips the CORS header — the app still works, only the live API is unavailable here."
        : String((err && err.message) || "Unknown error")
    )}
    <div class="row wrap" style="gap:8px">
      <button class="btn soft sm" data-act="retry">${icon("refresh", 14)} Try again</button>
      <a class="btn ghost sm" href="${esc(LINK.search(state.q || "neuropharmacology"))}" target="_blank" rel="noopener noreferrer">${icon("external", 14)} Open this search on PubMed</a>
    </div>
    <p class="tiny dim">PubMed runs on NCBI's public E-utilities, which are rate limited. If this keeps failing, the link above always works.</p>
  </div>`;
}

function statusLine() {
  if (state.loading) return `<span class="live-dot">querying NCBI…</span>`;
  if (state.error) return `<span class="tiny" style="color:var(--warn)">${icon("alert", 13)} request failed</span>`;
  if (!state.ran) return `<span class="tiny dim">${icon("database", 13)} eutils.ncbi.nlm.nih.gov · live</span>`;
  return `<span class="live-dot">live</span>
    <span class="tiny dim">${state.total.toLocaleString()} matches · ${state.papers.length} shown · ${state.ms} ms</span>`;
}

function resultsHtml() {
  if (state.loading) return skeleton(3);
  if (state.error) return errorBlock(state.error);
  if (!state.ran) return idle();
  if (!state.papers.length) {
    return `<div class="card" style="text-align:center;padding:24px 18px">
      <h3 style="font-size:15px;margin-bottom:6px">No records for that query</h3>
      <p class="small dim" style="max-width:46ch;margin:0 auto 12px">PubMed returns nothing when a term is too narrow — drop a concept, remove the year filter, or try a broader synonym.</p>
      <a class="btn ghost sm" href="${esc(LINK.search(state.q))}" target="_blank" rel="noopener noreferrer">${icon("external", 14)} Search PubMed directly</a>
    </div>`;
  }
  return `${yearBars(state.papers)}
    <div class="stack" style="gap:10px">${state.papers.map((p, i) => paperCard(p, i)).join("")}</div>
    ${
      state.total > state.papers.length
        ? `<button class="btn soft block" data-act="more" style="margin-top:12px">${icon("plus", 14)} Load more (${(state.total - state.papers.length).toLocaleString()} left)</button>`
        : ""
    }`;
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export const research = {
  render(ctx) {
    const preset = ctx && ctx.query ? String(ctx.query.compound || ctx.query.q || "") : "";
    if (preset && preset !== state.q) {
      state.q = preset;
      state.ran = false;
      state.papers = [];
    }

    return `
    ${pageHead(
      "Research",
      "Live PubMed search. Papers are pulled from NCBI at query time — never bundled into the app, never stored on your device.",
      `<span class="chip chip-accent">${icon("microscope", 13)} PubMed API</span>`
    )}

    <section class="card" style="margin-bottom:14px">
      <form class="pm-search" id="pm-form" autocomplete="off">
        ${icon("search", 17)}
        <input id="pm-input" type="search" name="q" placeholder="e.g. ketamine treatment-resistant depression" value="${esc(state.q)}" aria-label="PubMed search" />
        <button class="btn primary sm" type="submit">${icon("sparkles", 14)} Search</button>
      </form>

      <div class="row wrap" style="gap:6px;margin-top:10px">
        ${Object.entries(TYPE_LABEL)
          .map(
            ([k, label]) =>
              `<button class="chip chip-btn ${state.type === k ? "on" : ""}" data-type="${k}">${esc(label)}</button>`
          )
          .join("")}
        <span style="width:1px;height:18px;background:var(--line);margin:0 2px"></span>
        ${Object.entries(YEAR_LABEL)
          .map(
            ([k, label]) =>
              `<button class="chip chip-btn ${String(state.years) === k ? "on" : ""}" data-years="${k}">${esc(label)}</button>`
          )
          .join("")}
        <span style="width:1px;height:18px;background:var(--line);margin:0 2px"></span>
        <button class="chip chip-btn ${state.sort === "relevance" ? "on" : ""}" data-sort="relevance">${icon("target", 11)} Relevance</button>
        <button class="chip chip-btn ${state.sort === "date" ? "on" : ""}" data-sort="date">${icon("clock", 11)} Newest</button>
      </div>

      <div class="row wrap" style="gap:6px;margin-top:10px">
        <span class="tiny dim" style="width:100%;margin-bottom:1px">Topic presets</span>
        ${TOPICS.map((t) => `<button class="chip chip-btn" data-topic="${esc(t.q)}" title="${esc(t.q)}">${esc(t.label)}</button>`).join("")}
      </div>
    </section>

    <div class="row between wrap" style="gap:8px;margin-bottom:10px" id="pm-status">${statusLine()}</div>
    <div id="pm-results">${resultsHtml()}</div>

    <p class="tiny dim" style="margin-top:18px;line-height:1.6">
      ${icon("info", 12)} PubMed is a citation index, not a truth machine. Check study size, blinding, comparator, and whether the
      measured outcome is the one you actually care about. Preprints and abstracts are not peer-reviewed evidence.
    </p>`;
  },

  mount(root, ctx) {
    const results = root.querySelector("#pm-results");
    const status = root.querySelector("#pm-status");
    const form = root.querySelector("#pm-form");
    const input = root.querySelector("#pm-input");

    const paintStatus = () => {
      if (status) status.innerHTML = statusLine();
    };

    const paint = () => {
      if (results) results.innerHTML = resultsHtml();
      paintStatus();
    };

    const run = async ({ append = false } = {}) => {
      if (controller) controller.abort();
      controller = new AbortController();
      if (!append) {
        state.papers = [];
        state.total = 0;
        state.error = null;
      }
      state.loading = true;
      state.ran = true;
      paint();

      try {
        const retmax = append ? 12 : 12;
        const res = await searchPapers(state.q, {
          retmax: state.papers.length + retmax,
          sort: state.sort,
          type: state.type,
          years: state.years,
          signal: controller.signal,
          force: append,
        });
        state.papers = res.papers;
        state.total = res.total;
        state.ms = res.ms;
        state.error = null;
      } catch (err) {
        if (err && err.kind === "aborted") return;
        state.error = err instanceof PubmedError ? err : new PubmedError(String(err && err.message), "network");
        state.papers = [];
      } finally {
        state.loading = false;
        paint();
      }
    };

    form?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      state.q = input ? input.value.trim() : state.q;
      if (!state.q) {
        input?.focus();
        return;
      }
      run();
    });

    root.querySelector(".card")?.addEventListener("click", (ev) => {
      const type = ev.target.closest("[data-type]");
      if (type) {
        state.type = type.dataset.type;
        root.querySelectorAll("[data-type]").forEach((b) => b.classList.toggle("on", b === type));
        if (state.ran) run();
        return;
      }
      const yrs = ev.target.closest("[data-years]");
      if (yrs) {
        state.years = Number(yrs.dataset.years) || 0;
        root.querySelectorAll("[data-years]").forEach((b) => b.classList.toggle("on", b === yrs));
        if (state.ran) run();
        return;
      }
      const sort = ev.target.closest("[data-sort]");
      if (sort) {
        state.sort = sort.dataset.sort;
        root.querySelectorAll("[data-sort]").forEach((b) => b.classList.toggle("on", b === sort));
        if (state.ran) run();
        return;
      }
      const topic = ev.target.closest("[data-topic]");
      if (topic) {
        state.q = topic.dataset.topic;
        if (input) input.value = state.q;
        run();
      }
    });

    const onClick = (ev) => {
      const btn = ev.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;

      if (act === "expand") {
        const abs = btn.parentElement?.querySelector("[data-abs]");
        if (!abs) return;
        const clamped = abs.classList.toggle("clamp");
        btn.innerHTML = clamped
          ? `${icon("chevronDown", 13)} Full abstract`
          : `${icon("chevronUp", 13) || icon("chevronDown", 13)} Collapse`;
        return;
      }
      if (act === "cite") {
        const paper = state.papers.find((p) => p.pmid === btn.dataset.pmid);
        if (paper) copyText(LINK.cite(paper), "Citation copied");
        return;
      }
      if (act === "retry") {
        run();
        return;
      }
      if (act === "more") {
        run({ append: true });
      }
    };

    results?.addEventListener("click", onClick);
    status?.addEventListener("click", onClick);

    if (state.q && !state.ran) run();
  },
};

export default research;