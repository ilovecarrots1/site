/* Compare — put two or three compounds next to each other on the facts that matter.
 *
 * One DOM, two layouts: a matrix on desktop (label column + one column per
 * compound) and stacked attribute blocks on a phone, where every value is
 * prefixed with the compound it belongs to.
 */

import { esc, icon, fmt, copyText, evidenceChip, toast } from "../core.js";
import { COMPOUNDS, getCompound } from "../data/compounds.js";
import { pageHead, classColor, backLink, callout } from "./ui.js";

const MAX = 3;

const PRESETS = [
  ["caffeine", "modafinil"],
  ["alprazolam", "diazepam"],
  ["sertraline", "fluoxetine"],
  ["melatonin", "ramelteon"],
  ["methylphenidate", "lisdexamfetamine"],
];

const state = { ids: ["alprazolam", "diazepam"] };

let appliedQuery = "";

function clean(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    const c = getCompound(id);
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c.id);
    if (out.length >= MAX) break;
  }
  return out;
}

function pickers(list) {
  // only sugar — the data lives in `state`
  return list.map((id) => getCompound(id)).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Rows                                                               */
/* ------------------------------------------------------------------ */

const hl = (c) => (Number(c.pk?.halfLife) > 0 ? fmt.duration(Number(c.pk.halfLife)) : "—");
const val = (n) => (Number(n) > 0 ? fmt.duration(Number(n)) : "—");

const ROWS = [
  {
    label: "Class",
    get: (c) => `<span class="chip" style="border-color:transparent;background:${classColor(c.cls)}1f;color:${classColor(c.cls)}">${esc(c.cls)}</span>
      ${c.subcls ? `<div class="tiny dim" style="margin-top:5px">${esc(c.subcls)}</div>` : ""}`,
  },
  { label: "Status", get: (c) => `<span class="small">${esc(c.status || "—")}</span>` },
  { label: "Evidence", get: (c) => evidenceChip(c.evidence) },
  { label: "Half-life", mono: true, get: (c) => hl(c) },
  {
    label: "Peak / onset",
    mono: true,
    get: (c) => `${val(c.pk?.tmax)} <span class="dim">peak</span> · ${val(c.pk?.onset)} <span class="dim">onset</span>`,
  },
  { label: "Duration", mono: true, get: (c) => val(c.pk?.duration) },
  { label: "Metabolism", get: (c) => `<span class="small muted">${esc(c.pk?.metabolism || "—")}</span>` },
  {
    label: "Cleanance route",
    get: (c) => `<span class="small muted">${esc(c.pk?.excretion || "—")}</span>`,
  },
  {
    label: "Typical dose",
    get: (c) => {
      const doses = (c.doses || []).filter((d) => d && d.low);
      if (!doses.length) return "—";
      return doses
        .slice(0, 2)
        .map((d) => `<div class="small mono">${esc(`${d.low}–${d.high} ${d.unit}`)} <span class="dim">${esc(d.route)}</span></div>`)
        .join("");
    },
  },
  {
    label: "Mechanism",
    get: (c) => {
      const moa = (c.moa || []).slice(0, 3);
      if (!moa.length) return "—";
      return `<ul class="cmp-list">${moa.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
    },
  },
  {
    label: "Targets",
    get: (c) => {
      const t = (c.targets || []).slice(0, 4);
      if (!t.length) return "—";
      return `<div class="stack-3">${t
        .map(
          (x) =>
            `<div class="small"><span class="mono" style="font-size:11.5px">${esc(x.name)}</span> <span class="dim">${esc(x.action)}</span></div>`
        )
        .join("")}</div>`;
    },
  },
  {
    label: "Upside",
    get: (c) => {
      const good = (c.effects?.good || []).slice(0, 3);
      if (!good.length) return "—";
      return `<ul class="cmp-list good">${good.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>`;
    },
  },
  {
    label: "Downside",
    get: (c) => {
      const bad = (c.effects?.bad || []).slice(0, 3);
      if (!bad.length) return "—";
      return `<ul class="cmp-list bad">${bad.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
    },
  },
  {
    label: "Flags",
    get: (c) => {
      const flags = (c.flags || []).slice(0, 6);
      if (!flags.length) return "—";
      return `<div class="row wrap" style="gap:4px">${flags.map((f) => `<span class="tag">#${esc(f)}</span>`).join("")}</div>`;
    },
  },
  { label: "Summary", wide: true, get: (c) => `<span class="small muted">${esc(c.summary || "—")}</span>` },
];

function headHtml(list) {
  return `<div class="cmp-row cmp-head">
    <div class="cmp-label"></div>
    ${list
      .map(
        (c) => `<div class="cmp-cell">
          <a href="#/compounds/${esc(c.id)}" style="font-weight:650;color:var(--text)">${esc(c.name)}</a>
          <div class="tiny dim" style="margin-top:2px">${esc((c.aliases || [])[0] || c.cls)}</div>
        </div>`
      )
      .join("")}
  </div>`;
}

function rowsHtml(list) {
  return ROWS.map((row) => {
    if (row.wide) {
      return `<div class="cmp-row cmp-wide">
        <div class="cmp-label">${esc(row.label)}</div>
        <div class="cmp-cell stack" style="gap:8px">${list
          .map((c) => `<div><span class="cmp-who">${esc(c.name)}</span>${row.get(c)}</div>`)
          .join("")}</div>
      </div>`;
    }
    return `<div class="cmp-row">
      <div class="cmp-label">${esc(row.label)}</div>
      ${list
        .map(
          (c) =>
            `<div class="cmp-cell ${row.mono ? "mono" : ""}"><span class="cmp-who">${esc(c.name)}</span>${row.get(c)}</div>`
        )
        .join("")}
    </div>`;
  }).join("");
}

function compareUrl(ids) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/compare?ids=${ids.join(",")}`;
}

/* ------------------------------------------------------------------ */
/* View                                                               */
/* ------------------------------------------------------------------ */

export const compare = {
  render(ctx) {
    const fromQuery = String(ctx.query.ids || "").toLowerCase();
    if (fromQuery && fromQuery !== appliedQuery) {
      appliedQuery = fromQuery;
      const next = clean(fromQuery.split(","));
      if (next.length >= 2) state.ids = next;
    }

    const list = pickers(state.ids);

    return `${pageHead(
      "Compare",
      "The same set of facts, side by side — kinetics, mechanism, dose and the parts that bite.",
      `<button class="btn ghost sm" data-act="link">${icon("link", 14)} Copy link</button>`
    )}

    ${backLink("#/compounds", "Compounds")}

    <div class="card" style="margin-bottom:14px">
      <div class="stack" style="gap:10px">
        ${list
          .map(
            (c, i) => `<div class="row" style="gap:8px">
              <select class="select" data-slot="${i}" style="flex:1;min-width:0">
                ${COMPOUNDS.map((x) => `<option value="${esc(x.id)}" ${x.id === c.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}
              </select>
              <a class="icon-btn" href="#/compounds/${esc(c.id)}" aria-label="Open monologue" style="flex:none">${icon("file", 16)}</a>
              ${
                list.length > 2
                  ? `<button class="icon-btn" data-remove="${i}" aria-label="Remove ${esc(c.name)}" style="flex:none">${icon("x", 16)}</button>`
                  : ""
              }
            </div>`
          )
          .join("")}
        ${
          list.length < MAX
            ? `<button class="btn ghost sm block" data-act="add">${icon("plus", 14)} Add a third compound</button>`
            : ""
        }
        <div class="row wrap" style="gap:6px;padding-top:2px">
          ${PRESETS.filter((p) => p.every((id) => getCompound(id)))
            .map((p) => {
              const a = getCompound(p[0]);
              const b = getCompound(p[1]);
              return `<button class="chip chip-btn" data-preset="${esc(p.join(","))}">${esc(a.name)} × ${esc(b.name)}</button>`;
            })
            .join("")}
        </div>
      </div>
    </div>

    ${
      list.length < 2
        ? callout("info", "Pick two compounds", "Choose a second compound above — the table fills in as soon as there are two.")
        : `<div class="cmp" style="--cmp-n:${list.length}">${headHtml(list)}${rowsHtml(list)}</div>`
    }

    <div style="margin-top:14px">
      ${callout(
        "info",
        "Read across, not down",
        "Half-life decides how long a dose lasts and how long a taper takes; onset and peak decide whether it feels like something at all. Two drugs with the same class can differ on every row."
      )}
    </div>`;
  },

  mount(root, ctx) {
    function syncUrl() {
      const base = `#/compare?ids=${state.ids.join(",")}`;
      try {
        history.replaceState(null, "", `${location.pathname}${location.search}${base}`);
      } catch (err) {
        /* replaceState can throw in sandboxed frames — the view still works */
      }
    }

    function rerender() {
      syncUrl();
      ctx.rerender?.();
    }

    root.querySelectorAll("[data-slot]").forEach((sel) => {
      sel.addEventListener("change", (ev) => {
        const i = Number(sel.dataset.slot);
        const id = ev.target.value;
        // if the compound is already in another slot, swap instead of duplicating
        const dup = state.ids.indexOf(id);
        if (dup !== -1 && dup !== i) {
          const tmp = state.ids[i];
          state.ids[i] = id;
          state.ids[dup] = tmp;
        } else {
          state.ids[i] = id;
        }
        rerender();
      });
    });

    root.addEventListener("click", (ev) => {
      const remove = ev.target.closest("[data-remove]");
      if (remove) {
        state.ids.splice(Number(remove.dataset.remove), 1);
        rerender();
        return;
      }

      const preset = ev.target.closest("[data-preset]");
      if (preset) {
        state.ids = clean(preset.dataset.preset.split(","));
        rerender();
        return;
      }

      const act = ev.target.closest("[data-act]")?.dataset.act;
      if (act === "add") {
        const spare = COMPOUNDS.find((c) => !state.ids.includes(c.id));
        if (spare) state.ids.push(spare.id);
        rerender();
        return;
      }
      if (act === "link") {
        copyText(compareUrl(state.ids), "Comparison link copied");
        return;
      }
      if (act === "share") {
        toast("Link copied", "ok");
      }
    });
  },
};

export default compare;