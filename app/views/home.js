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
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
    ["t½", `sertraline ${fmt.duration(26)}`],
    ["Adenosine", "caffeine blocks A1/A2A — it does not add energy"],
    ["SERT", "SSRIs keep serotonin in the cleft, not create it"],
    ["GABA-A", "benzodiazepines raise opening frequency, not conductance"],
    ["MAO-A", "tyramine + irreversible MAOI → hypertensive crisis"],
    ["NMDA", "ketamine is a use-dependent channel blocker"],
    ["CYP2D6", "~7% of people are poor metabolisers"],
    ["Taper", "step ≈5–10% of the current dose, hold 5 half-lives"],
    ["Peak", "oral caffeine Tmax ≈ 45 min"],
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
    "An evidence-graded map of neuropharmacology: compounds, receptor systems, interactions and the maths behind them.",
    `<a class="btn primary sm" href="#/compounds">${icon("search", 15)} Browse compounds</a>`,
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
            <span class="chip chip-accent">${icon("sparkles", 12)} Level ${lvl.level}</span>
            ${s.profile.streak ? `<span class="chip">${icon("zap", 12)} ${s.profile.streak}-day streak</span>` : ""}
            <span class="chip">${(s.profile.xp || 0).toLocaleString()} XP</span>
          </div>
          <h2 style="font-size:19px;letter-spacing:-.025em">${next ? `${next.lesson.title}` : "You finished every lesson"}</h2>
          <p class="small muted" style="line-height:1.55;max-width:56ch">
            ${
              next
                ? `${esc(next.course.title)} · ${next.lesson.minutes} min · <span class="mono" style="color:var(--accent)">+${next.lesson.xp} XP</span>`
                : "Nice. Review your flashcards to keep the mechanisms sharp."
            }
          </p>
          <div style="max-width:340px">${metric("Level progress", `${lvl.into} / ${lvl.need} XP`, lvl.progress)}</div>
          </div>
        </div>
        <div class="row wrap" style="gap:8px;flex:none">
          <a class="btn primary" href="${next ? `#/learn/${next.course.id}/${next.lesson.id}` : "#/cards"}">
            ${icon(next ? "play" : "layers", 15)} ${next ? "Continue" : "Review cards"}
          </a>
          <a class="btn ghost" href="#/brain">${icon("brain", 15)} Brain map</a>
        </div>
      </div>
    </section>

    <div class="grid grid-4" style="gap:10px">
      ${statTile({ label: "Compounds", value: COMPOUNDS.length, sub: `${new Set(COMPOUNDS.map((c) => c.cls)).size} classes`, iconName: "pill" })}
      ${statTile({ label: "Systems", value: SYSTEMS.length, sub: "transmitter pathways", iconName: "activity" })}
      ${statTile({ label: "Lessons", value: `${lessonsDone}/${TOTAL_LESSONS}`, sub: accuracy ? `${accuracy}% quiz accuracy` : "no quizzes yet", iconName: "book" })}
      ${statTile({ label: "Cards due", value: cards.due, sub: `${cards.mature} mature · ${cards.total} total`, iconName: "layers" })}
    </div>
  </div>

  <div style="margin-bottom:22px">${subscribePlate()}</div>

  <div class="split-wide">
    <div>

      <section class="block">
        <div class="block-head">
          <div><h2>Quick actions</h2><p class="block-sub">Jump straight to the tool you need</p></div>
        </div>
        <div class="grid grid-3" style="gap:10px">
          ${actionCard("flask", "PK simulator", "Plot plasma curves, half-lives and accumulation", "#/lab", "violet")}
          ${actionCard("shield", "Interaction check", "Stack combinations against a rule engine", "#/lab/interactions", "green")}
          ${actionCard("brain", "Pathway explorer", "Trace synthesis, receptors and drug targets", "#/brain", "amber")}
          ${actionCard("scale", "Taper planner", "Turn a half-life into a step-down schedule", "#/lab/taper", "blue")}
          ${actionCard("grid", "Compare compounds", "Two or three monographs, fact by fact", "#/compare", "violet")}
          ${actionCard("microscope", "Live research", "Search PubMed at request time — nothing stored", "#/research", "green")}
          ${actionCard("message", "Ask the library", "Plain-language answers from the local data", "#/ask", "blue")}
        </div>
      </section>

      ${
        stack.length
          ? `<section class="block">
              <div class="block-head">
                <div><h2>Your stack</h2><p class="block-sub">${stack.length} compound${stack.length === 1 ? "" : "s"} · ${findings.length} interaction signal${findings.length === 1 ? "" : "s"}</p></div>
                <a class="btn ghost sm" href="#/lab/interactions">Open checker ${icon("chevronRight", 14)}</a>
              </div>
              ${worst ? `<div style="margin-bottom:10px">${callout(
                worst === "critical" ? "danger" : worst === "major" ? "warn" : "info",
                worst === "critical" ? "This combination contains a serious interaction" : worst === "major" ? "High-risk interaction detected" : "Some interactions worth knowing",
                `${findings.length} signal${findings.length === 1 ? "" : "s"} detected. Review the details before trusting this stack.`
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
              <div class="block-head"><div><h2>Your stack</h2><p class="block-sub">Add compounds to check them together</p></div></div>
              <div class="card">
                ${emptyState("pill", "Nothing in your stack yet", "Open any compound and tap “Add to stack” — the interaction engine will keep watching.", `<a class="btn soft sm" href="#/compounds">${icon("plus", 14)} Add a compound</a>`)}
              </div>
            </section>`
      }

      <section class="block">
        <div class="block-head">
          <div><h2>Courses</h2><p class="block-sub">Structured, from membrane potentials to evidence literacy</p></div>
          <a class="btn ghost sm" href="#/learn">All lessons ${icon("chevronRight", 14)}</a>
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
                    ${done === course.lessons.length ? `<span class="chip chip-good">${icon("check", 11)} done</span>` : ""}
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
          <div class="eyebrow" style="margin-bottom:6px">Today's compound</div>
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
          <a class="btn ghost sm block" href="#/compounds/${esc(pick.id)}">Read the entry ${icon("chevronRight", 14)}</a>
        </div>
      </div>

      <div class="card" style="--dot:${sys.color}">
        <div class="eyebrow" style="margin-bottom:6px">Today's system</div>
        <h3 style="font-size:16px;margin-bottom:4px">${esc(sys.name)} <span class="mono tiny" style="color:${sys.color}">${esc(sys.abbr)}</span></h3>
        <p class="small muted" style="line-height:1.55;margin-bottom:10px">${esc(sys.summary)}</p>
        <div class="row wrap" style="gap:5px;margin-bottom:10px">
          ${sys.functions.slice(0, 3).map((f) => `<span class="chip">${esc(f)}</span>`).join("")}
        </div>
        <a class="btn ghost sm block" href="#/brain/${esc(sys.id)}">Open pathway ${icon("chevronRight", 14)}</a>
      </div>

      <div class="card">
        <div class="card-head"><h3 style="font-size:14px">Evidence key</h3></div>
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

      <p class="disclaimer-mini">${icon("info", 13)} Educational reference — not medical advice.</p>
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