/* ==========================================================================
   Stack builder — assemble what you actually take, see the interaction
   findings and the shared flags update as you go, then export the list.
   ========================================================================== */

import { esc, icon, store, toast, copyText } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { checkInteractions, worstSeverity, SEVERITY } from "../data/interactions.js";
import { severityChip } from "./ui.js";

const MAX = 8;

function stack() {
  if (!Array.isArray(store.data.stack)) store.data.stack = [];
  store.data.stack = store.data.stack.filter((id) => COMPOUND_BY_ID.has(id)).slice(0, MAX);
  return store.data.stack;
}

function doseLine(c) {
  const d = (c.doses && c.doses[0]) || null;
  if (!d) return "dose not specified";
  const amount = d.low === d.high || d.high == null ? `${d.low}` : `${d.low}–${d.high}`;
  return `${amount} ${d.unit || ""} · ${d.route || "oral"}`;
}

function matches(term) {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const out = [];
  for (const c of COMPOUNDS) {
    const hay = `${c.name} ${(c.aliases || []).join(" ")} ${c.cls || ""} ${c.id}`.toLowerCase();
    if (!hay.includes(t)) continue;
    out.push(c);
    if (out.length >= 10) break;
  }
  return out;
}

/* ------------------------------------------------------------------ pieces */

function findingHtml(f) {
  const meta = SEVERITY[f.severity] || SEVERITY.minor;
  return `<div class="ix-finding" data-sev="${esc(f.severity)}">
    <div class="ix-finding-head">
      ${severityChip(f.severity)}
      <b>${esc(f.title)}</b>
      <span class="tiny dim">${esc(f.a)} + ${esc(f.b)}</span>
    </div>
    <div class="small muted" style="margin-top:4px">${esc(f.mechanism || "")}</div>
    ${f.advice ? `<div class="small ix-advice">${icon("alert", 12)} ${esc(f.advice)}</div>` : ""}
    <span class="tiny dim">${meta.label} · ${f.source === "specific" ? "specific pair" : "class effect"}</span>
  </div>`;
}

function flagUnion(list) {
  const counts = new Map();
  for (const c of list) for (const f of c.flags || []) counts.set(f, (counts.get(f) || 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([flag, n]) => ({ flag, n }));
}

function targetUnion(list) {
  const counts = new Map();
  for (const c of list) {
    const seen = new Set();
    for (const t of c.targets || []) {
      const name = (t && t.name ? String(t.name) : "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);
}

function bodyHtml(ids) {
  const list = ids.map((id) => COMPOUND_BY_ID.get(id)).filter(Boolean);
  const findings = checkInteractions(list);
  const worst = worstSeverity(findings);

  if (!list.length) {
    return `<div class="pk-empty">
      ${icon("layers", 22)}
      <div><b>The stack is empty.</b>
      <div class="small dim" style="margin-top:4px">Search a compound above and add it. Every addition re-checks each pair against the rule engine — specific pharmacology first, then class flags.</div></div>
    </div>`;
  }

  const bySev = ["critical", "major", "moderate", "minor"].map((s) => ({ s, n: findings.filter((f) => f.severity === s).length }));
  const flags = flagUnion(list);
  const shared = targetUnion(list);

  return `<div class="ix-summary" data-tone="${esc(worst || "ok")}">
    <div class="ix-summary-main">
      ${worst ? severityChip(worst) : `<span class="chip chip-good">${icon("check", 12)} No rule triggered</span>`}
      <b>${findings.length ? `${findings.length} interaction${findings.length === 1 ? "" : "s"}` : "Clear"}</b>
      <span class="tiny dim">${list.length} compound${list.length === 1 ? "" : "s"} · ${(list.length * (list.length - 1)) / 2} pairs checked</span>
    </div>
    <div class="row wrap" style="gap:4px">
      ${bySev.filter((x) => x.n).map((x) => `<span class="chip chip-xs" data-sev="${esc(x.s)}">${esc((SEVERITY[x.s] || {}).label || x.s)} ${x.n}</span>`).join("")}
    </div>
  </div>

  ${findings.length
      ? `<div class="ix-findings">${findings.map(findingHtml).join("")}</div>`
      : `<div class="callout" style="margin-top:10px"><b>Nothing matched.</b> The engine covers ${"91"} authored pairs plus class-flag rules. Absence of a finding is not absence of a risk — pharmacokinetics, dose and timing still matter.</div>`}

  ${shared.length
      ? `<div class="block" style="margin-top:14px">
          <div class="block-head"><h2>Shared targets</h2><div class="block-sub">More than one compound hits these — additive load</div></div>
          <div class="chip-row">
            ${shared.map(([name, n]) => `<span class="chip chip-xs chip-accent">${esc(name)} ×${n}</span>`).join("")}
          </div>
        </div>`
      : ""}

  ${flags.length
      ? `<div class="block" style="margin-top:14px">
          <div class="block-head"><h2>Stack profile</h2><div class="block-sub">Union of the flags this combination carries</div></div>
          <div class="chip-row">
            ${flags.map((f) => `<span class="chip chip-xs ${f.n > 1 ? "chip-warn" : ""}">${esc(f.f)}${f.n > 1 ? ` ×${f.n}` : ""}</span>`).join("")}
          </div>
        </div>`
      : ""}

  <div class="row wrap" style="gap:8px;margin-top:16px">
    <button type="button" class="btn soft sm" data-act="export">${icon("download", 13)} Copy as markdown</button>
    <a class="btn ghost sm" href="#/compare?ids=${esc(list.map((c) => c.id).join(","))}">${icon("grid", 13)} Compare</a>
    <a class="btn ghost sm" href="#/lab/interactions">${icon("zap", 13)} Full checker</a>
    <button type="button" class="btn ghost sm" data-act="clear">${icon("trash", 13)} Clear</button>
  </div>`;
}

function exportText(ids) {
  const list = ids.map((id) => COMPOUND_BY_ID.get(id)).filter(Boolean);
  const findings = checkInteractions(list);
  const lines = ["# Stack", ""];
  for (const c of list) lines.push(`- **${c.name}** — ${doseLine(c)} · ${c.cls || ""}`);
  if (findings.length) {
    lines.push("", "## Interaction findings", "");
    for (const f of findings) {
      lines.push(`- **${(SEVERITY[f.severity] || {}).label || f.severity}** · ${f.a} + ${f.b} — ${f.title}`);
      if (f.mechanism) lines.push(`  - ${f.mechanism}`);
      if (f.advice) lines.push(`  - → ${f.advice}`);
    }
  } else {
    lines.push("", "_No rule triggered._");
  }
  lines.push("", "---", "Education only — not a medical recommendation.");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ view */

export function render(ctx) {
  const ids = stack();
  const q = (ctx && ctx.query) || {};
  if (q.add && COMPOUND_BY_ID.has(String(q.add)) && !ids.includes(String(q.add)) && ids.length < MAX) {
    ids.push(String(q.add));
    store.save();
  }

  return `<div class="page">
    <div class="page-head">
      <div style="min-width:0">
        <div class="eyebrow tiny dim">Protocol</div>
        <h1 class="page-title">Stack builder</h1>
        <div class="page-sub">Up to ${MAX} compounds, each pair checked as you add it. Saved on this device.</div>
      </div>
      <span class="chip chip-xs">${ids.length}/${MAX}</span>
    </div>

    <div class="stk-wrap">
      <div class="stk-side">
        <div class="card tight">
          <label class="cd-search">${icon("search", 16)}
            <input id="stk-q" type="search" inputmode="search" autocomplete="off" placeholder="Search compounds…" />
          </label>
          <div id="stk-results" class="stk-results"></div>
        </div>

        <div class="card tight" style="margin-top:10px">
          <div class="row between" style="margin-bottom:8px">
            <span class="tiny dim" style="letter-spacing:.1em;text-transform:uppercase">In the stack</span>
            <span class="tiny dim">${ids.length}/${MAX}</span>
          </div>
          <div id="stk-list">
            ${ids
              .map((id) => {
                const c = COMPOUND_BY_ID.get(id);
                if (!c) return "";
                return `<div class="stk-item" data-id="${esc(c.id)}">
                  <div class="stk-item-main">
                    <a href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>
                    <span class="tiny dim">${esc(doseLine(c))}</span>
                  </div>
                  <button type="button" class="icon-btn" data-remove="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">${icon("x", 13)}</button>
                </div>`;
              })
              .join("") || `<div class="tiny dim">Empty.</div>`}
          </div>
        </div>
      </div>

      <div class="stk-main">
        <div class="card" id="stk-out">${bodyHtml(ids)}</div>
      </div>
    </div>
  </div>`;
}

export function mount(root) {
  const input = root.querySelector("#stk-q");
  const results = root.querySelector("#stk-results");
  const out = root.querySelector("#stk-out");

  const repaint = () => {
    const ids = stack();
    if (out) out.innerHTML = bodyHtml(ids);
    const list = root.querySelector("#stk-list");
    if (list) {
      list.innerHTML =
        ids
          .map((id) => {
            const c = COMPOUND_BY_ID.get(id);
            if (!c) return "";
            return `<div class="stk-item" data-id="${esc(c.id)}">
              <div class="stk-item-main">
                <a href="#/compounds/${esc(c.id)}">${esc(c.name)}</a>
                <span class="tiny dim">${esc(doseLine(c))}</span>
              </div>
              <button type="button" class="icon-btn" data-remove="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">${icon("x", 13)}</button>
            </div>`;
          })
          .join("") || `<div class="tiny dim">Empty.</div>`;
      bindRemove();
    }
    const counter = root.querySelector(".page-head .chip");
    if (counter) counter.textContent = `${ids.length}/${MAX}`;
    bindActions();
  };

  function add(id) {
    const ids = stack();
    if (ids.includes(id)) {
      toast("Already in the stack");
      return;
    }
    if (ids.length >= MAX) {
      toast(`Max ${MAX} compounds`);
      return;
    }
    ids.push(id);
    store.save();
    if (results) results.innerHTML = "";
    if (input) input.value = "";
    repaint();
  }

  function bindRemove() {
    root.querySelectorAll("[data-remove]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-remove");
        const ids = stack();
        const i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1);
        store.save();
        repaint();
      })
    );
  }

  function bindActions() {
    const exp = root.querySelector('[data-act="export"]');
    if (exp)
      exp.addEventListener("click", () => copyText(exportText(stack()), "Stack copied as markdown"));
    const clear = root.querySelector('[data-act="clear"]');
    if (clear)
      clear.addEventListener("click", () => {
        store.data.stack = [];
        store.save();
        repaint();
        toast("Stack cleared");
      });
  }

  let t = 0;
  if (input)
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const list = matches(input.value);
        if (!results) return;
        if (!input.value.trim()) {
          results.innerHTML = "";
          return;
        }
        results.innerHTML = list.length
          ? list
              .map(
                (c) => `<button type="button" class="stk-hit" data-add="${esc(c.id)}">
                  <span class="stk-hit-name">${esc(c.name)}</span>
                  <span class="tiny dim">${esc(c.cls || "")}</span>
                  ${icon("plus", 13)}
                </button>`
              )
              .join("")
          : `<div class="tiny dim" style="padding:6px 2px">Nothing matched.</div>`;
        results.querySelectorAll("[data-add]").forEach((b) =>
          b.addEventListener("click", () => add(b.getAttribute("data-add")))
        );
      }, 90);
    });

  bindRemove();
  bindActions();
}

export default { render, mount };