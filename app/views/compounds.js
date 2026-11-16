/* Compound browser + detail */

import { esc, icon, store, fmt, toast, copyText, evidenceChip, EVIDENCE, emptyState, disclaimer, awardXP } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID, CLASSES, searchCompounds, getCompound, pubmedUrl, ALL_TAGS } from "../data/compounds.js";
import { SYSTEMS } from "../data/neuro.js";
import { checkInteractions, worstSeverity, SEVERITY } from "../data/interactions.js";
import { pageHead, compoundCard, classColor, backLink, callout, lineChart, liveBadge } from "./ui.js";
import { searchPapers, LINK as PM_LINK } from "../lib/pubmed.js";
import { paperCard } from "./research.js";

const EV_ORDER = ["strong", "moderate", "limited", "preclinical", "anecdotal"];

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

const listState = { q: "", cls: "", ev: "", sort: "name", tag: "" };

function applyFilters() {
  let items = listState.q ? searchCompounds(listState.q) : COMPOUNDS.slice();
  if (listState.cls) items = items.filter((c) => c.cls === listState.cls);
  if (listState.ev) items = items.filter((c) => c.evidence === listState.ev);
  if (listState.tag) items = items.filter((c) => (c.tags || []).includes(listState.tag));

  if (listState.sort === "name") items.sort((a, b) => a.name.localeCompare(b.name));
  else if (listState.sort === "evidence") items.sort((a, b) => EV_ORDER.indexOf(a.evidence) - EV_ORDER.indexOf(b.evidence) || a.name.localeCompare(b.name));
  else if (listState.sort === "halflife") items.sort((a, b) => (a.pk.halfLife ?? 999) - (b.pk.halfLife ?? 999));
  else if (listState.sort === "class") items.sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));
  return items;
}

function resultsHtml() {
  const items = applyFilters();
  if (!items.length) {
    return `<div class="card">${emptyState("search", "No compounds match", "Try a shorter query, or clear the filters.", `<button class="btn ghost sm" data-act="reset">${icon("refresh", 14)} Reset filters</button>`)}</div>`;
  }
  return `<div class="grid grid-auto" style="gap:10px">${items.map(compoundCard).join("")}</div>`;
}

function countLabel() {
  const n = applyFilters().length;
  return `${n} of ${COMPOUNDS.length} compounds`;
}

export const list = {
  render(ctx) {
    const cls = CLASSES;
    // Deep links from tag chips: #/compounds?tag=stimulant
    const tagParam = ctx && ctx.query && ctx.query.tag ? String(ctx.query.tag) : "";
    if (tagParam) listState.tag = tagParam;
    if (ctx && ctx.query && ctx.query.q) listState.q = String(ctx.query.q);
    return `
    ${pageHead(
      "Compounds",
      "Every entry is graded by the strength of human evidence, not by popularity. Doses are literature reference points.",
      `<button class="btn ghost sm" data-act="random">${icon("sparkles", 14)} Random</button>`
    )}

    <div class="card" style="padding:12px;margin-bottom:14px">
      <div class="stack" style="gap:10px">
        <div class="search-input">
          ${icon("search", 16)}
          <input class="input" id="cmp-q" type="search" placeholder="Search name, alias, mechanism, target…" value="${esc(listState.q)}" autocomplete="off" enterkeyhint="search">
          <button class="clear ${listState.q ? "show" : ""}" data-act="clear-q" aria-label="Clear search">${icon("x", 15)}</button>
        </div>
        <div class="scroll-x">
          <div class="row wrap" style="gap:5px" id="cmp-class">
            <button class="chip chip-btn ${!listState.cls ? "on" : ""}" data-cls="">All classes</button>
            ${cls.map((c) => `<button class="chip chip-btn ${listState.cls === c ? "on" : ""}" data-cls="${esc(c)}"><span class="dot" style="background:${classColor(c)}"></span>${esc(c)}</button>`).join("")}
          </div>
        </div>
        <div class="row wrap" style="gap:8px">
          ${listState.tag ? `<button class="chip chip-btn on" data-act="clear-tag">${icon("x", 12)} tag: ${esc(listState.tag)}</button>` : ""}
          <div class="btn-group" id="cmp-ev">
            <button class="${!listState.ev ? "on" : ""}" data-ev="">Any evidence</button>
            ${EV_ORDER.map((e) => `<button class="${listState.ev === e ? "on" : ""}" data-ev="${e}">${esc(EVIDENCE[e].short)}</button>`).join("")}
          </div>
          <select class="select" id="cmp-sort" style="width:auto;min-width:140px" aria-label="Sort">
            <option value="name" ${listState.sort === "name" ? "selected" : ""}>Name A–Z</option>
            <option value="evidence" ${listState.sort === "evidence" ? "selected" : ""}>Strongest evidence</option>
            <option value="class" ${listState.sort === "class" ? "selected" : ""}>Class</option>
            <option value="halflife" ${listState.sort === "halflife" ? "selected" : ""}>Shortest half-life</option>
          </select>
          <span class="tiny dim" id="cmp-count" style="margin-left:auto;align-self:center">${countLabel()}</span>
        </div>
      </div>
    </div>

    <div id="cmp-results">${resultsHtml()}</div>
    <div style="margin-top:22px">${disclaimer(true)}</div>`;
  },

  mount(root, ctx) {
    const q = root.querySelector("#cmp-q");
    const results = root.querySelector("#cmp-results");
    const count = root.querySelector("#cmp-count");

    const paint = () => {
      results.innerHTML = resultsHtml();
      count.textContent = countLabel();
    };

    q?.addEventListener("input", () => {
      listState.q = q.value;
      root.querySelector('[data-act="clear-q"]')?.classList.toggle("show", !!q.value);
      paint();
    });

    root.querySelector('[data-act="clear-q"]')?.addEventListener("click", () => {
      listState.q = "";
      if (q) q.value = "";
      root.querySelector('[data-act="clear-q"]')?.classList.remove("show");
      paint();
      q?.focus();
    });

    root.querySelector("#cmp-class")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-cls]");
      if (!btn) return;
      listState.cls = btn.dataset.cls;
      root.querySelectorAll("#cmp-class [data-cls]").forEach((b) => b.classList.toggle("on", b === btn));
      paint();
    });

    root.querySelector("#cmp-ev")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-ev]");
      if (!btn) return;
      listState.ev = btn.dataset.ev;
      root.querySelectorAll("#cmp-ev [data-ev]").forEach((b) => b.classList.toggle("on", b === btn));
      paint();
    });

    root.querySelector("#cmp-sort")?.addEventListener("change", (ev) => {
      listState.sort = ev.target.value;
      paint();
    });

    root.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-act="clear-tag"]')) {
        listState.tag = "";
        if (ctx.navigate) ctx.navigate("#/compounds");
        else location.hash = "#/compounds";
        return;
      }
      const reset = ev.target.closest('[data-act="reset"]');
      if (reset) {
        listState.q = "";
        listState.cls = "";
        listState.ev = "";
        listState.tag = "";
        ctx.rerender();
      }
      if (ev.target.closest('[data-act="random"]')) {
        const pick = COMPOUNDS[Math.floor(Math.random() * COMPOUNDS.length)];
        location.hash = `#/compounds/${pick.id}`;
      }
    });
  },
};

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

const detailState = { tab: "overview" };

function inStack(id) {
  return (store.data.stack || []).includes(id);
}
function isSaved(id) {
  return (store.data.saved || []).includes(id);
}

const SYSTEMS_BY_FLAG = (() => {
  const map = new Map();
  for (const s of SYSTEMS) {
    for (const f of s.matchFlags || []) {
      if (!map.has(f)) map.set(f, []);
      map.get(f).push(s);
    }
  }
  return map;
})();

function systemsForCompound(c) {
  const out = new Map();
  for (const flag of c.flags || []) {
    for (const s of SYSTEMS_BY_FLAG.get(flag) || []) out.set(s.id, s);
  }
  return Array.from(out.values());
}

function tabBar(active) {
  const tabs = [
    ["overview", "Overview"],
    ["mechanism", "Mechanism"],
    ["pk", "Kinetics"],
    ["doses", "Doses"],
    ["safety", "Safety"],
    ["research", "Research"],
  ];
  return `<div class="tabs" id="cd-tabs" role="tablist">
    ${tabs.map(([key, label]) => `<button role="tab" aria-selected="${active === key}" class="${active === key ? "on" : ""}" data-tab="${key}">${esc(label)}</button>`).join("")}
  </div>`;
}

function panelOverview(c) {
  const stack = (store.data.stack || []).map((id) => COMPOUND_BY_ID.get(id)).filter((x) => x && x.id !== c.id);
  const findings = stack.length ? checkInteractions([c, ...stack]) : [];
  const sys = systemsForCompound(c);

  return `
  <div class="stack" style="gap:16px">
    ${c.summary ? `<p class="lead">${esc(c.summary)}</p>` : ""}

    ${
      (c.moa || []).length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Mechanism of action</div>
            <div class="row wrap" style="gap:6px">${c.moa.map((m) => `<span class="chip chip-accent">${esc(m)}</span>`).join("")}</div>
          </section>`
        : ""
    }

    ${
      (c.effects?.good?.length || c.effects?.bad?.length)
        ? `<div class="effect-cols">
            <div class="effect-box good"><h4>${icon("check", 12)} Sought effects</h4>
              <ul>${(c.effects.good || []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>
            <div class="effect-box bad"><h4>${icon("alert", 12)} Undesired effects</h4>
              <ul>${(c.effects.bad || []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>
          </div>`
        : ""
    }

    ${
      findings.length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Against your stack</div>
            <div class="stack" style="gap:8px">${findings.slice(0, 4).map(findingRow).join("")}</div>
            <a class="btn ghost sm" style="margin-top:9px" href="#/lab/interactions">Open full checker ${icon("chevronRight", 13)}</a>
          </section>`
        : stack.length
          ? `<div>${callout("ok", "No known interaction with your current stack", "That is not proof of safety — absence of data is not data. Unlisted combinations are simply unstudied.")}</div>`
          : ""
    }

    ${
      sys.length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Systems involved</div>
            <div class="row wrap" style="gap:6px">
              ${sys.map((s) => `<a class="chip chip-btn" href="#/brain/${esc(s.id)}" style="--dot:${s.color}"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</a>`).join("")}
            </div>
          </section>`
        : ""
    }

    ${
      (c.tags || []).length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Tags</div>
            <div class="row wrap" style="gap:5px">${c.tags.map((t) => `<a class="chip" href="#/compounds?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
          </section>`
        : ""
    }

    <div class="card tight" style="background:var(--bg-1)">
      <div class="row wrap" style="gap:10px 18px">
        <div><div class="stat-label">Half-life</div><div class="mono" style="font-size:13px">${c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "—"}</div></div>
        <div><div class="stat-label">T-max</div><div class="mono" style="font-size:13px">${c.pk.tmax ? fmt.duration(c.pk.tmax) : "—"}</div></div>
        <div><div class="stat-label">Duration</div><div class="mono" style="font-size:13px">${c.pk.duration ? fmt.duration(c.pk.duration) : "—"}</div></div>
        <div><div class="stat-label">Class</div><div class="mono" style="font-size:13px">${esc(c.cls)}</div></div>
      </div>
    </div>
  </div>`;
}

function panelMechanism(c) {
  const targets = c.targets || [];
  return `
  <div class="stack" style="gap:16px">
    ${
      (c.moa || []).length
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:6px">Primary actions</div>
            <ul class="md-list" style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.6">
              ${c.moa.map((m) => `<li>${esc(m)}</li>`).join("")}
            </ul>
          </div>`
        : ""
    }

    ${
      targets.length
        ? `<div class="card flush">
            <div style="padding:12px 14px;border-bottom:1px solid var(--line-soft)"><div class="eyebrow">Molecular targets</div></div>
            <div class="list">
              ${targets
                .map(
                  (t) => `<div class="list-row" style="align-items:flex-start">
                    <div class="grow">
                      <div class="title">${esc(t.name)} ${t.action ? `<span class="chip chip-${/antagonist|block|inhibit/i.test(t.action) ? "warn" : "good"}">${esc(t.action)}</span>` : ""}</div>
                      ${t.note ? `<div class="sub" style="margin-top:3px;line-height:1.5">${esc(t.note)}</div>` : ""}
                    </div>
                  </div>`
                )
                .join("")}
            </div>
          </div>`
        : `<div class="card">${emptyState("target", "No molecular targets recorded", "This entry describes mechanism at the systems level only.")}</div>`
    }

    ${(() => {
      const sys = systemsForCompound(c);
      if (!sys.length) return "";
      return `<div class="card">
        <div class="eyebrow" style="margin-bottom:8px">Where this sits in the pathway</div>
        <div class="stack" style="gap:8px">
          ${sys
            .map((s) => {
              const pts = (s.interventions || []).filter((p) => (p.drugs || []).includes(c.id));
              return `<a class="card tight hoverable" href="#/brain/${esc(s.id)}" style="text-decoration:none;color:inherit;background:var(--bg-1)">
                <div class="row between"><div class="row" style="gap:6px"><span class="dot" style="width:7px;height:7px;border-radius:50%;background:${s.color}"></span>
                <strong style="font-size:13px">${esc(s.name)}</strong></div>${icon("chevronRight", 14)}</div>
                ${pts.length ? `<div class="tiny dim" style="margin-top:5px;line-height:1.5">${pts.map((p) => `${esc(p.point)}: ${esc(p.target)}`).join(" · ")}</div>` : `<div class="tiny dim" style="margin-top:5px">Acts on this system through a downstream mechanism.</div>`}
              </a>`;
            })
            .join("")}
        </div>
      </div>`;
    })()}
  </div>`;
}

function panelPK(c) {
  const half = Number(c.pk.halfLife) || 0;
  const data = [];
  if (half > 0) {
    for (let t = 0; t <= Math.min(half * 6, 240); t += Math.max(0.25, half / 12)) {
      const peak = Math.max(1, half / 2.2);
      const v = t < peak ? Math.sin((t / peak) * Math.PI * 0.5) : Math.exp(-0.693 * (t - peak) / half);
      data.push({ x: t, y: Math.max(0.001, v) });
    }
  }
  const series = half > 0 ? [{ color: "var(--accent)", points: data }] : [];
  const ticks = half > 0 ? [0, half, half * 2, half * 3, half * 4].filter((t) => t <= Math.min(half * 6, 240)).map((t) => ({ x: t, label: `${Math.round(t * 10) / 10}h` })) : [];

  return `
  <div class="stack" style="gap:14px">
    <div class="card flush">
      <div class="list">
        ${kvRow("Onset", c.pk.onset ? fmt.duration(c.pk.onset) : "—")}
        ${kvRow("T-max", c.pk.tmax ? fmt.duration(c.pk.tmax) : "—")}
        ${kvRow("Half-life", c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "—")}
        ${kvRow("Duration", c.pk.duration ? fmt.duration(c.pk.duration) : "—")}
        ${kvRow("Metabolism", c.pk.metabolism || "—")}
        ${kvRow("Excretion", c.pk.excretion || "—")}
      </div>
    </div>

    ${
      half > 0
        ? `<div class="card">
            <div class="card-head"><h3 style="font-size:14px">Single-dose decay</h3><span class="spacer"></span><span class="tiny dim mono">t½ ${fmt.duration(half)}</span></div>
            ${lineChart(series, { height: 150, yLabel: "relative plasma level", xTicks: ticks, yMax: 1 })}
            <p class="tiny dim" style="margin-top:8px;line-height:1.5">Schematic first-order decay — absorption simplified. Real curves depend on formulation, food and hepatic blood flow.</p>
            <a class="btn soft sm" style="margin-top:10px" href="#/lab?compound=${esc(c.id)}">${icon("flask", 14)} Simulate doses in the lab</a>
          </div>`
        : ""
    }

    ${
      half >= 2
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:7px">Timing implications</div>
            <ul class="md-list" style="margin:0;padding-left:18px;font-size:13px;line-height:1.65">
              <li>Steady state after about <strong>${fmt.duration(half * 5)}</strong> of regular dosing.</li>
              <li>Almost eliminated (≈97%) in about <strong>${fmt.duration(half * 5)}</strong> after the last dose.</li>
              <li>${half >= 24 ? "Long half-life: effects accumulate quietly — side effects may appear days into a course." : "Short half-life: levels swing widely between doses; timing matters more than total dose."}</li>
            </ul>
          </div>`
        : ""
    }
  </div>`;
}

function kvRow(k, v) {
  return `<div class="list-row" style="padding:10px 14px">
    <div class="grow"><div class="sub" style="margin:0;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em">${esc(k)}</div>
    <div style="font-size:13px;margin-top:1px">${esc(v)}</div></div>
  </div>`;
}

function panelDoses(c) {
  const doses = c.doses || [];
  return `
  <div class="stack" style="gap:14px">
    ${callout(
      "warn",
      "Reference ranges, not recommendations",
      "These are values reported in the clinical literature for context. Individual dosing depends on weight, age, liver and kidney function, genetics and other drugs."
    )}

    ${
      doses.length
        ? `<div class="card flush">
            <div class="list">
              ${doses
                .map(
                  (d) => `<div class="list-row" style="align-items:flex-start">
                    <div class="grow">
                      <div class="title">${esc(d.route || "oral")} <span class="mono" style="font-size:12px;color:var(--accent)">${esc(fmtNum(d.low))}${d.high && d.high !== d.low ? `–${esc(fmtNum(d.high))}` : ""} ${esc(d.unit || "mg")}</span></div>
                      ${d.note ? `<div class="sub" style="margin-top:3px;line-height:1.5">${esc(d.note)}</div>` : ""}
                    </div>
                  </div>`
                )
                .join("")}
            </div>
          </div>`
        : `<div class="card">${emptyState("pill", "No dose data recorded", "This compound is documented here for mechanism and risk, not for dosing.")}</div>`
    }

    <div class="card tight">
      <div class="eyebrow" style="margin-bottom:6px">Dose-response caution</div>
      <p class="small muted" style="line-height:1.6">
        Most of these compounds have a wider margin than the clinical drugs beside them — but “natural” is a marketing category, not a safety property.
        Contaminants, mislabelling and unmeasured potency cause most supplement-related harm.
      </p>
    </div>
  </div>`;
}

function fmtNum(n) {
  if (n === undefined || n === null) return "—";
  return String(n);
}

function panelSafety(c) {
  return `
  <div class="stack" style="gap:14px">
    ${
      (c.warnings || []).length
        ? `<div class="stack" style="gap:8px">
            ${c.warnings.map((w, i) => callout(i === 0 ? "danger" : "warn", i === 0 ? "Important" : "Caution", w)).join("")}
          </div>`
        : `<div>${callout("ok", "No specific warnings recorded", "Absence of recorded warnings is not evidence of safety. Unlisted risks are unstudied risks.")}</div>`
    }

    ${
      (c.flags || []).length
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:7px">Pharmacological flags</div>
            <div class="row wrap" style="gap:5px">${c.flags.map((f) => `<span class="chip" title="Used by the interaction engine">${esc(f)}</span>`).join("")}</div>
            <p class="tiny dim" style="margin-top:9px;line-height:1.5">Flags drive the interaction engine: overlap on two matching flags produces a signal even for combinations nobody has formally studied.</p>
          </div>`
        : ""
    }

    <div class="row wrap" style="gap:8px">
      <a class="btn soft sm" href="#/lab/interactions?add=${esc(c.id)}">${icon("shield", 14)} Check interactions</a>
      <button class="btn ghost sm" data-act="stack">${icon("plus", 14)} ${inStack(c.id) ? "In your stack" : "Add to stack"}</button>
    </div>
  </div>`;
}

function panelResearch(c) {
  const q = c.pubmed || c.name;
  return `
  <div class="stack" style="gap:14px">
    <div class="card">
      <div class="card-head">
        <h3 style="font-size:14px">Live from PubMed</h3>
        <span class="spacer"></span>
        ${liveBadge("api")}
      </div>
      <p class="tiny dim" style="line-height:1.55;margin-bottom:10px">
        Fetched from NCBI the moment you opened this tab. Nothing here is bundled into the app or written to storage.
      </p>
      <div data-live="${esc(q)}" data-token="">
        <div class="stack" style="gap:9px">
          <div class="skeleton" style="height:14px;width:78%"></div>
          <div class="skeleton" style="height:11px;width:46%"></div>
          <div class="skeleton" style="height:11px;width:92%"></div>
          <div class="skeleton" style="height:11px;width:64%"></div>
        </div>
      </div>
    </div>

    <div class="card tight">
      <div class="eyebrow" style="margin-bottom:7px">Search it yourself</div>
      <div class="stack" style="gap:8px">
        <a class="btn soft sm" href="${PM_LINK.search(q)}" target="_blank" rel="noopener noreferrer">${icon("external", 14)} PubMed: “${esc(q)}”</a>
        <a class="btn ghost sm" href="${PM_LINK.search(`"${c.name}" AND (review[pt] OR meta-analysis[pt])`)}" target="_blank" rel="noopener noreferrer">${icon("book", 14)} Reviews for ${esc(c.name)}</a>
        <a class="btn ghost sm" href="#/research?compound=${encodeURIComponent(q)}">${icon("microscope", 14)} Open the Research tab</a>
      </div>
    </div>

    <div class="card tight">
      <div class="row" style="gap:8px;margin-bottom:6px">${evidenceChip(c.evidence)}<span class="eyebrow">Evidence grade</span></div>
      <p class="small muted" style="line-height:1.6">${esc(EVIDENCE[c.evidence]?.label || "Unrated")} — assigned from the quality and consistency of human data, weighting controlled trials over mechanistic plausibility.</p>
    </div>
  </div>`;
}

/** Fetch the live PubMed block inside the research panel. */
async function hydrateLive(host, c) {
  const box = host && host.querySelector ? host.querySelector("[data-live]") : null;
  if (!box) return;
  const q = c.pubmed || c.name;
  const token = String(Math.random()).slice(2);
  box.dataset.token = token;
  box.innerHTML = `<div class="stack" style="gap:9px">
      <div class="skeleton" style="height:14px;width:78%"></div>
      <div class="skeleton" style="height:11px;width:46%"></div>
      <div class="skeleton" style="height:11px;width:92%"></div>
      <div class="skeleton" style="height:11px;width:64%"></div>
    </div>`;

  try {
    const res = await searchPapers(q, { retmax: 4 });
    if (box.dataset.token !== token) return;
    if (!res.papers.length) {
      box.innerHTML = `<p class="small dim" style="line-height:1.6">PubMed returned no records for “${esc(q)}”. That usually means the stored query is too specific — try the plain compound name.</p>
        <a class="btn ghost xs" href="#/research?compound=${encodeURIComponent(c.name)}" style="margin-top:8px">${icon("search", 13)} Search “${esc(c.name)}”</a>`;
      return;
    }
    box.innerHTML = `<div class="stack" style="gap:10px">${res.papers.map((p, i) => paperCard(p, i)).join("")}</div>
      <div class="row between wrap" style="gap:8px;margin-top:11px">
        <span class="tiny dim">${res.total.toLocaleString()} records · ${res.ms} ms · live, not stored</span>
        <a class="btn ghost xs" href="#/research?compound=${encodeURIComponent(q)}">Open in Research ${icon("arrowRight", 13)}</a>
      </div>`;
  } catch (err) {
    if (box.dataset.token !== token) return;
    box.innerHTML = `<p class="small" style="color:var(--warn);line-height:1.6">${icon("wifiOff", 14)} Could not reach NCBI${err && err.message ? ` — ${esc(err.message)}` : ""}.</p>
      <div class="row wrap" style="gap:8px;margin-top:9px">
        <button class="btn soft xs" data-live-retry>${icon("refresh", 13)} Retry</button>
        <a class="btn ghost xs" href="${PM_LINK.search(q)}" target="_blank" rel="noopener noreferrer">${icon("external", 13)} PubMed</a>
      </div>`;
  }
}

function findingRow(f) {
  const cls = f.severity === "critical" ? "crit" : f.severity === "major" ? "bad" : "warn";
  return `<div class="card tight" style="border-color:var(--line-soft);padding:11px">
    <div class="row between" style="align-items:flex-start;gap:8px;margin-bottom:5px">
      <strong style="font-size:13px;line-height:1.35">${esc(f.title)}</strong>
      <span class="chip chip-${cls}" style="flex:none">${esc(SEVERITY[f.severity]?.label || "")}</span>
    </div>
    <p class="tiny dim" style="line-height:1.5;margin-bottom:4px">${esc(f.a)} × ${esc(f.b)}</p>
    <p class="tiny muted" style="line-height:1.5">${esc(f.mechanism)}</p>
  </div>`;
}

function panel(c, tab) {
  switch (tab) {
    case "mechanism":
      return panelMechanism(c);
    case "pk":
      return panelPK(c);
    case "doses":
      return panelDoses(c);
    case "safety":
      return panelSafety(c);
    case "research":
      return panelResearch(c);
    default:
      return panelOverview(c);
  }
}

export const detail = {
  render(ctx) {
    const c = getCompound(ctx.params.id);
    if (!c) {
      return `<div class="card">${emptyState("search", "Compound not found", `No entry for “${ctx.params.id}”.`, `<a class="btn ghost sm" href="#/compounds">${icon("arrowLeft", 14)} Back to compounds</a>`)}</div>`;
    }
    if (detailState.id !== c.id) {
      detailState.id = c.id;
      detailState.tab = "overview";
    }
    const saved = isSaved(c.id);
    const partner = COMPOUNDS.find((x) => x.id !== c.id && x.cls === c.cls) || COMPOUNDS.find((x) => x.id !== c.id);

    return `
    <div class="row" style="margin-bottom:14px">
      ${backLink("#/compounds", "Compounds")}
      <span class="spacer"></span>
      <button class="icon-btn ${saved ? "accent" : ""}" data-act="save" aria-label="Save entry" title="Save entry">${icon("star", 18)}</button>
      <button class="icon-btn" data-act="copy" aria-label="Copy summary" title="Copy summary">${icon("copy", 17)}</button>
    </div>

    <header class="detail-head">
      <div class="row wrap" style="gap:7px">
        <span class="chip" style="--dot:${classColor(c.cls)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.cls)}</span>
        ${c.subcls ? `<span class="chip">${esc(c.subcls)}</span>` : ""}
        ${c.status ? `<span class="chip">${esc(c.status)}</span>` : ""}
        ${evidenceChip(c.evidence)}
      </div>
      <h1 class="detail-title">${esc(c.name)}</h1>
      ${(c.aliases || []).length ? `<p class="detail-alias">also: ${c.aliases.map(esc).join(" · ")}</p>` : ""}
      <div class="row wrap" style="gap:8px;margin-top:4px">
        <button class="btn ${inStack(c.id) ? "soft" : "primary"} sm" data-act="stack">${icon(inStack(c.id) ? "check" : "plus", 14)} ${inStack(c.id) ? "In stack" : "Add to stack"}</button>
        <a class="btn ghost sm" href="#/lab?compound=${esc(c.id)}">${icon("flask", 14)} Lab</a>
        <a class="btn ghost sm" href="#/lab/interactions?add=${esc(c.id)}">${icon("shield", 14)} Interactions</a>
        ${partner ? `<a class="btn ghost sm" href="#/compare?ids=${esc(c.id)},${esc(partner.id)}">${icon("grid", 14)} Compare</a>` : ""}
      </div>
    </header>

    ${tabBar(detailState.tab)}
    <div id="cd-panel">${panel(c, detailState.tab)}</div>
    <div style="margin-top:24px">${disclaimer()}</div>`;
  },

  mount(root, ctx) {
    const c = getCompound(ctx.params.id);
    if (!c) return;
    const panelEl = root.querySelector("#cd-panel");

    root.querySelector("#cd-tabs")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tab]");
      if (!btn) return;
      detailState.tab = btn.dataset.tab;
      root.querySelectorAll("#cd-tabs [data-tab]").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", String(on));
      });
      panelEl.innerHTML = panel(c, detailState.tab);
      if (detailState.tab === "research") hydrateLive(panelEl, c);
    });

    if (detailState.tab === "research") hydrateLive(panelEl, c);

    panelEl?.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-live-retry]")) hydrateLive(panelEl, c);
    });

    root.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-act="stack"]')) {
        const st = store.data.stack || [];
        const has = st.includes(c.id);
        store.update((s) => {
          s.stack = has ? s.stack.filter((x) => x !== c.id) : [...s.stack, c.id];
        });
        toast(has ? `${c.name} removed from stack` : `${c.name} added to stack`, has ? "info" : "success");
        ctx.rerender();
      }
      if (ev.target.closest('[data-act="save"]')) {
        const saved = store.data.saved || [];
        const has = saved.includes(c.id);
        store.update((s) => {
          s.saved = has ? s.saved.filter((x) => x !== c.id) : [...s.saved, c.id];
        });
        if (!has) awardXP(2);
        toast(has ? "Removed from saved" : "Saved", has ? "info" : "success");
        ctx.rerender();
      }
      if (ev.target.closest('[data-act="copy"]')) {
        const text = `${c.name} (${c.cls})\n${c.summary}\n\nMechanism: ${(c.moa || []).join("; ")}\nHalf-life: ${c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "unknown"}\n\nSource: NeuroDifference (educational, not medical advice)`;
        copyText(text, "Entry copied");
      }
    });
  },
};