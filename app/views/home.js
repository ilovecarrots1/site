/* Home / dashboard */

import { esc, icon, store, levelFor, fmt, EVIDENCE, evidenceChip, emptyState } from "../core.js";
import { COMPOUNDS, COMPOUND_BY_ID } from "../data/compounds.js";
import { SYSTEMS, SYSTEM_BY_ID } from "../data/neuro.js";
import { COURSES, TOTAL_LESSONS, LESSON_INDEX, FLASHCARDS } from "../data/learn.js";
import { checkInteractions, worstSeverity } from "../data/interactions.js";
import { deckStats } from "../srs.js";
import { pageHead, statTile, compoundCard, classColor, metric, callout, subscribePlate, orb } from "./ui.js";

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
  ${pageHead(
    `${greeting()}.`,
    "Карта нейрофармакологии с градацией доказательности: препараты, рецепторные системы, взаимодействия и математика, которая за ними стоит.",
    `<a class="btn primary sm" href="#/compounds">${icon("search", 15)} К препаратам</a>`,
    "NeuroDifference"
  )}

  ${tickerHtml()}

  <div class="grid" style="gap:14px;margin-bottom:26px">
    <section class="card hero-card spot" style="padding:18px">
      <div class="row between wrap" style="gap:14px;align-items:flex-start">
        <div class="row" style="gap:13px;align-items:flex-start;min-width:0;flex:1 1 290px">
          ${orb(52)}
          <div class="stack" style="gap:8px;min-width:0">
          <div class="row wrap" style="gap:6px">
            <span class="chip chip-accent">${icon("sparkles", 12)} Уровень ${lvl.level}</span>
            ${s.profile.streak ? `<span class="chip">${icon("zap", 12)} ${s.profile.streak} дн. подряд</span>` : ""}
            <span class="chip">${(s.profile.xp || 0).toLocaleString()} XP</span>
          </div>
          <h2 style="font-size:19px;letter-spacing:-.025em">${next ? `${next.lesson.title}` : "Все уроки пройдены"}</h2>
          <p class="small muted" style="line-height:1.55;max-width:56ch">
            ${
              next
                ? `${esc(next.course.title)} · ${next.lesson.minutes} мин · <span class="mono" style="color:var(--accent)">+${next.lesson.xp} XP</span>`
                : "Отлично. Повтори карточки, чтобы механизмы остались свежими."
            }
          </p>
          <div style="max-width:340px">${metric("Прогресс уровня", `${lvl.into} / ${lvl.need} XP`, lvl.progress)}</div>
          </div>
        </div>
        <div class="row wrap" style="gap:8px;flex:none">
          <a class="btn primary" href="${next ? `#/learn/${next.course.id}/${next.lesson.id}` : "#/cards"}">
            ${icon(next ? "play" : "layers", 15)} ${next ? "Продолжить" : "Повторить карточки"}
          </a>
          <a class="btn ghost" href="#/brain">${icon("brain", 15)} Карта мозга</a>
        </div>
      </div>
    </section>

    <div class="grid grid-4" style="gap:10px">
      ${statTile({ label: "Препараты", value: COMPOUNDS.length, sub: `${new Set(COMPOUNDS.map((c) => c.cls)).size} классов`, iconName: "pill" })}
      ${statTile({ label: "Системы", value: SYSTEMS.length, sub: "нейромедиаторные пути", iconName: "activity" })}
      ${statTile({ label: "Уроки", value: `${lessonsDone}/${TOTAL_LESSONS}`, sub: accuracy ? `точность квизов ${accuracy}%` : "квизов ещё не было", iconName: "book" })}
      ${statTile({ label: "Карточек к повторению", value: cards.due, sub: `${cards.mature} зрелых · ${cards.total} всего`, iconName: "layers" })}
    </div>
  </div>

  <div style="margin-bottom:22px">${subscribePlate()}</div>

  <div class="split-wide">
    <div>

      <section class="block">
        <div class="block-head">
          <div><h2>Быстрые действия</h2><p class="block-sub">Сразу к нужному инструменту</p></div>
        </div>
        <div class="grid grid-3" style="gap:10px">
          ${actionCard("flask", "PK-симулятор", "Кривые концентрации, полувыведение и накопление", "#/lab", "violet")}
          ${actionCard("shield", "Проверка взаимодействий", "Комбинации против базы правил", "#/lab/interactions", "green")}
          ${actionCard("brain", "Проводник путей", "Синтез, рецепторы и мишени препаратов", "#/brain", "amber")}
          ${actionCard("scale", "План снижения дозы", "Из полувыведения — в график снижения", "#/lab/taper", "blue")}
          ${actionCard("grid", "Сравнение препаратов", "Две-три монографии, факт за фактом", "#/compare", "violet")}
          ${actionCard("microscope", "Живые исследования", "Поиск PubMed по запросу — ничего не хранится", "#/research", "green")}
          ${actionCard("message", "Спроси библиотеку", "Ответы простым языком из локальных данных", "#/ask", "blue")}
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

function actionCard(iconName, title, sub, href, accent) {
  const tones = {
    violet: ["#8b7bff", "#5b8cff"],
    green: ["#3fb950", "#2f9e6b"],
    amber: ["#e3b341", "#f0883e"],
    blue: ["#6fb3ff", "#8b7bff"],
  };
  const tone = tones[accent] || tones.violet;
  return `<a class="card hoverable" href="${href}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:7px">
    <span class="brand-mark" style="background:linear-gradient(150deg, ${tone[0]}, ${tone[1]});box-shadow:none">${icon(iconName, 16)}</span>
    <div><div style="font-size:14px;font-weight:640">${esc(title)}</div>
    <div class="tiny dim" style="margin-top:2px;line-height:1.4">${esc(sub)}</div></div>
  </a>`;
}