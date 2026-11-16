/* PubMed live research client.
 *
 * Everything here is fetched at request time from NCBI E-utilities.
 * Nothing is written to the local store or any database: results live in
 * memory for the duration of the session only, keyed by query, so that
 * navigating back and forth does not hammer the API.
 *
 * API key is a public read-only key for E-utilities (10 req/s instead of 3).
 */

export const PUBMED_KEY = "5e323382245f1bc6f90af5cf42a73f803608";
const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const TOOL = "NeuroDifference";
const EMAIL = "neurodiff.app@gmail.com";

/* 30 minutes is plenty: a query string maps to a stable result set. */
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 24;

const cache = new Map();
let queue = Promise.resolve();
let lastCall = 0;

export const LINK = {
  pmid: (id) => `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(id)}/`,
  search: (term) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`,
  cite: (p) => `${p.authorsShort}${p.authorsShort ? ". " : ""}${p.title}. ${p.journal}${p.year ? ` ${p.year}` : ""}. PMID ${p.pmid}.`,
};

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class PubmedError extends Error {
  constructor(message, kind, detail) {
    super(message);
    this.name = "PubmedError";
    this.kind = kind; // "network" | "http" | "empty" | "parse" | "aborted"
    this.detail = detail;
  }
}

/* ------------------------------------------------------------------ */
/* Rate-limited fetch                                                  */
/* ------------------------------------------------------------------ */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Serialise requests with a small gap so we never trip NCBI's limiter. */
function schedule(fn) {
  const run = queue.then(async () => {
    const gap = Date.now() - lastCall;
    if (gap < 340) await sleep(340 - gap);
    lastCall = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

function qs(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

async function get(path, params, { signal } = {}) {
  const url = `${BASE}/${path}?${qs({ ...params, tool: TOOL, email: EMAIL, api_key: PUBMED_KEY })}`;
  let res;
  try {
    res = await fetch(url, { signal, mode: "cors", credentials: "omit" });
  } catch (err) {
    if (err && err.name === "AbortError") throw new PubmedError("Request cancelled", "aborted");
    throw new PubmedError("Could not reach NCBI — the network blocked the request", "network", String(err && err.message));
  }
  if (!res.ok) throw new PubmedError(`NCBI replied ${res.status}`, "http", res.status);
  return res;
}

/* ------------------------------------------------------------------ */
/* Query building                                                      */
/* ------------------------------------------------------------------ */

/** Map our UI filters onto real PubMed field tags. */
export function buildTerm(term, { scope = "all", years = 0, type = "any" } = {}) {
  const parts = [String(term || "").trim() || "neuropharmacology"];
  if (scope === "title") parts[0] = `${parts[0]}[Title]`;
  if (years > 0) parts.push(`("last ${years} years"[dp])`);
  if (type === "review") parts.push("(review[pt] OR systematic review[pt] OR meta-analysis[pt])");
  if (type === "rct") parts.push("(randomized controlled trial[pt] OR controlled clinical trial[pt])");
  if (type === "human") parts.push("humans[mh]");
  return parts.join(" AND ");
}

/* ------------------------------------------------------------------ */
/* XML → plain objects                                                 */
/* ------------------------------------------------------------------ */

function txt(node, tag) {
  const el = node ? node.querySelector(tag) : null;
  return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
}

function parseArticles(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new PubmedError("Could not parse the NCBI response", "parse");
  const nodes = Array.from(doc.querySelectorAll("PubmedArticle"));
  return nodes.map((art) => {
    const cit = art.querySelector("MedlineCitation");
    const article = art.querySelector("article") || art.querySelector("Article");
    const pmid = txt(cit, "PMID");
    const title = (txt(article, "ArticleTitle") || "Untitled record").replace(/\.$/, "");

    const abstractParts = Array.from(art.querySelectorAll("AbstractText")).map((node) => {
      const label = node.getAttribute("Label");
      const body = node.textContent.replace(/\s+/g, " ").trim();
      return label ? `${label}: ${body}` : body;
    });
    const abstract = abstractParts.join(" ").trim();

    const journal =
      txt(art, "Journal > Title") ||
      txt(art, "Journal > ISOAbbreviation") ||
      txt(art, "MedlineJournalInfo > MedlineTA") ||
      "PubMed";

    let year = txt(art, "JournalIssue > PubDate > Year") || txt(art, "ArticleDate > Year");
    if (!year) {
      const medlineDate = txt(art, "JournalIssue > PubDate > MedlineDate");
      const m = medlineDate.match(/\d{4}/);
      year = m ? m[0] : "";
    }

    const authors = Array.from(art.querySelectorAll("AuthorList > Author"))
      .map((a) => {
        const last = txt(a, "LastName");
        const initials = txt(a, "Initials");
        if (last) return initials ? `${last} ${initials}` : last;
        return txt(a, "CollectiveName");
      })
      .filter(Boolean);

    const types = Array.from(art.querySelectorAll("PublicationTypeList > PublicationType")).map((n) =>
      n.textContent.trim()
    );

    const doiEl = Array.from(art.querySelectorAll("ArticleIdList > ArticleId")).find(
      (n) => (n.getAttribute("IdType") || "").toLowerCase() === "doi"
    );

    const lower = types.join(" ").toLowerCase();
    const kind = /meta-analysis/.test(lower)
      ? "meta"
      : /randomized controlled trial|controlled clinical trial/.test(lower)
        ? "rct"
        : /review/.test(lower)
          ? "review"
          : "";

    return {
      pmid,
      title,
      abstract,
      journal,
      year,
      authors,
      authorsShort: authors.slice(0, 3).join(", ") + (authors.length > 3 ? " et al" : ""),
      types,
      kind,
      doi: doiEl ? doiEl.textContent.trim() : "",
      url: LINK.pmid(pmid),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Search PubMed live.
 * @returns {Promise<{papers: object[], total: number, term: string, query: string, ms: number, cached: boolean}>}
 */
export async function searchPapers(term, { retmax = 12, sort = "relevance", scope, years, type, signal, force = false } = {}) {
  const query = buildTerm(term, { scope, years, type });
  const key = `${query}|${retmax}|${sort}`;
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL) {
    return { ...hit.value, cached: true };
  }

  const started = Date.now();

  const searchRes = await schedule(() =>
    get(
      "esearch.fcgi",
      { db: "pubmed", term: query, retmax, retmode: "json", sort: sort === "date" ? "pub_date" : "relevance" },
      { signal }
    )
  );
  const searchJson = await searchRes.json().catch(() => null);
  const result = searchJson && searchJson.esearchresult ? searchJson.esearchresult : {};
  const ids = Array.isArray(result.idlist) ? result.idlist : [];
  const total = Number(result.count || ids.length) || 0;

  if (!ids.length) {
    const empty = { papers: [], total: 0, term: query, query: String(term || ""), ms: Date.now() - started, cached: false };
    cache.set(key, { at: Date.now(), value: empty });
    trimCache();
    return empty;
  }

  const fetchRes = await schedule(() =>
    get("efetch.fcgi", { db: "pubmed", id: ids.join(","), retmode: "xml", rettype: "abstract" }, { signal })
  );
  const xml = await fetchRes.text();
  const papers = parseArticles(xml);

  const value = { papers, total, term: query, query: String(term || ""), ms: Date.now() - started, cached: false };
  cache.set(key, { at: Date.now(), value });
  trimCache();
  return value;
}

function trimCache() {
  if (cache.size <= CACHE_MAX) return;
  const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, cache.size - CACHE_MAX);
  oldest.forEach(([k]) => cache.delete(k));
}

export function clearCache() {
  cache.clear();
}

/** Cheap reachability probe used by the UI to decide what error copy to show. */
export async function ping() {
  const res = await get("einfo.fcgi", { db: "pubmed", retmode: "json" });
  return res.ok;
}

/** A topic is just a query preset — no papers are stored anywhere. */
export const TOPICS = [
  { id: "ssri", label: "SSRIs & serotonin", q: "selective serotonin reuptake inhibitor AND (depression OR anxiety)" },
  { id: "ketamine", label: "Ketamine & depression", q: "ketamine AND treatment-resistant depression AND randomized" },
  { id: "psychedelics", label: "Psychedelics", q: "psilocybin OR LSD AND (depression OR anxiety) AND clinical trial" },
  { id: "stimulants", label: "Stimulants & ADHD", q: "methylphenidate OR amphetamine AND ADHD AND randomized controlled trial" },
  { id: "caffeine", label: "Caffeine & adenosine", q: "caffeine AND adenosine receptor AND (sleep OR cognition)" },
  { id: "nicotine", label: "Nicotine & nAChR", q: "nicotine AND nicotinic acetylcholine receptor AND (cognition OR dependence)" },
  { id: "cannabinoids", label: "Cannabinoids", q: "cannabidiol OR THC AND (anxiety OR pain) AND randomized" },
  { id: "nootropics", label: "Nootropics", q: "nootropic AND (cognition OR memory) AND randomized controlled trial" },
  { id: "gaba", label: "GABA & benzodiazepines", q: "benzodiazepine OR GABA-A receptor AND (anxiety OR dependence)" },
  { id: "glutamate", label: "Glutamate & NMDA", q: "NMDA receptor AND memantine AND (cognition OR neuroprotection)" },
  { id: "monoamines", label: "Monoamine oxidase", q: "monoamine oxidase inhibitor AND (depression OR safety)" },
  { id: "adaptogens", label: "Adaptogens", q: "ashwagandha OR rhodiola AND (stress OR fatigue) AND randomized" },
  { id: "sleep", label: "Sleep pharmacology", q: "orexin receptor antagonist OR melatonin AND insomnia AND randomized" },
  { id: "tapering", label: "Deprescribing", q: "antidepressant discontinuation OR tapering AND withdrawal" },
];