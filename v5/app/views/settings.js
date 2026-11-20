/* Settings: appearance, study preferences, data ownership, about */

import { esc, icon, store, toast, fmt, clamp, copyText, levelFor } from "../core.js";
import { COMPOUNDS, getCompound, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS } from "../data/neuro.js";
import { TOTAL_LESSONS, FLASHCARDS } from "../data/learn.js";
import { PAIR_RULES, FLAG_RULES } from "../data/interactions.js";
import { deckStats } from "../srs.js";
import { pubmedKey, setPubmedKey } from "../lib/pubmed.js";
import { pageHead, callout, subscribePlate } from "./ui.js";
import { LANGS, setLang } from "../lib/i18n.js";

const ACCENTS = [
  ["violet", "Фиолетовый", "#8b7bff"],
  ["amber", "Янтарный", "#f2b23e"],
  ["teal", "Бирюзовый", "#2dd4bf"],
  ["rose", "Розовый", "#fb7185"],
  ["green", "Зелёный", "#4ade80"],
  ["blue", "Синий", "#60a5fa"],
  ["cyan", "Циан", "#22d3ee"],
  ["lime", "Лаймовый", "#a3e635"],
  ["orange", "Оранжевый", "#fb923c"],
  ["magenta", "Маджента", "#e879f9"],
];

const SKINS = [
  ["aurora", "Аврора", "Мягкий свет за матовыми карточками"],
  ["scope", "Осциллограф", "Фосфорные трассы на сетке"],
  ["prism", "Призма", "Спектральные градиенты, жёсткие края"],
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
  ["comfortable", "Просторная"],
  ["compact", "Компактная"],
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
  if (!stack.length) return `<p class="tiny dim">Стек пуст. Добавляй препараты со страниц записей, чтобы отслеживать, что реально принимаешь.</p>`;
  return `<div class="row wrap" style="gap:5px">
    ${stack
      .map(
        (c) => `<span class="chip"><span class="dot" style="background:var(--accent)"></span>${esc(c.name)}
          <button class="x" data-unstack="${esc(c.id)}" aria-label="Убрать ${esc(c.name)}" style="margin-left:3px;opacity:.6">${icon("x", 11)}</button>
        </span>`
      )
      .join("")}
    <a class="btn ghost xs" href="#/lab/interactions">${icon("shield", 12)} Проверить взаимодействия</a>
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
    ${pageHead("Настройки", "Всё хранится локально в этом браузере. Без аккаунта, без синхронизации, без слежки.", "")}

    <div style="margin-bottom:16px">${subscribePlate()}</div>

    <div class="split">
      <div class="col" style="gap:16px">

        <section class="card">
          <div class="card-head"><h3>Внешний вид</h3><span class="spacer"></span><span class="tag">применяется сразу</span></div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Язык / Language</div>
            <div class="btn-group" id="set-lang">
              ${LANGS.map(([key, label]) => `<button class="chip chip-btn ${(st.lang || "ru") === key ? "on" : ""}" data-lang="${key}">${label}</button>`).join("")}
            </div>
          </div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Скин</div>
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
            <div class="eyebrow" style="margin-bottom:7px">Акцент</div>
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
              <button class="btn soft xs" id="set-hex-apply" type="button">Применить</button>
              <button class="btn ghost xs" id="set-hex-clear" type="button">Авто</button>
              <span class="tiny dim" id="set-hex-note">${st.accentHex ? "свой" : "яркость нормализуется при применении"}</span>
            </div>
          </div>
          <div class="block">
            <div class="eyebrow" style="margin-bottom:7px">Плотность</div>
            <div class="btn-group" id="set-density">
              ${DENSITIES.map(([key, label]) => `<button class="chip chip-btn ${st.density === key ? "on" : ""}" data-density="${key}">${label}</button>`).join("")}
            </div>
          </div>
          ${settingRow({
            title: "Анимации",
            sub: "Пульсация на карте мозга и hover-переходы. Выключи, чтобы экономить батарею.",
            control: `<label class="switch"><input type="checkbox" id="set-motion" ${st.motion !== false ? "checked" : ""}><span></span></label>`,
          })}
          ${settingRow({
            title: "Плашка подписки",
            sub: "Баннер «бесплатный доступ» со ссылкой на Telegram. Можно скрыть — ничего в приложении от этого не закроется.",
            control: `<label class="switch"><input type="checkbox" id="set-sub" ${st.subHidden ? "" : "checked"}><span></span></label>`,
          })}
          ${settingRow({
            title: "Размер текста",
            sub: "Масштабирует все экраны. На маленьких телефонах удобно 110–115%.",
            control: `<div class="row" style="gap:8px"><input class="range" type="range" min="85" max="120" step="5" value="${clamp(Number(st.scale) || 100, 85, 120)}" id="set-scale" style="width:110px"><span class="tiny mono" id="set-scale-val" style="width:38px;text-align:right">${clamp(Number(st.scale) || 100, 85, 120)}%</span></div>`,
          })}
        </section>

        <section class="card">
          <div class="card-head"><h3>Обучение</h3></div>
          ${settingRow({
            title: "Фильтр доказательности",
            sub: "Скрывать препараты ниже выбранного порога доказательности. Применяется к списку препаратов.",
            control: `<select class="select" id="set-evidence" style="width:auto">
              ${[
                ["all", "Показывать все"],
                ["anecdotal", "От анекдотических"],
                ["preclinical", "От доклинических"],
                ["limited", "От ограниченных"],
                ["moderate", "От умеренных"],
                ["strong", "Только сильные"],
              ]
                .map(([v, l]) => `<option value="${v}" ${st.evidence === v ? "selected" : ""}>${l}</option>`)
                .join("")}
            </select>`,
          })}
          ${settingRow({
            title: "Полувыведение кофеина",
            sub: "Активность CYP1A2 у людей варьирует примерно 2–9 ч. Меняет кривую кофеина по умолчанию в лаборатории.",
            control: `<div class="row" style="gap:8px"><input class="range" type="range" min="2" max="9" step="0.5" value="${Number(st.caffeineHalfLife) || 5}" id="set-caf" style="width:110px"><span class="tiny mono" id="set-caf-val" style="width:34px;text-align:right">${Number(st.caffeineHalfLife) || 5} ч</span></div>`,
          })}
        </section>

        <section class="card">
          <div class="card-head"><h3>Твой стек</h3><span class="spacer"></span><a class="tiny" href="#/compounds">Добавить препараты</a></div>
          <div class="block">${stackHtml()}</div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Данные</h3><span class="spacer"></span><span class="tag">только локально</span></div>
          <div class="block stack" style="gap:10px">
            <div class="row wrap" style="gap:8px">
              <button class="btn soft sm" id="set-export">${icon("download", 14)} Экспорт бэкапа</button>
              <button class="btn ghost sm" id="set-import">${icon("upload", 14)} Импорт</button>
              <button class="btn ghost sm" id="set-copy">${icon("copy", 14)} Копировать JSON</button>
            </div>
            <input type="file" id="set-file" accept="application/json,.json" hidden>
            <div>
              <button class="btn danger sm" id="set-reset">${icon("trash", 14)} Сбросить всё</button>
              <p class="tiny dim" style="margin-top:6px;line-height:1.5">Удаляет XP, серию, прогресс уроков, расписание карточек, стек, заметки и сохранённое. Отменить нельзя.</p>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Исследования</h3><span class="spacer"></span><span class="tag">опционально</span></div>
          ${settingRow({
            title: "PubMed API key",
            sub: "Свой ключ NCBI E-utilities поднимает живой поиск с 3 до 10 запросов в секунду. Хранится только на этом устройстве и отправляется только в NCBI. Без ключа всё работает.",
            control: `<div class=\"row\" style=\"gap:6px\"><input class=\"input mono\" id=\"set-pubmed-key\" type=\"password\" spellcheck=\"false\" autocomplete=\"off\" placeholder=\"Ключ NCBI (опционально)\" value=\"${esc(pubmedKey())}\" style=\"width:190px\"><button class=\"btn soft sm\" id=\"set-pubmed-save\">Сохранить</button></div>`,
          })}
        </section>

        <section class="card">
          <div class="card-head"><h3>О приложении</h3></div>
          <div class="block stack" style="gap:8px">
            <p class="small muted" style="line-height:1.6">NeuroDifference — личный учебный инструмент: энциклопедия препаратов с градацией доказательности, атлас нейромедиаторов, песочница фармакокинетики и курсы с интервальным повторением. Это не медицинское изделие.</p>
            ${callout("danger", "Не медицинская рекомендация", "Ничто здесь не является рекомендацией принимать, комбинировать, снижать или отменять какое-либо вещество. Дозировки — справочные величины из литературы, не назначения. Поговори с врачом, который знает твою историю.")}
            <div class="row wrap" style="gap:5px;margin-top:2px">
              <span class="chip">v4.4.1</span>
              <span class="chip">${COMPOUNDS.length} препаратов</span>
              <span class="chip">${SYSTEMS.length} систем</span>
              <span class="chip">${TOTAL_LESSONS} уроков</span>
              <span class="chip">${FLASHCARDS.length} карточек</span>
              <span class="chip">${PAIR_RULES.length + FLAG_RULES.length} правил взаимодействий</span>
            </div>
          </div>
        </section>
      </div>

      <aside class="col sticky-side" style="gap:12px">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:8px">Твой прогресс</div>
          <div class="row between" style="margin-bottom:6px">
            <span style="font-size:13px;font-weight:600">Уровень ${lvl.level}</span>
            <span class="tiny mono dim">${s.profile.xp || 0} XP</span>
          </div>
          <div class="meter" style="margin-bottom:10px"><i style="width:${Math.round((lvl.into / (lvl.need || 1)) * 100)}%"></i></div>
          <div class="kv"><span>Серия</span><span>${s.profile.streak || 0} дн.</span></div>
          <div class="kv"><span>Уроков пройдено</span><span>${lessonsDone} / ${TOTAL_LESSONS}</span></div>
          <div class="kv"><span>Точность квизов</span><span>${s.profile.quizzes ? Math.round((s.profile.correct / s.profile.quizzes) * 100) : 0}%</span></div>
          <div class="kv"><span>Карточек к повторению</span><span>${cards.due}</span></div>
          <div class="kv"><span>Сохранено</span><span>${saved}</span></div>
          <div class="kv"><span>В стеке</span><span>${stack}</span></div>
          <div class="kv"><span>Заметки</span><span>${(s.notes || []).length}</span></div>
        </div>
        <div class="card tight">
          <div class="eyebrow" style="margin-bottom:7px">Горячие клавиши</div>
          <div class="stack" style="gap:6px">
            ${[
              ["Поиск", "Ctrl / ⌘ + K"],
              ["Главная", "G, затем H"],
              ["Препараты", "G, затем C"],
              ["Карта мозга", "G, затем B"],
              ["Лаборатория", "G, затем L"],
              ["Спроси", "G, затем A"],
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

    root.querySelector("#set-pubmed-save")?.addEventListener("click", () => {
      const input = root.querySelector("#set-pubmed-key");
      setPubmedKey(input ? input.value : "");
      toast(pubmedKey() ? "Ключ PubMed сохранён на этом устройстве" : "Ключ PubMed удалён — анонимный лимит");
    });
    const bump = () => {
      applyAppearance();
      window.dispatchEvent(new CustomEvent("nd:appearance"));
    };

    root.querySelector("#set-lang")?.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-lang]");
      if (!b) return;
      const l = b.dataset.lang;
      store.set("settings.lang", l);
      setLang(l);
      window.dispatchEvent(new CustomEvent("nd:lang"));
    });

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
      if (note) note.textContent = "пресет";
    });

    const hexApply = () => {
      const input = root.querySelector("#set-hex");
      if (!input) return;
      const t = accentTokens(input.value);
      if (!t) {
        toast("Введи hex-цвет, например #8b7bff", "info");
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
      if (note) note.textContent = "пресет";
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
      toast(ev.target.checked ? "Плашка подписки возвращена" : "Плашка подписки скрыта", "info");
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
      toast("Фильтр доказательности обновлён", "info");
    });

    const caf = root.querySelector("#set-caf");
    caf?.addEventListener("input", () => {
      const v = Number(caf.value) || 5;
      const out = root.querySelector("#set-caf-val");
      if (out) out.textContent = `${v} ч`;
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
      toast("Бэкап скачан", "success");
    });

    root.querySelector("#set-copy")?.addEventListener("click", () => copyText(store.export(), "JSON состояния скопирован"));

    const file = root.querySelector("#set-file");
    root.querySelector("#set-import")?.addEventListener("click", () => file?.click());
    file?.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        if (!confirm("Заменить все текущие данные этим бэкапом?")) return;
        store.import(text);
        applyAppearance();
        window.dispatchEvent(new CustomEvent("nd:appearance"));
        toast("Бэкап восстановлен", "success");
        rerender();
      } catch (err) {
        toast(`Импорт не удался: ${err.message}`, "danger");
      } finally {
        // Always clear, or picking the same file again fires no change event.
        file.value = "";
      }
    });

    root.querySelector("#set-reset")?.addEventListener("click", () => {
      if (!confirm("Удалить весь прогресс, заметки, стек и настройки на этом устройстве?")) return;
      if (!confirm("Последняя проверка — отменить нельзя. Сбросить?")) return;
      store.reset();
      applyAppearance();
      window.dispatchEvent(new CustomEvent("nd:appearance"));
      toast("Всё сброшено", "info");
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
        toast(`${c ? c.name : "Элемент"} убран из стека`, "info");
        rerender();
      })
    );
  },
};