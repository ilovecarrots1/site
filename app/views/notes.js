/* Notebook: private notes attached to compounds, tags and questions */

import { esc, icon, store, toast, uid, fmt } from "../core.js";
import { COMPOUND_BY_ID, getCompound, resolveCompound, searchCompounds } from "../data/compounds.js";
import { pageHead, emptyState, callout, classColor } from "./ui.js";

const state = { q: "", tag: "" };

function notes() {
  return (store.data.notes || []).slice().sort((a, b) => String(b.updatedAt || b.at || "").localeCompare(String(a.updatedAt || a.at || "")));
}

function allTags() {
  return Array.from(new Set(notes().flatMap((n) => n.tags || []))).sort();
}

function filtered() {
  let list = notes();
  if (state.tag) list = list.filter((n) => (n.tags || []).includes(state.tag));
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter((n) => `${n.title} ${n.body} ${(n.tags || []).join(" ")}`.toLowerCase().includes(q));
  return list;
}

function noteCard(n) {
  const c = n.compoundId ? COMPOUND_BY_ID.get(n.compoundId) : null;
  const when = n.updatedAt || n.at;
  return `<article class="card" data-note="${esc(n.id)}">
    <div class="row between" style="align-items:flex-start;gap:8px;margin-bottom:5px">
      <h3 style="font-size:14.5px;line-height:1.3">${esc(n.title || "Untitled")}</h3>
      <div class="row" style="gap:2px;flex:none">
        <button class="icon-btn" data-edit="${esc(n.id)}" aria-label="Edit note" style="width:32px;height:32px">${icon("edit", 15)}</button>
        <button class="icon-btn" data-del="${esc(n.id)}" aria-label="Delete note" style="width:32px;height:32px">${icon("trash", 15)}</button>
      </div>
    </div>
    ${n.body ? `<p class="small muted" style="line-height:1.55;white-space:pre-wrap;max-height:9.5em;overflow:hidden">${esc(n.body)}</p>` : ""}
    <div class="row wrap" style="gap:5px;margin-top:9px">
      ${c ? `<a class="chip chip-btn" href="#/compounds/${esc(c.id)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.name)}</a>` : ""}
      ${(n.tags || []).map((t) => `<button class="chip chip-btn" data-tagjump="${esc(t)}">#${esc(t)}</button>`).join("")}
      ${when ? `<span class="tag" style="margin-left:auto">${esc(fmt.relTime(when))}</span>` : ""}
    </div>
  </article>`;
}

function listHtml() {
  const list = filtered();
  if (!list.length) {
    const empty = notes().length
      ? emptyState("search", "No notes match", "Try a different search or clear the tag filter.", `<button class="btn ghost sm" data-act="clear-filter">${icon("refresh", 14)} Clear filters</button>`)
      : emptyState("edit", "No notes yet", "Write down the mechanism you keep forgetting, a question for your doctor, or a paper you want to re-read.", `<button class="btn soft sm" data-act="new">${icon("plus", 14)} New note</button>`);
    return `<div class="card">${empty}</div>`;
  }
  return `<div class="grid grid-2" style="gap:10px">${list.map(noteCard).join("")}</div>`;
}

function sheetHtml(note) {
  const n = note || { id: "", title: "", body: "", tags: [], compoundId: "" };
  return `<div class="sheet-host" id="note-sheet">
    <div class="sheet-scrim" data-close="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Note editor">
      <div class="sheet-head">
        <h3>${n.id ? "Edit note" : "New note"}</h3>
        <span class="spacer"></span>
        <button class="icon-btn" data-close="1" aria-label="Close">${icon("x", 18)}</button>
      </div>
      <form id="note-form" class="stack" style="gap:12px">
        <input type="hidden" name="id" value="${esc(n.id)}">
        <label class="field">Title
          <input class="input" name="title" value="${esc(n.title)}" placeholder="e.g. Why SSRIs take weeks" required maxlength="120">
        </label>
        <label class="field">Note
          <textarea class="textarea" name="body" placeholder="Write it in your own words — that is the part that sticks.">${esc(n.body)}</textarea>
        </label>
        <label class="field">Attach to compound (optional)
          <input class="input" name="compound" list="note-compounds" value="${esc(n.compoundId ? COMPOUND_BY_ID.get(n.compoundId)?.name || "" : "")}" placeholder="Start typing a name…">
        </label>
        <datalist id="note-compounds">
          ${searchCompounds("").slice(0, 80).map((c) => `<option value="${esc(c.name)}"></option>`).join("")}
        </datalist>
        <label class="field">Tags (comma separated)
          <input class="input" name="tags" value="${esc((n.tags || []).join(", "))}" placeholder="mechanism, question, taper">
        </label>
        <div class="row" style="gap:8px;margin-top:2px">
          <button class="btn ghost" type="button" data-close="1">Cancel</button>
          <button class="btn primary" type="submit" style="flex:1">${icon("check", 15)} Save note</button>
        </div>
      </form>
    </div>
  </div>`;
}

function openSheet(note, rerender) {
  document.querySelectorAll("#note-sheet").forEach((el) => el.remove());
  document.body.insertAdjacentHTML("beforeend", sheetHtml(note));
  const host = document.querySelector("#note-sheet");
  const form = host.querySelector("#note-form");
  host.querySelector(".sheet-scrim").addEventListener("click", () => host.remove());
  host.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => host.remove()));
  form.querySelector('[name="title"]').focus();

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    const body = String(fd.get("body") || "").trim();
    const tags = String(fd.get("tags") || "")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean);
    const comp = resolveCompound(String(fd.get("compound") || "").trim());
    const id = String(fd.get("id") || "");

    store.update((s) => {
      if (!s.notes) s.notes = [];
      if (id) {
        const ex = s.notes.find((x) => x.id === id);
        if (ex) {
          ex.title = title;
          ex.body = body;
          ex.tags = tags;
          ex.compoundId = comp ? comp.id : "";
          ex.updatedAt = new Date().toISOString();
        }
      } else {
        s.notes.unshift({
          id: uid("n"),
          title,
          body,
          tags,
          compoundId: comp ? comp.id : "",
          at: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    host.remove();
    toast(id ? "Note updated" : "Note saved", "success");
    rerender();
  });
}

export const notesView = {
  render() {
    const total = notes().length;
    const tags = allTags();
    return `
    ${pageHead(
      "Notebook",
      "Private notes tied to compounds. Stored on this device only — nothing leaves your browser.",
      `<button class="btn primary sm" data-act="new">${icon("plus", 15)} New note</button>`
    )}

    <div class="row wrap" style="gap:8px;margin-bottom:12px">
      <div class="search-input" style="flex:1;min-width:200px">
        ${icon("search", 16)}
        <input class="input" id="note-q" type="search" placeholder="Search notes…" value="${esc(state.q)}">
      </div>
      <span class="tiny dim">${total} note${total === 1 ? "" : "s"}</span>
    </div>

    ${
      tags.length
        ? `<div class="row wrap" style="gap:5px;margin-bottom:14px" id="note-tags">
            <button class="chip chip-btn ${!state.tag ? "on" : ""}" data-tag="">All</button>
            ${tags.map((t) => `<button class="chip chip-btn ${state.tag === t ? "on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`).join("")}
          </div>`
        : ""
    }

    <div id="note-list">${listHtml()}</div>

    ${total ? `<div style="margin-top:22px">${callout("info", "Export your notes", "Settings → Data → Export writes the whole state, notes included, to a JSON file you can keep.")}</div>` : ""}`;
  },

  mount(root, ctx) {
    const list = root.querySelector("#note-list");
    const q = root.querySelector("#note-q");

    const repaint = () => {
      list.innerHTML = listHtml();
      const tagBar = root.querySelector("#note-tags");
      if (tagBar) {
        tagBar.innerHTML = `<button class="chip chip-btn ${!state.tag ? "on" : ""}" data-tag="">All</button>${allTags()
          .map((t) => `<button class="chip chip-btn ${state.tag === t ? "on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`)
          .join("")}`;
      }
    };

    q?.addEventListener("input", () => {
      state.q = q.value;
      repaint();
    });

    root.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-act="new"]')) {
        openSheet(null, repaint);
        return;
      }
      if (ev.target.closest('[data-act="clear-filter"]')) {
        state.q = "";
        state.tag = "";
        if (q) q.value = "";
        repaint();
        return;
      }
      const tag = ev.target.closest("[data-tag]");
      if (tag) {
        state.tag = tag.dataset.tag;
        repaint();
        return;
      }
      const jump = ev.target.closest("[data-tagjump]");
      if (jump) {
        state.tag = jump.dataset.tagjump;
        repaint();
        return;
      }
      const edit = ev.target.closest("[data-edit]");
      if (edit) {
        const n = (store.data.notes || []).find((x) => x.id === edit.dataset.edit);
        if (n) openSheet(n, repaint);
        return;
      }
      const del = ev.target.closest("[data-del]");
      if (del) {
        const n = (store.data.notes || []).find((x) => x.id === del.dataset.del);
        if (!n) return;
        if (!confirm(`Delete “${n.title || "Untitled"}”?`)) return;
        store.update((s) => {
          s.notes = s.notes.filter((x) => x.id !== n.id);
        });
        toast("Note deleted", "info");
        repaint();
        ctx.refreshCounts?.();
      }
    });
  },
};