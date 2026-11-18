/* Compound browser + detail */

import { esc, icon, store, fmt, toast, copyText, evidenceChip, EVIDENCE, emptyState, disclaimer, awardXP } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID, CLASSES, searchCompounds, getCompound, pubmedUrl, ALL_TAGS } from "../data/compounds.js";
import { SYSTEMS } from "../data/neuro.js";
import { checkInteractions, worstSeverity, SEVERITY } from "../data/interactions.js";
import { pageHead, compoundCard, classColor, backLink, callout, lineChart, liveBadge, mechFlow } from "./ui.js";
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
    return `<div class="card">${emptyState("search", "Ничего не найдено", "Попробуй короче запрос или сбрось фильтры.", `<button class="btn ghost sm" data-act="reset">${icon("refresh", 14)} Сбросить фильтры</button>`)}</div>`;
  }
  return `<div class="grid grid-auto" style="gap:10px">${items.map(compoundCard).join("")}</div>`;
}

function countLabel() {
  const n = applyFilters().length;
  return `${n} из ${COMPOUNDS.length} препаратов`;
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
      "Препараты",
      "Каждая запись оценена по силе доказательств на людях, а не по популярности. Дозы — справочные точки из литературы.",
      `<button class="btn ghost sm" data-act="random">${icon("sparkles", 14)} Случайный</button>`
    )}

    <div class="card" style="padding:12px;margin-bottom:14px">
      <div class="stack" style="gap:10px">
        <div class="search-input">
          ${icon("search", 16)}
          <input class="input" id="cmp-q" type="search" placeholder="Поиск: название, алиас, механизм, мишень…" value="${esc(listState.q)}" autocomplete="off" enterkeyhint="search">
          <button class="clear ${listState.q ? "show" : ""}" data-act="clear-q" aria-label="Очистить поиск">${icon("x", 15)}</button>
        </div>
        <div class="scroll-x">
          <div class="row wrap" style="gap:5px" id="cmp-class">
            <button class="chip chip-btn ${!listState.cls ? "on" : ""}" data-cls="">Все классы</button>
            ${cls.map((c) => `<button class="chip chip-btn ${listState.cls === c ? "on" : ""}" data-cls="${esc(c)}"><span class="dot" style="background:${classColor(c)}"></span>${esc(c)}</button>`).join("")}
          </div>
        </div>
        <div class="row wrap" style="gap:8px">
          ${listState.tag ? `<button class="chip chip-btn on" data-act="clear-tag">${icon("x", 12)} тег: ${esc(listState.tag)}</button>` : ""}
          <div class="btn-group" id="cmp-ev">
            <button class="${!listState.ev ? "on" : ""}" data-ev="">Любая доказательность</button>
            ${EV_ORDER.map((e) => `<button class="${listState.ev === e ? "on" : ""}" data-ev="${e}">${esc(EVIDENCE[e].short)}</button>`).join("")}
          </div>
          <select class="select" id="cmp-sort" style="width:auto;min-width:140px" aria-label="Сортировка">
            <option value="name" ${listState.sort === "name" ? "selected" : ""}>Имя А–Я</option>
            <option value="evidence" ${listState.sort === "evidence" ? "selected" : ""}>Сильнейшая доказательность</option>
            <option value="class" ${listState.sort === "class" ? "selected" : ""}>Класс</option>
            <option value="halflife" ${listState.sort === "halflife" ? "selected" : ""}>Короткое полувыведение</option>
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
    ["overview", "Обзор"],
    ["mechanism", "Механизм"],
    ["pk", "Кинетика"],
    ["doses", "Дозы"],
    ["safety", "Безопасность"],
    ["research", "Исследования"],
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
            <div class="eyebrow" style="margin-bottom:7px">Механизм действия</div>
            <div class="row wrap" style="gap:6px">${c.moa.map((m) => `<span class="chip chip-accent">${esc(m)}</span>`).join("")}</div>
          </section>`
        : ""
    }

    ${
      (c.effects?.good?.length || c.effects?.bad?.length)
        ? `<div class="effect-cols">
            <div class="effect-box good"><h4>${icon("check", 12)} Желаемые эффекты</h4>
              <ul>${(c.effects.good || []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>
            <div class="effect-box bad"><h4>${icon("alert", 12)} Нежелательные эффекты</h4>
              <ul>${(c.effects.bad || []).map((x) => `<li>${esc(x)}</li>`).join("") || "<li class='dim'>—</li>"}</ul></div>
          </div>`
        : ""
    }

    ${
      findings.length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Против твоего стека</div>
            <div class="stack" style="gap:8px">${findings.slice(0, 4).map(findingRow).join("")}</div>
            <a class="btn ghost sm" style="margin-top:9px" href="#/lab/interactions">Открыть полную проверку ${icon("chevronRight", 13)}</a>
          </section>`
        : stack.length
          ? `<div>${callout("ok", "С текущим стеком известных взаимодействий нет", "Это не доказательство безопасности — отсутствие данных не есть данные. Не перечисленные комбинации просто не изучены.")}</div>`
          : ""
    }

    ${
      sys.length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Задействованные системы</div>
            <div class="row wrap" style="gap:6px">
              ${sys.map((s) => `<a class="chip chip-btn" href="#/brain/${esc(s.id)}" style="--dot:${s.color}"><span class="dot" style="background:${s.color}"></span>${esc(s.name)}</a>`).join("")}
            </div>
          </section>`
        : ""
    }

    ${
      (c.tags || []).length
        ? `<section>
            <div class="eyebrow" style="margin-bottom:7px">Теги</div>
            <div class="row wrap" style="gap:5px">${c.tags.map((t) => `<a class="chip" href="#/compounds?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>
          </section>`
        : ""
    }

    <div class="card tight" style="background:var(--bg-1)">
      <div class="row wrap" style="gap:10px 18px">
        <div><div class="stat-label">Полувыведение</div><div class="mono" style="font-size:13px">${c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "—"}</div></div>
        <div><div class="stat-label">T-макс</div><div class="mono" style="font-size:13px">${c.pk.tmax ? fmt.duration(c.pk.tmax) : "—"}</div></div>
        <div><div class="stat-label">Длительность</div><div class="mono" style="font-size:13px">${c.pk.duration ? fmt.duration(c.pk.duration) : "—"}</div></div>
        <div><div class="stat-label">Класс</div><div class="mono" style="font-size:13px">${esc(c.cls)}</div></div>
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
        ? `<div class="card">
            <div class="card-head"><h3 style="font-size:14px">Цепочка механизма</h3><span class="spacer"></span>${liveBadge("анимация")}</div>
            ${mechFlow(
              (c.moa || []).slice(0, 4).map((m, i) => ({
                icon: i === 0 ? "target" : i === 1 ? "dna" : i === 2 ? "activity" : "sparkles",
                title: m,
              }))
            )}
          </div>`
        : ""
    }
    ${
      (c.moa || []).length
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:6px">Основные действия</div>
            <ul class="md-list" style="margin:0;padding-left:18px;font-size:13.5px;line-height:1.6">
              ${c.moa.map((m) => `<li>${esc(m)}</li>`).join("")}
            </ul>
          </div>`
        : ""
    }

    ${
      targets.length
        ? `<div class="card flush">
            <div style="padding:12px 14px;border-bottom:1px solid var(--line-soft)"><div class="eyebrow">Молекулярные мишени</div></div>
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
        : `<div class="card">${emptyState("target", "Молекулярные мишени не записаны", "Эта запись описывает механизм только на уровне систем.")}</div>`
    }

    ${(() => {
      const sys = systemsForCompound(c);
      if (!sys.length) return "";
      return `<div class="card">
        <div class="eyebrow" style="margin-bottom:8px">Где это находится в пути</div>
        <div class="stack" style="gap:8px">
          ${sys
            .map((s) => {
              const pts = (s.interventions || []).filter((p) => (p.drugs || []).includes(c.id));
              return `<a class="card tight hoverable" href="#/brain/${esc(s.id)}" style="text-decoration:none;color:inherit;background:var(--bg-1)">
                <div class="row between"><div class="row" style="gap:6px"><span class="dot" style="width:7px;height:7px;border-radius:50%;background:${s.color}"></span>
                <strong style="font-size:13px">${esc(s.name)}</strong></div>${icon("chevronRight", 14)}</div>
                ${pts.length ? `<div class="tiny dim" style="margin-top:5px;line-height:1.5">${pts.map((p) => `${esc(p.point)}: ${esc(p.target)}`).join(" · ")}</div>` : `<div class="tiny dim" style="margin-top:5px">Действует на эту систему через нижестоящий механизм.</div>`}
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
  const ticks = half > 0 ? [0, half, half * 2, half * 3, half * 4].filter((t) => t <= Math.min(half * 6, 240)).map((t) => ({ x: t, label: `${Math.round(t * 10) / 10} ч` })) : [];

  return `
  <div class="stack" style="gap:14px">
    <div class="card flush">
      <div class="list">
        ${kvRow("Начало действия", c.pk.onset ? fmt.duration(c.pk.onset) : "—")}
        ${kvRow("T-макс", c.pk.tmax ? fmt.duration(c.pk.tmax) : "—")}
        ${kvRow("Полувыведение", c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "—")}
        ${kvRow("Длительность", c.pk.duration ? fmt.duration(c.pk.duration) : "—")}
        ${kvRow("Метаболизм", c.pk.metabolism || "—")}
        ${kvRow("Выведение", c.pk.excretion || "—")}
      </div>
    </div>

    ${
      half > 0
        ? `<div class="card">
            <div class="card-head"><h3 style="font-size:14px">Спад одной дозы</h3><span class="spacer"></span><span class="tiny dim mono">t½ ${fmt.duration(half)}</span></div>
            ${lineChart(series, { height: 150, yLabel: "относительный уровень в плазме", xTicks: ticks, yMax: 1 })}
            <p class="tiny dim" style="margin-top:8px;line-height:1.5">Схематичный спад первого порядка — всасывание упрощено. Реальные кривые зависят от формы, еды и печёночного кровотока.</p>
            <a class="btn soft sm" style="margin-top:10px" href="#/lab?compound=${esc(c.id)}">${icon("flask", 14)} Смоделировать дозы в лаборатории</a>
          </div>`
        : ""
    }

    ${
      half >= 2
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:7px">Что это значит по времени</div>
            <ul class="md-list" style="margin:0;padding-left:18px;font-size:13px;line-height:1.65">
              <li>Равновесная концентрация примерно через <strong>${fmt.duration(half * 5)}</strong> регулярного приёма.</li>
              <li>Почти полностью выводится (≈97%) примерно за <strong>${fmt.duration(half * 5)}</strong> после последней дозы.</li>
              <li>${half >= 24 ? "Длинное полувыведение: эффекты накапливаются тихо — побочки могут появиться через дни курса." : "Короткое полувыведение: уровни сильно качаются между дозами; время приёма важнее суммарной дозы."}</li>
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
      "Справочные диапазоны, не рекомендации",
      "Это величины из клинической литературы для контекста. Индивидуальная доза зависит от веса, возраста, функции печени и почек, генетики и других препаратов."
    )}

    ${
      doses.length
        ? `<div class="card flush">
            <div class="list">
              ${doses
                .map(
                  (d) => `<div class="list-row" style="align-items:flex-start">
                    <div class="grow">
                      <div class="title">${esc(d.route || "внутрь")} <span class="mono" style="font-size:12px;color:var(--accent)">${esc(fmtNum(d.low))}${d.high && d.high !== d.low ? `–${esc(fmtNum(d.high))}` : ""} ${esc(d.unit || "mg")}</span></div>
                      ${d.note ? `<div class="sub" style="margin-top:3px;line-height:1.5">${esc(d.note)}</div>` : ""}
                    </div>
                  </div>`
                )
                .join("")}
            </div>
          </div>`
        : `<div class="card">${emptyState("pill", "Данных о дозах нет", "Это вещество описано здесь ради механизма и рисков, а не ради дозирования.")}</div>`
    }

    <div class="card tight">
      <div class="eyebrow" style="margin-bottom:6px">Осторожно с дозой</div>
      <p class="small muted" style="line-height:1.6">
        У большинства этих веществ запас шире, чем у клинических препаратов рядом — но «натуральный» это маркетинговая категория, а не свойство безопасности.
        Загрязнители, неверная маркировка и неизмеренная потенция дают большую часть вреда от добавок.
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
            ${c.warnings.map((w, i) => callout(i === 0 ? "danger" : "warn", i === 0 ? "Важно" : "Осторожно", w)).join("")}
          </div>`
        : `<div>${callout("ok", "Особых предупреждений не записано", "Отсутствие записанных предупреждений не есть доказательство безопасности. Не перечисленные риски — неизученные риски.")}</div>`
    }

    ${
      (c.flags || []).length
        ? `<div class="card tight">
            <div class="eyebrow" style="margin-bottom:7px">Фармакологические флаги</div>
            <div class="row wrap" style="gap:5px">${c.flags.map((f) => `<span class="chip" title="Используется движком взаимодействий">${esc(f)}</span>`).join("")}</div>
            <p class="tiny dim" style="margin-top:9px;line-height:1.5">Флаги питают движок взаимодействий: совпадение двух флагов даёт сигнал даже для комбинаций, которые никто формально не изучал.</p>
          </div>`
        : ""
    }

    <div class="row wrap" style="gap:8px">
      <a class="btn soft sm" href="#/lab/interactions?add=${esc(c.id)}">${icon("shield", 14)} Проверить взаимодействия</a>
      <button class="btn ghost sm" data-act="stack">${icon("plus", 14)} ${inStack(c.id) ? "В твоём стеке" : "В стек"}</button>
    </div>
  </div>`;
}

function panelResearch(c) {
  const q = c.pubmed || c.name;
  return `
  <div class="stack" style="gap:14px">
    <div class="card">
      <div class="card-head">
        <h3 style="font-size:14px">Живьём с PubMed</h3>
        <span class="spacer"></span>
        ${liveBadge("api")}
      </div>
      <p class="tiny dim" style="line-height:1.55;margin-bottom:10px">
        Загружено с NCBI в момент открытия вкладки. Ничто здесь не вшито в приложение и не пишется в хранилище.
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
      <div class="eyebrow" style="margin-bottom:7px">Поищи сам</div>
      <div class="stack" style="gap:8px">
        <a class="btn soft sm" href="${PM_LINK.search(q)}" target="_blank" rel="noopener noreferrer">${icon("external", 14)} PubMed: “${esc(q)}”</a>
        <a class="btn ghost sm" href="${PM_LINK.search(`"${c.name}" AND (review[pt] OR meta-analysis[pt])`)}" target="_blank" rel="noopener noreferrer">${icon("book", 14)} Обзоры по ${esc(c.name)}</a>
        <a class="btn ghost sm" href="#/research?compound=${encodeURIComponent(q)}">${icon("microscope", 14)} Открыть вкладку «Исследования»</a>
      </div>
    </div>

    <div class="card tight">
      <div class="row" style="gap:8px;margin-bottom:6px">${evidenceChip(c.evidence)}<span class="eyebrow">Грейд доказательности</span></div>
      <p class="small muted" style="line-height:1.6">${esc(EVIDENCE[c.evidence]?.label || "Без оценки")} — присвоен по качеству и согласованности данных на людях, с приоритетом контролируемых исследований над механистической правдоподобностью.</p>
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
      box.innerHTML = `<p class="small dim" style="line-height:1.6">PubMed не вернул записей по «${esc(q)}». Обычно это значит, что сохранённый запрос слишком узкий — попробуй просто название вещества.</p>
        <a class="btn ghost xs" href="#/research?compound=${encodeURIComponent(c.name)}" style="margin-top:8px">${icon("search", 13)} Искать «${esc(c.name)}»</a>`;
      return;
    }
    box.innerHTML = `<div class="stack" style="gap:10px">${res.papers.map((p, i) => paperCard(p, i)).join("")}</div>
      <div class="row between wrap" style="gap:8px;margin-top:11px">
        <span class="tiny dim">записей: ${res.total.toLocaleString()} · ${res.ms} мс · живьём, не хранится</span>
        <a class="btn ghost xs" href="#/research?compound=${encodeURIComponent(q)}">Открыть в «Исследованиях» ${icon("arrowRight", 13)}</a>
      </div>`;
  } catch (err) {
    if (box.dataset.token !== token) return;
    box.innerHTML = `<p class="small" style="color:var(--warn);line-height:1.6">${icon("wifiOff", 14)} Не удалось связаться с NCBI${err && err.message ? ` — ${esc(err.message)}` : ""}.</p>
      <div class="row wrap" style="gap:8px;margin-top:9px">
        <button class="btn soft xs" data-live-retry>${icon("refresh", 13)} Повторить</button>
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
      return `<div class="card">${emptyState("search", "Препарат не найден", `Нет записи «${ctx.params.id}».`, `<a class="btn ghost sm" href="#/compounds">${icon("arrowLeft", 14)} К препаратам</a>`)}</div>`;
    }
    if (detailState.id !== c.id) {
      detailState.id = c.id;
      detailState.tab = "overview";
    }
    const saved = isSaved(c.id);
    const partner = COMPOUNDS.find((x) => x.id !== c.id && x.cls === c.cls) || COMPOUNDS.find((x) => x.id !== c.id);

    return `
    <div class="row" style="margin-bottom:14px">
      ${backLink("#/compounds", "Препараты")}
      <span class="spacer"></span>
      <button class="icon-btn ${saved ? "accent" : ""}" data-act="save" aria-label="Сохранить запись" title="Сохранить запись">${icon("star", 18)}</button>
      <button class="icon-btn" data-act="copy" aria-label="Копировать сводку" title="Копировать сводку">${icon("copy", 17)}</button>
    </div>

    <header class="detail-head">
      <div class="row wrap" style="gap:7px">
        <span class="chip" style="--dot:${classColor(c.cls)}"><span class="dot" style="background:${classColor(c.cls)}"></span>${esc(c.cls)}</span>
        ${c.subcls ? `<span class="chip">${esc(c.subcls)}</span>` : ""}
        ${c.status ? `<span class="chip">${esc(c.status)}</span>` : ""}
        ${evidenceChip(c.evidence)}
      </div>
      <h1 class="detail-title">${esc(c.name)}</h1>
      ${(c.aliases || []).length ? `<p class="detail-alias">также: ${c.aliases.map(esc).join(" · ")}</p>` : ""}
      <div class="row wrap" style="gap:8px;margin-top:4px">
        <button class="btn ${inStack(c.id) ? "soft" : "primary"} sm" data-act="stack">${icon(inStack(c.id) ? "check" : "plus", 14)} ${inStack(c.id) ? "В стеке" : "В стек"}</button>
        <a class="btn ghost sm" href="#/lab?compound=${esc(c.id)}">${icon("flask", 14)} Лаборатория</a>
        <a class="btn ghost sm" href="#/lab/interactions?add=${esc(c.id)}">${icon("shield", 14)} Взаимодействия</a>
        ${partner ? `<a class="btn ghost sm" href="#/compare?ids=${esc(c.id)},${esc(partner.id)}">${icon("grid", 14)} Сравнить</a>` : ""}
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
        toast(has ? `${c.name} убран из стека` : `${c.name} добавлен в стек`, has ? "info" : "success");
        ctx.rerender();
      }
      if (ev.target.closest('[data-act="save"]')) {
        const saved = store.data.saved || [];
        const has = saved.includes(c.id);
        store.update((s) => {
          s.saved = has ? s.saved.filter((x) => x !== c.id) : [...s.saved, c.id];
        });
        if (!has) awardXP(2);
        toast(has ? "Убрано из сохранённого" : "Сохранено", has ? "info" : "success");
        ctx.rerender();
      }
      if (ev.target.closest('[data-act="copy"]')) {
        const text = `${c.name} (${c.cls})\n${c.summary}\n\nМеханизм: ${(c.moa || []).join("; ")}\nПолувыведение: ${c.pk.halfLife ? fmt.duration(c.pk.halfLife) : "неизвестно"}\n\nИсточник: NeuroDifference (образовательно, не медицинская рекомендация)`;
        copyText(text, "Запись скопирована");
      }
    });
  },
};