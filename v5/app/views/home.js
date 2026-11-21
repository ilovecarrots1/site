/* Home / dashboard — v5 Field Lab.
   The hero is a LIVE procedural 3D brain (same engine as #/brain): it
   auto-rotates, sparks fire, and tapping a zone jumps straight to that
   region's card. Everything below is the working dashboard. */

import { esc, icon, store, levelFor, fmt, EVIDENCE, evidenceChip, emptyState } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "../data/neuro.js";
import { COURSES, TOTAL_LESSONS, LESSON_INDEX, FLASHCARDS } from "../data/learn.js";
import { checkInteractions, worstSeverity } from "../data/interactions.js";
import { REGIONS, regionColor } from "../data/brainmap.js";
import { mountBrain3D } from "../lib/brain3d.js";
import { deckStats } from "../srs.js";
import { pageHead, statTile, compoundCard, classColor, metric, callout, subscribePlate } from "./ui.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Ещё не спишь";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function nextLesson() {
  const done = store.data.lessons || {};
  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      if (!done[lesson.id]?.completed) return { course, lesson };
    }
  }
  return null;
}

function dailyPick() {
  const seed = Math.floor(Date.now() / 86400000);
  return COMPOUNDS[seed % COMPOUNDS.length];
}

function dailySystem() {
  const seed = Math.floor(Date.now() / 86400000);
  return SYSTEMS[(seed + 3) % SYSTEMS.length];
}

function tickerHtml() {
  const items = [
    ["t½", `сертралин ${fmt.duration(26)}`],
    ["Аденозин", "кофеин блокирует A1/A2A — он не добавляет энергии"],
    ["SERT", "СИОЗС удерживают серотонин в щели, а не создают его"],
    ["GABA-A", "бензодиазепины повышают частоту открытия, не проводимость"],
    ["MAO-A", "тирамин + необратимый ИМАО → гипертонический криз"],
    ["NMDA", "кетамин — use-dependent блокатор канала"],
    ["CYP2D6", "~7% людей — медленные метаболизаторы"],
    ["Снижение", "шаг ≈5–10% текущей дозы, пауза 5 полувыведений"],
    ["Пик", "Tmax кофеина внутрь ≈ 45 мин"],
  ];
  const row = (list) =>
    list.map(([tag, text]) => `<span class="ticker-item"><b>${esc(tag)}</b> ${esc(text)}</span>`).join("");
  return `<div class="ticker" style="margin-bottom:18px" aria-hidden="true">
    <div class="ticker-track">${row(items)}${row(items)}</div>
  </div>`;
}

export function render() {
  const s = store.data;
  const lvl = levelFor(s.profile.xp || 0);
  const lessonsDone = Object.values(s.lessons || {}).filter((l) => l && l.completed).length;
  const cards = deckStats(FLASHCARDS);
  const stack = (s.stack || []).map((id) => COMPOUND_BY_ID.get(id)).filter(Boolean);
  const findings = stack.length > 1 ? checkInteractions(stack) : [];
  const worst = findings.length ? worstSeverity(findings) : null;
  const next = nextLesson();
  const pick = dailyPick();
  const sys = dailySystem();
  const accuracy = s.profile.quizzes ? Math.round((s.profile.correct / s.profile.quizzes) * 100) : 0;

  return `
  <section class="card hero-card home-hero spot">
    <div class="home-hero-grid">
      <div class="home-hero-copy">
        <div class="eyebrow" style="margin-bottom:8px">${esc(greeting())} · NeuroDifference</div>
        <h1 class="home-title gtext">Нейрофармакология, которую можно потрогать.</h1>
        <p class="home-lede">
          ${COMPOUNDS.length} препаратов, 28 регионов мозга и движок взаимодействий —
          с честной градацией доказательности. Крути живую модель, нажимай на зоны,
          проверяй свой стек.
        </p>
        <div class="row wrap" style="gap:6px;margin:2px 0 12px">
          <span class="chip chip-accent">${icon("sparkles", 12)} Уровень ${lvl.level}</span>
          ${s.profile.streak ? `<span class="chip">${icon("zap", 12)} ${s.profile.streak} дн. подряд</span>` : ""}
          <span class="chip mono">${(s.profile.xp || 0).toLocaleString()} XP</span>
        </div>
        <div style="max-width:360px;margin-bottom:14px">${metric("Прогресс уровня", `${lvl.into} / ${lvl.need} XP`, lvl.progress)}</div>
        <div class="row wrap" style="gap:8px">
          <a class="btn primary" href="#/compounds">${icon("search", 15)} К препаратам</a>
          <a class="btn ghost" href="${next ? `#/learn/${next.course.id}/${next.lesson.id}` : "#/cards"}">
            ${icon(next ? "play" : "layers", 15)} ${next ? "Продолжить урок" : "Повторить карточки"}
          </a>
        </div>
        ${next ? `<p class="tiny dim" style="margin-top:10px;line-height:1.4">Дальше: ${esc(next.lesson.title)} · ${esc(next.course.title)} · <span class="mono" style="color:var(--accent)">+${next.lesson.xp} XP</span></p>` : ""}
      </div>

      <div class="home-brain-stage">
        <div class="home-brain-frame">
          <canvas id="home-brain" aria-label="Живая 3D-модель мозга — нажми на зону, чтобы открыть её карточку"></canvas>
        </div>
        <div class="home-brain-cap row between wrap" style="gap:8px">
          <span class="live-dot"><i></i> Живая модель · 28 регионов</span>
          <a class="btn ghost xs" href="#/brain">Карта мозга ${icon("chevronRight", 13)}</a>
        </div>
      </div>
    </div>
  </section>

  ${tickerHtml()}

  <div class="grid grid-4" style="gap:10px;margin-bottom:22px">
    ${statTile({ label: "Препараты", value: COMPOUNDS.length, sub: `${new Set(COMPOUNDS.map((c) => c.cls)).size} классов`, iconName: "pill" })}
    ${statTile({ label: "Системы", value: SYSTEMS.length, sub: "нейромедиаторные пути", iconName: "activity" })}
    ${statTile({ label: "Уроки", value: `${lessonsDone}/${TOTAL_LESSONS}`, sub: accuracy ? `точность квизов ${accuracy}%` : "квизов ещё не было", iconName: "book" })}
    ${statTile({ label: "Карточек к повторению", value: cards.due, sub: `${cards.mature} зрелых · ${cards.total} всего`, iconName: "layers" })}
  </div>

  <div style="margin-bottom:22px">${subscribePlate()}</div>

  <div class="split-wide">
    <div>

      <section class="block">
        <div class="block-head">
          <div><h2>Быстрые действия</h2><p class="block-sub">Сразу к нужному инструменту</p></div>
        </div>
        <div class="grid grid-3" style="gap:10px">
          ${actionCard("flask", "PK-симулятор", "Кривые концентрации, полувыведение и накопление", "#/lab", "teal")}
          ${actionCard("shield", "Проверка взаимодействий", "Комбинации против базы правил", "#/lab/interactions", "sage")}
          ${actionCard("brain", "Проводник путей", "Синтез, рецепторы и мишени препаратов", "#/brain", "copper")}
          ${actionCard("scale", "План снижения дозы", "Из полувыведения — в график снижения", "#/lab/taper", "slate")}
          ${actionCard("grid", "Сравнение препаратов", "Две-три монографии, факт за фактом", "#/compare", "dune")}
          ${actionCard("microscope", "Живые исследования", "Поиск PubMed по запросу — ничего не хранится", "#/research", "teal")}
          ${actionCard("message", "Спроси библиотеку", "Ответы простым языком из локальных данных", "#/ask", "slate")}
        </div>
      </section>

      ${
        stack.length
          ? `<section class="block">
              <div class="block-head">
                <div><h2>Твой стек</h2><p class="block-sub">${stack.length} преп. · сигналов: ${findings.length}</p></div>
                <a class="btn ghost sm" href="#/lab/interactions">Открыть проверку ${icon("chevronRight", 14)}</a>
              </div>
              ${worst ? `<div style="margin-bottom:10px">${callout(
                worst === "critical" ? "danger" : worst === "major" ? "warn" : "info",
                worst === "critical" ? "В этой комбинации серьёзное взаимодействие" : worst === "major" ? "Обнаружено взаимодействие высокого риска" : "Есть взаимодействия, о которых стоит знать",
                `Сигналов: ${findings.length}. Посмотри детали, прежде чем доверять этому стеку.`
              )}</div>` : ""}
              <div class="card flush">
                <div class="list">
                  ${stack
                    .map(
                      (c) => `<a class="list-row" href="#/compounds/${esc(c.id)}">
                        <span style="width:8px;height:8px;border-radius:50%;background:${classColor(c.cls)};flex:none"></span>
                        <div class="grow"><div class="title">${esc(c.name)}</div><div class="sub">${esc(c.cls)}${c.pk?.halfLife ? ` · t½ ${fmt.duration(c.pk.halfLife)}` : ""}</div></div>
                        ${evidenceChip(c.evidence)}
                      </a>`
                    )
                    .join("")}
                </div>
              </div>
            </section>`
          : `<section class="block">
              <div class="block-head"><div><h2>Твой стек</h2><p class="block-sub">Добавь препараты, чтобы проверить их вместе</p></div></div>
              <div class="card">
                ${emptyState("pill", "В стеке пока пусто", "Открой любой препарат и нажми «В стек» — движок взаимодействий будет начеку.", `<a class="btn soft sm" href="#/compounds">${icon("plus", 14)} Добавить препарат</a>`)}
              </div>
            </section>`
      }

      <section class="block">
        <div class="block-head">
          <div><h2>Курсы</h2><p class="block-sub">От мембранного потенциала до грамотности доказательности</p></div>
          <a class="btn ghost sm" href="#/learn">Все уроки ${icon("chevronRight", 14)}</a>
        </div>
        <div class="grid" style="gap:10px">
          ${COURSES.map((course) => {
            const done = course.lessons.filter((l) => store.data.lessons[l.id]?.completed).length;
            const pct = done / course.lessons.length;
            return `<a class="card hoverable" href="#/learn/${esc(course.id)}" style="text-decoration:none;color:inherit">
              <div class="row between" style="align-items:flex-start;margin-bottom:8px">
                <div style="min-width:0">
                  <div class="row" style="gap:6px;margin-bottom:3px">
                    <span class="chip">${esc(course.level)}</span>
                    ${done === course.lessons.length ? `<span class="chip chip-good">${icon("check", 11)} пройдено</span>` : ""}
                  </div>
                  <h3 style="font-size:14.5px">${esc(course.title)}</h3>
                </div>
                <span class="mono tiny dim nowrap">${done}/${course.lessons.length}</span>
              </div>
              <p class="small dim" style="margin-bottom:9px;line-height:1.5">${esc(course.blurb)}</p>
              <div class="meter"><i style="width:${Math.round(pct * 100)}%"></i></div>
            </a>`;
          }).join("")}
        </div>
      </section>
    </div>

    <aside class="col sticky-side" style="gap:14px">

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:14px 14px 10px;border-bottom:1px solid var(--line-soft)">
          <div class="eyebrow" style="margin-bottom:6px">Препарат дня</div>
          <a href="#/compounds/${esc(pick.id)}" style="color:inherit;text-decoration:none">
            <div class="row between" style="align-items:flex-start;gap:8px">
              <h3 style="font-size:16px">${esc(pick.name)}</h3>
              ${evidenceChip(pick.evidence)}
            </div>
          </a>
        </div>
        <div style="padding:12px 14px 14px" class="stack">
          <p class="small muted" style="line-height:1.55">${esc(pick.summary)}</p>
          <div class="row wrap" style="gap:6px">
            ${(pick.moa || []).slice(0, 2).map((m) => `<span class="chip chip-accent">${esc(m)}</span>`).join("")}
          </div>
          <a class="btn ghost sm block" href="#/compounds/${esc(pick.id)}">Читать запись ${icon("chevronRight", 14)}</a>
        </div>
      </div>

      <div class="card" style="--dot:${sys.color}">
        <div class="eyebrow" style="margin-bottom:6px">Система дня</div>
        <h3 style="font-size:16px;margin-bottom:4px">${esc(sys.name)} <span class="mono tiny" style="color:${sys.color}">${esc(sys.abbr)}</span></h3>
        <p class="small muted" style="line-height:1.55;margin-bottom:10px">${esc(sys.summary)}</p>
        <div class="row wrap" style="gap:5px;margin-bottom:10px">
          ${sys.functions.slice(0, 3).map((f) => `<span class="chip">${esc(f)}</span>`).join("")}
        </div>
        <a class="btn ghost sm block" href="#/brain/${esc(sys.id)}">Открыть путь ${icon("chevronRight", 14)}</a>
      </div>

      <div class="card">
        <div class="card-head"><h3 style="font-size:14px">Ключ доказательности</h3></div>
        <div class="stack" style="gap:7px">
          ${Object.entries(EVIDENCE)
            .map(
              ([key, meta]) => `<div class="row" style="gap:8px">
                ${evidenceChip(key)}
                <span class="tiny dim" style="line-height:1.35">${esc(meta.label)}</span>
              </div>`
            )
            .join("")}
        </div>
      </div>

      <p class="disclaimer-mini">${icon("info", 13)} Образовательный справочник — не медицинская рекомендация.</p>
    </aside>
  </div>`;
}

/* ---- live hero brain ---------------------------------------------------- */

let liveHome = null;

export function mount(root) {
  const canvas = root.querySelector("#home-brain");
  if (!canvas) return;
  if (liveHome) { liveHome.destroy(); liveHome = null; }
  liveHome = mountBrain3D(canvas, {
    regions: REGIONS.map((r) => ({ ...r, color: regionColor(r) })),
    palette: { cortex: "#c9a79b", cerebellum: "#b08a80", stem: "#cbb9a4" },
    getLit: () => ({ lit: new Map(), focus: false }),
    onSelect: (id) => { location.hash = `#/brain/${id}`; },
  });
}

function actionCard(iconName, title, sub, href, accent) {
  const tones = {
    teal: ["#3fb8a3", "#2f9e8b"],
    copper: ["#d17a4b", "#b8653c"],
    sage: ["#7fae7a", "#5f9160"],
    slate: ["#6ba3c7", "#4f87ad"],
    dune: ["#b89b5e", "#9a7f47"],
  };
  const tone = tones[accent] || tones.teal;
  return `<a class="card hoverable" href="${href}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:7px">
    <span class="brand-mark" style="background:linear-gradient(150deg, ${tone[0]}, ${tone[1]});box-shadow:none">${icon(iconName, 16)}</span>
    <div><div style="font-size:14px;font-weight:640">${esc(title)}</div>
    <div class="tiny dim" style="margin-top:2px;line-height:1.4">${esc(sub)}</div></div>
  </a>`;
}