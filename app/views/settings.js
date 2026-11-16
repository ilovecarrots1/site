/* Settings: appearance, study preferences, data ownership, about */

import { esc, icon, store, toast, fmt, clamp, copyText, levelFor } from "../core.js";
import { COMPOUNDS, getCompound, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS } from "../data/neuro.js";
import { TOTAL_LESSONS, FLASHCARDS } from "../data/learn.js";
import { PAIR_RULES, FLAG_RULES } from "../data/interactions.js";
import { deckStats } from "../srs.js";
import { pageHead, callout, subscribePlate } from "./ui.js";

const ACCENTS = [
  ["violet", "Violet", "#8b7bff"],
  ["amber", "Amber", "#f2b23e"],
  ["teal", "Teal", "#2dd4bf"],
  ["rose", "Rose", "#fb7185"],
  ["green", "Green", "#4ade80"],
  ["blue", "Blue", "#60a5fa"],
  ["cyan", "Cyan", "#22d3ee"],
  ["lime", "Lime", "#a3e635"],
  ["orange", "Orange", "#fb923c"],
  ["magenta", "Magenta", "#e879f9"],
];

const SKINS = [
  ["aurora", "Aurora glass", "Soft light behind frosted cards"],
  ["scope", "Oscilloscope", "Phosphor traces on a gridded scope"],
  ["prism", "Prism", "Spectral gradients, harder edges"],
];

/* ---- accent maths ---------------------------------------------------- */

function hexRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbHex(rgb) {
  return "#" + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}

function luminance(rgb) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/* Pull any hex into a usable accent band so a near-black or neon pick still
   reads against the dark UI. Returns the full token set the CSS expects. */
export function accentTokens(hex) {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const L = luminance(rgb);
  let f = 1;
  if (L < 0.14) f = clamp(Math.sqrt(0.14 / Math.max(L, 0.004)), 1, 3);
  else if (L > 0.6) f = clamp(0.6 / L, 0.45, 1);
  const norm = rgb.map((v) => clamp(v * f, 0, 255));
  const out = {
    accent: rgbHex(norm),
    accent2: rgbHex(norm.map((v) => v * 0.84)),
    ink: luminance(norm) > 0.4 ? "#0b0d10" : "#ffffff",
    soft: `rgba(${Math.round(norm[0])}, ${Math.round(norm[1])}, ${Math.round(norm[2])}, 0.14)`,
    line: `rgba(${Math.round(norm[0])}, ${Math.round(norm[1])}, ${Math.round(norm[2])}, 0.38)`,
    lum: luminance(norm),
  };
  return out;
}

const DENSITIES = [
  ["comfortable", "Comfortable"],
  ["compact", "Compact"],
];

export function applyAppearance() {
  const s = store.data.settings || {};
  const rootEl = document.documentElement;
  const skin = SKINS.some(([k]) => k === s.skin) ? s.skin : "aurora";
  rootEl.setAttribute("data-skin", skin);
  rootEl.setAttribute("data-density", s.density || "comfortable");
  rootEl.setAttribute("data-motion", s.motion === false ? "off" : "on");
  const scale = clamp(Number(s.scale) || 100, 85, 120);
  rootEl.style.setProperty("--scale", scale / 100);

  const custom = accentTokens(s.accentHex);
  if (custom) {
    rootEl.setAttribute("data-accent", "custom");
    rootEl.style.setProperty("--accent", custom.accent);
    rootEl.style.setProperty("--accent-2", custom.accent2);
    rootEl.style.setProperty("--accent-ink", custom.ink);
    rootEl.style.setProperty("--accent-soft", custom.soft);
    rootEl.style.setProperty("--accent-line", custom.line);
  } else {
    rootEl.setAttribute("data-accent", s.accent || "violet");
    ["--accent", "--accent-2", "--accent-ink", "--accent-soft", "--accent-line"].forEach((p) => rootEl.style.removeProperty(p));
  }
}

function settingRow({ title, sub, control }) {
  return `<div class="list-row" style="align-items:flex-start;gap:12px;padding:13px 0">
    <div style="flex:1;min-width:0">
      <div class="title" style="font-size:13.5px">${title}</div>
      ${sub ? `<div class="sub" style="margin-top:2px;line-height:1.5">${sub}</div>` : ""}
    </div>
    <div style="flex:none;display:flex;align-items:center">${control}</div>
  </div>`;
}

function stackHtml() {
  const stack = (store.data.stack || []).map((id) => getCompound(id)).filter(Boolean);
  if (!stack.length) return `<p class="tiny dim">Your stack is empty. Add compounds from any entry page to track what you actually take.</p>`;
  return `<div class="row wrap" style="gap:5px">
    ${stack
      .map(
        (c) => `<span class="chip"><span class="dot" style="background:var(--accent)"></span>${esc(c.name)}
          <button class="x" data-unstack="${esc(c.id)}" aria-label="Remove ${esc(c.name)}" style="margin-left:3px;opacity:.6">${icon("x", 11)}</button>
        </span>`
      )
      .join("")}
    <a class="btn ghost xs" href="#/lab/interactions">${icon("shield", 12)} Check interactions</a>
  </div>`;
}

export const settings = {
  render() {
    const s = store.data;
    const st = s.settings || {};
    const lvl = levelFor(s.profile.xp || 0);
    const cards = deckStats(FLASHCARDS);
    const lessonsDone = Object.values(s.lessons || {}).filter((l) => l.completed).length;
    const saved = (s.saved || []).length;
    const stack = (s.stack || []).length;

    return `
    ${pageHead("Settings", "Everything is stored locally in this browser. No account, no sync, no tracking.", "")}

    <div style="margin-bottom:16px">${subscribePlate()}</div>

    <div class="split">
      <div class="col" style="gap:16px">

        <section class="card">
          <div class="card-head"><h3>Appearance</h3><span class="spacer"></span><span class="tag">applies instantly</span></div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Skin</div>
            <div class="skin-pick" id="set-skin">
              ${SKINS.map(
                ([key, label, sub]) => `<button class="skin-card ${(st.skin || "aurora") === key ? "on" : ""}" data-skin="${key}">
                  <span class="skin-swatch" data-skin-swatch="${key}"></span>
                  <span class="skin-name">${label}</span>
                  <span class="skin-sub tiny dim">${sub}</span>
                </button>`
              ).join("")}
            </div>
          </div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Accent</div>
            <div class="row wrap" style="gap:7px" id="set-accent">
              ${ACCENTS.map(
                ([key, label, hex]) => `<button class="chip chip-btn ${!st.accentHex && (st.accent || "violet") === key ? "on" : ""}" data-accent="${key}">
                  <span class="dot" style="background:${hex}"></span>${label}
                </button>`
              ).join("")}
            </div>
            <div class="row wrap" style="gap:8px;margin-top:9px;align-items:center">
              <span class="hs-swatch" id="set-hex-swatch" style="background:${esc(accentTokens(st.accentHex) ? accentTokens(st.accentHex).accent : "#8b7bff")}"></span>
              <input class="input mono" id="set-hex" type="text" spellcheck="false" autocapitalize="off" autocomplete="off"
                placeholder="#8b7bff" maxlength="7" value="${esc(st.accentHex || "")}" style="width:104px;font-size:12px;text-align:center">
              <button class="btn soft xs" id="set-hex-apply" type="button">Apply</button>
              <button class="btn ghost xs" id="set-hex-clear" type="button">Auto</button>
              <span class="tiny dim" id="set-hex-note">${st.accentHex ? "custom" : "luminance-normalised on apply"}</span>
            </div>
          </div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Density</div>
            <div class="btn-group" id="set-density">
              ${DENSITIES.map(([key, label]) => `<button class="chip chip-btn ${st.density === key ? "on" : ""}" data-density="${key}">${label}</button>`).join("")}
            </div>
          </div>
          ${settingRow({
            title: "Motion",
            sub: "Pulse animations on the brain map and hover transitions. Turn off to save battery.",
            control: `<label class="switch"><input type="checkbox" id="set-motion" ${st.motion !== false ? "checked" : ""}><span></span></label>`,
          })}
          ${settingRow({
            title: "Subscribe plate",
            sub: "The “free access” banner with the Telegram link. You can hide it — nothing in the app is locked either way.",
            control: `<label class="switch"><input type="checkbox" id="set-sub" ${st.subHidden ? "" : "checked"}><span></span></label>`,
          })}
          ${settingRow({
            title: "Text size",
            sub: "Scales every view. Useful at 110–115% on small phones.",
            control: `<div class="row" style="gap:8px"><input class="range" type="range" min="85" max="120" step="5" value="${clamp(Number(st.scale) || 100, 85, 120)}" id="set-scale" style="width:110px"><span class="tiny mono" id="set-scale-val" style="width:38px;text-align:right">${clamp(Number(st.scale) || 100, 85, 120)}%</span></div>`,
          })}
        </section>

        <section class="card">
          <div class="card-head"><h3>Study</h3></div>
          ${settingRow({
            title: "Evidence filter",
            sub: "Hide compounds whose evidence grade is below the threshold you pick. Applies to the compound list.",
            control: `<select class="select" id="set-evidence" style="width:auto">
              ${[
                ["all", "Show all"],
                ["anecdotal", "Anecdotal and up"],
                ["preclinical", "Preclinical and up"],
                ["limited", "Limited and up"],
                ["moderate", "Moderate and up"],
                ["strong", "Strong only"],
              ]
                .map(([v, l]) => `<option value="${v}" ${st.evidence === v ? "selected" : ""}>${l}</option>`)
                .join("")}
            </select>`,
          })}
          ${settingRow({
            title: "Caffeine half-life",
            sub: "CYP1A2 activity varies roughly 2–9 h between people. Changes the default caffeine curve in the lab.",
            control: `<div class="row" style="gap:8px"><input class="range" type="range" min="2" max="9" step="0.5" value="${Number(st.caffeineHalfLife) || 5}" id="set-caf" style="width:110px"><span class="tiny mono" id="set-caf-val" style="width:34px;text-align:right">${Number(st.caffeineHalfLife) || 5}h</span></div>`,
          })}
        </section>

        <section class="card">
          <div class="card-head"><h3>Your stack</h3><span class="spacer"></span><a class="tiny" href="#/compounds">Add compounds</a></div>
          <div class="block">${stackHtml()}</div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Data</h3><span class="spacer"></span><span class="tag">local only</span></div>
          <div class="block stack" style="gap:10px">
            <div class="row wrap" style="gap:8px">
              <button class="btn soft sm" id="set-export">${icon("download", 14)} Export backup</button>
              <button class="btn ghost sm" id="set-import">${icon("upload", 14)} Import</button>
              <button class="btn ghost sm" id="set-copy">${icon("copy", 14)} Copy JSON</button>
            </div>
            <input type="file" id="set-file" accept="application/json,.json" hidden>
            <div>
              <button class="btn danger sm" id="set-reset">${icon("trash", 14)} Reset everything</button>
              <p class="tiny dim" style="margin-top:6px;line-height:1.5">Deletes XP, streak, lesson progress, flashcards schedule, stack, notes and saved items. Cannot be undone.</p>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3>About</h3></div>
          <div class="block stack" style="gap:8px">
            <p class="small muted" style="line-height:1.6">NeuroDifference is a personal study tool: an evidence-graded compound encyclopedia, a transmitter atlas, a pharmacokinetic sandbox and a spaced-repetition course set. It is not a medical device.</p>
            ${callout("danger", "Not medical advice", "Nothing here is a recommendation to take, combine, taper or stop any substance. Dosages are reference figures from the literature, not prescriptions. Talk to a clinician who knows your history.")}
            <div class="row wrap" style="gap:5px;margin-top:2px">
              <span class="chip">v2.3.0</span>
              <span class="chip">${COMPOUNDS.length} compounds</span>
              <span class="chip">${SYSTEMS.length} systems</span>
              <span class="chip">${TOTAL_LESSONS} lessons</span>
              <span class="chip">${FLASHCARDS.length} cards</span>
              <span class="chip">${PAIR_RULES.length + FLAG_RULES.length} interaction rules</span>
            </div>
          </div>
        </section>
      </div>

      <aside class="col sticky-side" style="gap:12px">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:8px">Your progress</div>
          <div class="row between" style="margin-bottom:6px">
            <span style="font-size:13px;font-weight:600">Level ${lvl.level}</span>
            <span class="tiny mono dim">${s.profile.xp || 0} XP</span>
          </div>
          <div class="meter" style="margin-bottom:10px"><i style="width:${Math.round((lvl.into / (lvl.need || 1)) * 100)}%"></i></div>
          <div class="kv"><span>Streak</span><span>${s.profile.streak || 0} day${(s.profile.streak || 0) === 1 ? "" : "s"}</span></div>
          <div class="kv"><span>Lessons done</span><span>${lessonsDone} / ${TOTAL_LESSONS}</span></div>
          <div class="kv"><span>Quiz accuracy</span><span>${s.profile.quizzes ? Math.round((s.profile.correct / s.profile.quizzes) * 100) : 0}%</span></div>
          <div class="kv"><span>Cards due</span><span>${cards.due}</span></div>
          <div class="kv"><span>Saved</span><span>${saved}</span></div>
          <div class="kv"><span>In stack</span><span>${stack}</span></div>
          <div class="kv"><span>Notes</span><span>${(s.notes || []).length}</span></div>
        </div>
        <div class="card tight">
          <div class="eyebrow" style="margin-bottom:7px">Shortcuts</div>
          <div class="stack" style="gap:6px">
            ${[
              ["Search", "Ctrl / ⌘ + K"],
              ["Home", "G then H"],
              ["Compounds", "G then C"],
              ["Brain map", "G then B"],
              ["Lab", "G then L"],
              ["Ask", "G then A"],
            ]
              .map(
                ([label, key]) => `<div class="row between"><span class="tiny muted">${label}</span><kbd class="tiny mono" style="padding:1px 5px;border:1px solid var(--line);border-radius:5px;background:var(--bg-2)">${key}</kbd></div>`
              )
              .join("")}
          </div>
        </div>
      </aside>
    </div>`;
  },

  mount(root, ctx) {
    const rerender = () => ctx.rerender();
    const bump = () => {
      applyAppearance();
      window.dispatchEvent(new CustomEvent("nd:appearance"));
    };

    root.querySelector("#set-skin")?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-skin]");
      if (!b) return;
      store.set("settings.skin", b.dataset.skin);
      bump();
      root.querySelectorAll("#set-skin [data-skin]").forEach((el) => el.classList.toggle("on", el === b));
    });

    root.querySelector("#set-accent")?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-accent]");
      if (!b) return;
      store.set("settings.accent", b.dataset.accent);
      store.set("settings.accentHex", "");
      bump();
      root.querySelectorAll("#set-accent [data-accent]").forEach((el) => el.classList.toggle("on", el === b));
      const hex = root.querySelector("#set-hex");
      if (hex) hex.value = "";
      const sw = root.querySelector("#set-hex-swatch");
      if (sw) sw.style.background = ACCENTS.find(([k]) => k === b.dataset.accent)?.[2] || "#8b7bff";
      const note = root.querySelector("#set-hex-note");
      if (note) note.textContent = "preset";
    });

    const hexApply = () => {
      const input = root.querySelector("#set-hex");
      if (!input) return;
      const t = accentTokens(input.value);
      if (!t) {
        toast("Use a hex colour like #8b7bff", "info");
        return;
      }
      store.set("settings.accentHex", t.accent);
      store.set("settings.accent", "custom");
      input.value = t.accent;
      bump();
      root.querySelectorAll("#set-accent [data-accent]").forEach((el) => el.classList.remove("on"));
      const sw = root.querySelector("#set-hex-swatch");
      if (sw) sw.style.background = t.accent;
      const note = root.querySelector("#set-hex-note");
      if (note) note.textContent = t.accent + " · L " + Math.round(t.lum * 100) + "%";
    };
    root.querySelector("#set-hex-apply")?.addEventListener("click", hexApply);
    root.querySelector("#set-hex")?.addEventListener("change", hexApply);

    root.querySelector("#set-hex-clear")?.addEventListener("click", () => {
      store.set("settings.accentHex", "");
      if (store.data.settings.accent === "custom") store.set("settings.accent", "violet");
      const input = root.querySelector("#set-hex");
      if (input) input.value = "";
      bump();
      root.querySelectorAll("#set-accent [data-accent]").forEach((el) =>
        el.classList.toggle("on", el.dataset.accent === (store.data.settings.accent || "violet"))
      );
      const sw = root.querySelector("#set-hex-swatch");
      if (sw) sw.style.background = "#8b7bff";
      const note = root.querySelector("#set-hex-note");
      if (note) note.textContent = "preset";
    });

    root.querySelector("#set-density")?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-density]");
      if (!b) return;
      store.set("settings.density", b.dataset.density);
      bump();
      root.querySelectorAll("#set-density [data-density]").forEach((el) => el.classList.toggle("on", el === b));
    });

    root.querySelector("#set-motion")?.addEventListener("change", (ev) => {
      store.set("settings.motion", ev.target.checked);
      bump();
    });

    root.querySelector("#set-sub")?.addEventListener("change", (ev) => {
      store.set("settings.subHidden", !ev.target.checked);
      toast(ev.target.checked ? "Subscribe plate is back" : "Subscribe plate hidden", "info");
      rerender();
    });

    const scale = root.querySelector("#set-scale");
    scale?.addEventListener("input", () => {
      const v = clamp(Number(scale.value) || 100, 85, 120);
      const out = root.querySelector("#set-scale-val");
      if (out) out.textContent = `${v}%`;
      store.set("settings.scale", v);
      bump();
    });

    root.querySelector("#set-evidence")?.addEventListener("change", (ev) => {
      store.set("settings.evidence", ev.target.value);
      toast("Evidence filter updated", "info");
    });

    const caf = root.querySelector("#set-caf");
    caf?.addEventListener("input", () => {
      const v = Number(caf.value) || 5;
      const out = root.querySelector("#set-caf-val");
      if (out) out.textContent = `${v}h`;
      store.set("settings.caffeineHalfLife", v);
    });

    root.querySelector("#set-export")?.addEventListener("click", () => {
      const blob = new Blob([store.export()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurodifference-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast("Backup downloaded", "success");
    });

    root.querySelector("#set-copy")?.addEventListener("click", () => copyText(store.export(), "State JSON copied"));

    const file = root.querySelector("#set-file");
    root.querySelector("#set-import")?.addEventListener("click", () => file?.click());
    file?.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        if (!confirm("Replace all current data with this backup?")) return;
        store.import(text);
        applyAppearance();
        window.dispatchEvent(new CustomEvent("nd:appearance"));
        toast("Backup restored", "success");
        rerender();
      } catch (err) {
        toast(`Import failed: ${err.message}`, "danger");
      } finally {
        // Always clear, or picking the same file again fires no change event.
        file.value = "";
      }
    });

    root.querySelector("#set-reset")?.addEventListener("click", () => {
      if (!confirm("Delete all progress, notes, stack and preferences on this device?")) return;
      if (!confirm("Last check — this cannot be undone. Reset?")) return;
      store.reset();
      applyAppearance();
      window.dispatchEvent(new CustomEvent("nd:appearance"));
      toast("Everything reset", "info");
      location.hash = "#/";
      rerender();
    });

    root.querySelectorAll("[data-unstack]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.unstack;
        store.update((s) => {
          s.stack = (s.stack || []).filter((x) => x !== id);
        });
        const c = COMPOUND_BY_ID.get(id);
        toast(`${c ? c.name : "Item"} removed from stack`, "info");
        rerender();
      })
    );
  },
};