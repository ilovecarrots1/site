/* Ask: local retrieval assistant over the whole database (no network) */

import { esc, icon, fmt, md } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID, getCompound, resolveCompound, searchCompounds, pubmedUrl } from "../data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "../data/neuro.js";
import { COURSES, LESSONS_ALL } from "../data/learn.js";
import { checkInteractions } from "../data/interactions.js";
import { pageHead, callout, classColor } from "./ui.js";

/* ------------------------------------------------------------------ */
/* Retrieval                                                           */
/* ------------------------------------------------------------------ */

const STOP = new Set(["the", "a", "an", "of", "and", "or", "is", "are", "does", "do", "what", "how", "why", "to", "in", "on", "for", "with", "it", "its", "can", "i", "my", "me", "you", "vs", "versus", "between", "difference", "long", "much", "should", "take"]);

function tokens(q) {
  return String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function findSystems(q) {
  const text = String(q).toLowerCase();
  return SYSTEMS.filter((s) => text.includes(s.name.toLowerCase().replace(" ", "")) || text.includes(s.name.toLowerCase()) || new RegExp(`\\b${s.abbr.toLowerCase()}\\b`, "i").test(text) || (s.matchFlags || []).some((f) => text.includes(f.replace(/-/g, " "))));
}

function findCompoundsIn(q) {
  const text = String(q || "").toLowerCase();
  const hits = new Set();
  for (const c of COMPOUNDS) {
    const names = [c.name, ...(c.aliases || [])].filter(Boolean).map((n) => n.toLowerCase());
    if (names.some((n) => n.length > 2 && text.includes(n))) hits.add(c.id);
  }
  if (!hits.size) {
    for (const c of searchCompounds(q).slice(0, 3)) hits.add(c.id);
  }
  return Array.from(hits).map((id) => COMPOUND_BY_ID.get(id)).filter(Boolean);
}

function findLessons(q) {
  const ts = tokens(q);
  if (!ts.length) return [];
  return LESSONS_ALL.map((entry) => {
    const hay = `${entry.lesson.title} ${entry.course.title} ${entry.lesson.content}`.toLowerCase();
    let score = 0;
    for (const t of ts) {
      if (entry.lesson.title.toLowerCase().includes(t)) score += 4;
      if (hay.includes(t)) score += 1;
    }
    return { ...entry, score };
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Answer composition                                                  */
/* ------------------------------------------------------------------ */

function compoundBlock(c) {
  return `<div class="stack" style="gap:7px">
    <div class="row wrap" style="gap:6px">
      <a class="chip chip-btn" href="#/compounds/${esc(c.id)}" style="--dot:${classColor(c.cls)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.name)}</a>
      <span class="chip">${esc(c.cls)}</span>
      <span class="chip">${esc(c.evidence)} evidence</span>
    </div>
    <p class="small" style="line-height:1.6;color:var(--text-2)">${esc(c.summary)}</p>
    ${(c.moa || []).length ? `<div class="tiny dim" style="line-height:1.6"><strong class="muted">Mechanism:</strong> ${(c.moa || []).map(esc).join(" · ")}</div>` : ""}
    <div class="row wrap" style="gap:6px 14px" class="tiny">
      ${c.pk.halfLife ? `<span class="tiny dim">t½ <span class="mono" style="color:var(--text-2)">${fmt.duration(c.pk.halfLife)}</span></span>` : ""}
      ${c.pk.onset ? `<span class="tiny dim">onset <span class="mono" style="color:var(--text-2)">${fmt.duration(c.pk.onset)}</span></span>` : ""}
      ${(c.doses || [])[0] ? `<span class="tiny dim">usual ${esc(c.doses[0].low)}${c.doses[0].high !== c.doses[0].low ? `–${esc(c.doses[0].high)}` : ""} ${esc(c.doses[0].unit || "mg")}</span>` : ""}
    </div>
    ${(c.warnings || []).length ? `<div class="tiny" style="color:#ffb9a3;line-height:1.55"><strong>Watch:</strong> ${esc(c.warnings[0])}</div>` : ""}
    <a class="btn ghost xs" href="#/compounds/${esc(c.id)}" style="align-self:flex-start">Open entry ${icon("arrowRight", 12)}</a>
  </div>`;
}

function compareBlocks(list) {
  const [a, b] = list;
  const rows = [
    ["Class", esc(a.cls) + (a.subcls ? ` · ${esc(a.subcls)}` : ""), esc(b.cls) + (b.subcls ? ` · ${esc(b.subcls)}` : "")],
    ["Evidence", evidenceCell(a), evidenceCell(b)],
    ["Mechanism", (a.moa || []).slice(0, 2).map(esc).join("; ") || "—", (b.moa || []).slice(0, 2).map(esc).join("; ") || "—"],
    ["Half-life", a.pk.halfLife ? fmt.duration(a.pk.halfLife) : "—", b.pk.halfLife ? fmt.duration(b.pk.halfLife) : "—"],
    ["Onset", a.pk.onset ? fmt.duration(a.pk.onset) : "—", b.pk.onset ? fmt.duration(b.pk.onset) : "—"],
    ["Typical dose", doseText(a), doseText(b)],
    ["Main risk", esc((a.warnings || [])[0] || (a.effects.bad || [])[0] || "—"), esc((b.warnings || [])[0] || (b.effects.bad || [])[0] || "—")],
  ];
  return `<div class="card tight" style="overflow-x:auto;padding:0">
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr>
        <th style="text-align:left;padding:9px 11px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);border-bottom:1px solid var(--line)"></th>
        <th style="text-align:left;padding:9px 11px;font-size:12.5px;border-bottom:1px solid var(--line)">${esc(a.name)}</th>
        <th style="text-align:left;padding:9px 11px;font-size:12.5px;border-bottom:1px solid var(--line)">${esc(b.name)}</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            ([label, x, y]) => `<tr>
              <td style="padding:8px 11px;color:var(--text-3);font-size:11.5px;border-bottom:1px solid var(--line-soft);white-space:nowrap">${label}</td>
              <td style="padding:8px 11px;border-bottom:1px solid var(--line-soft);vertical-align:top">${x}</td>
              <td style="padding:8px 11px;border-bottom:1px solid var(--line-soft);vertical-align:top">${y}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>
  <div class="row wrap" style="gap:6px;margin-top:9px">
    <a class="btn ghost xs" href="#/compounds/${esc(a.id)}">${esc(a.name)} entry</a>
    <a class="btn ghost xs" href="#/compounds/${esc(b.id)}">${esc(b.name)} entry</a>
    <a class="btn ghost xs" href="#/lab/interactions?add=${esc(a.id)}">Check ${esc(a.name)} interactions</a>
  </div>`;
}

function doseText(c) {
  const d = (c.doses || [])[0];
  if (!d) return "—";
  return `${esc(d.low)}${d.high && d.high !== d.low ? `–${esc(d.high)}` : ""} ${esc(d.unit || "mg")} ${d.route ? esc(d.route) : ""}`;
}

function evidenceCell(c) {
  return `<span class="chip chip-${c.evidence === "strong" ? "good" : c.evidence === "moderate" ? "ok" : c.evidence === "limited" ? "warn" : "bad"}">${esc(c.evidence)}</span>`;
}

function systemBlock(s) {
  return `<div class="stack" style="gap:7px">
    <div class="row" style="gap:7px"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${s.color}"></span>
    <strong style="font-size:14px">${esc(s.name)}</strong><span class="tag">${esc(s.abbr)}</span></div>
    <p class="small" style="line-height:1.6;color:var(--text-2)">${esc(s.summary)}</p>
    <div class="tiny dim" style="line-height:1.6"><strong class="muted">Receptors:</strong> ${s.receptors.map((r) => esc(r.name)).join(", ")}</div>
    <div class="tiny dim" style="line-height:1.6"><strong class="muted">Drugs that act here:</strong> ${(s.interventions || [])
      .map((p) => `${esc(p.point)} → ${esc(p.target)}`)
      .slice(0, 4)
      .join(" · ")}</div>
    <a class="btn ghost xs" href="#/brain/${esc(s.id)}" style="align-self:flex-start">Open pathway ${icon("arrowRight", 12)}</a>
  </div>`;
}

function lessonsBlock(list) {
  if (!list.length) return "";
  return `<div class="stack" style="gap:5px">
    ${list
      .map(
        (x) => `<a class="row between" href="#/learn/${esc(x.course.id)}/${esc(x.lesson.id)}" style="padding:8px 10px;border-radius:9px;background:var(--bg-2);border:1px solid var(--line);color:inherit;text-decoration:none">
          <span style="font-size:12.5px;font-weight:550">${esc(x.lesson.title)}</span>
          <span class="tiny dim">${esc(x.course.title)}</span>
        </a>`
      )
      .join("")}
  </div>`;
}

/** Build an answer for a free-text question. */
export function answer(q) {
  const text = String(q || "").trim();
  if (!text) return `<p class="small muted">Ask about a compound, a transmitter system, an interaction, or a lesson topic.</p>`;

  const found = findCompoundsIn(text);
  const systems = findSystems(text);
  const lessons = findLessons(text);
  const parts = [];

  if (found.length >= 2) {
    parts.push(`<p class="small muted" style="margin-bottom:9px">Comparing <strong style="color:var(--text)">${esc(found[0].name)}</strong> with <strong style="color:var(--text)">${esc(found[1].name)}</strong>:</p>`);
    parts.push(compareBlocks(found));
    const inter = checkInteractions(found.slice(0, 2));
    if (inter.length) {
      parts.push(`<div class="tiny" style="color:#ffb9a3;line-height:1.55;margin-top:9px"><strong>Stacking them:</strong> ${esc(inter[0].title)} — ${esc(inter[0].mechanism)}</div>`);
    }
    const blocked = `${found[0].name} ${found[1].name}`;
    const extra = found.slice(2);
    if (extra.length) parts.push(`<div class="tiny dim" style="margin-top:8px">Also matched: ${extra.map((c) => `<a href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>`).join(", ")}</div>`);
  } else if (found.length === 1) {
    const c = found[0];
    parts.push(compoundBlock(c));
    if (/\b(interact|combine|mix|stack|safe with)\b/i.test(text)) {
      const inter = checkInteractions([c, ...(globalThis.__stackSubstances || [])]);
      parts.push(`<p class="tiny dim" style="margin-top:9px">Add it to the checker to test against your stack: <a href="#/lab/interactions?add=${esc(c.id)}">open the interaction checker</a>.</p>`);
    }
    if (/half.?life|how long|duration|last/i.test(text) && c.pk.halfLife) {
      parts.push(
        `<div class="tiny dim" style="line-height:1.6;margin-top:8px"><strong class="muted">Timing:</strong> half-life ${fmt.duration(c.pk.halfLife)} → effectively cleared in ~${fmt.duration(Number(c.pk.halfLife) * 5)}; steady state after ~${fmt.duration(Number(c.pk.halfLife) * 5)} of regular dosing. <a href="#/lab?compound=${esc(c.id)}">Plot it in the lab</a>.</div>`
      );
    }
  }

  if (systems.length) {
    parts.push(`${found.length ? `<div class="divider"></div>` : ""}${systemBlock(systems[0])}`);
  }

  if (!found.length && !systems.length) {
    parts.push(`<p class="small muted">Nothing in the index directly matches “${esc(text)}”. Try a compound name, a system (dopamine, GABA, orexin), or a phrase like “how long does caffeine last”.</p>`);
  }

  if (lessons.length) {
    parts.push(`<div class="divider"></div><div class="eyebrow" style="margin-bottom:6px">Related lessons</div>${lessonsBlock(lessons)}`);
  }

  return parts.join("");
}

const SUGGESTIONS = [
  "modafinil vs armodafinil",
  "how long does caffeine last",
  "what does serotonin do",
  "SSRI and MAOI together",
  "ketamine mechanism",
  "is ashwagandha safe with thyroid meds",
  "dopamine vs noradrenaline",
];

const chat = { messages: [] };

function messagesHtml() {
  if (!chat.messages.length) {
    return `<div class="card" style="text-align:center;padding:26px 18px">
      <div class="empty-ic" style="margin:0 auto 10px">${icon("sparkles", 22)}</div>
      <h3 style="font-size:16px;margin-bottom:5px">Ask the index</h3>
      <p class="small dim" style="max-width:44ch;margin:0 auto 4px">Every answer is assembled from the local database — compounds, kinetics, pathways and lessons. No model, no internet, no invention.</p>
    </div>`;
  }
  return chat.messages
    .map(
      (m) => `<div class="card" style="${m.role === "user" ? "background:var(--accent-soft);border-color:var(--accent-line)" : ""};padding:13px">
        <div class="row" style="gap:6px;margin-bottom:${m.role === "user" ? "0" : "9px"}">
          <span class="tiny" style="color:${m.role === "user" ? "var(--accent)" : "var(--text-3)"};font-weight:650;text-transform:uppercase;letter-spacing:.06em">${m.role === "user" ? "You" : "Index"}</span>
        </div>
        ${m.role === "user" ? `<p style="font-size:14px;line-height:1.5">${esc(m.text)}</p>` : m.html}
      </div>`
    )
    .join("");
}

export const ask = {
  render() {
    return `
    ${pageHead("Ask", "A retrieval engine over everything in the app — mechanisms, kinetics, interactions, lessons. Honest by construction: if it is not in the data, it says so.", "")}

    <div class="split">
      <div>
        <div class="stack" id="chat-log" style="gap:10px">${messagesHtml()}</div>

        <form id="ask-form" style="margin-top:14px;display:flex;gap:8px;align-items:flex-end">
          <div class="search-input" style="flex:1">
            ${icon("search", 16)}
            <input class="input" id="ask-q" placeholder="e.g. how long does modafinil last?" autocomplete="off" enterkeyhint="send">
          </div>
          <button class="btn primary" type="submit" aria-label="Ask" style="flex:none">${icon("send", 16)}</button>
        </form>

        <div class="row wrap" style="gap:5px;margin-top:10px" id="ask-suggest">
          ${SUGGESTIONS.map((s) => `<button class="chip chip-btn" data-suggest="${esc(s)}">${esc(s)}</button>`).join("")}
        </div>
      </div>

      <aside class="col sticky-side" style="gap:12px">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:7px">What it can answer</div>
          <ul class="md-list" style="margin:0;padding-left:17px;font-size:12.5px;line-height:1.6;color:var(--text-2)">
            <li>Compound mechanisms, kinetics, doses and risks</li>
            <li>Head-to-head comparisons of two entries</li>
            <li>What a transmitter system does and how drugs touch it</li>
            <li>Which lesson covers a concept</li>
            <li>Whether two things are known to interact</li>
          </ul>
        </div>
        <div class="card tight">
          <div class="eyebrow" style="margin-bottom:6px">What it cannot do</div>
          <p class="tiny dim" style="line-height:1.6">It does not diagnose, dose for you, or invent pharmacology that is not in the database. No LLM sits behind this — it is a deterministic index, so a wrong answer is a data bug you can see.</p>
        </div>
        <div>${callout("warn", "Answers are summaries", "Every claim here compresses a literature you have not read. Follow the source links before acting on anything.")}</div>
      </aside>
    </div>`;
  },

  mount(root) {
    const log = root.querySelector("#chat-log");
    const form = root.querySelector("#ask-form");
    const input = root.querySelector("#ask-q");

    const paint = () => {
      log.innerHTML = messagesHtml();
      log.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    const send = (text) => {
      const q = String(text || "").trim();
      if (!q) return;
      chat.messages.push({ role: "user", text: q });
      chat.messages.push({ role: "bot", html: answer(q) });
      if (chat.messages.length > 24) chat.messages = chat.messages.slice(-24);
      input.value = "";
      paint();
    };

    form?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      send(input.value);
    });

    root.querySelector("#ask-suggest")?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-suggest]");
      if (b) send(b.dataset.suggest);
    });
  },
};