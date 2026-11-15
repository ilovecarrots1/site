/* Learn: courses, lessons, quizzes, flashcards */

import { esc, icon, md, store, toast, awardXP, touchStreak, levelFor, emptyState, fmt } from "../core.js";
import { COURSES, LESSON_INDEX, TOTAL_LESSONS, FLASHCARDS, systemCardCount } from "../data/learn.js";
import { SYSTEM_BY_ID } from "../data/neuro.js";
import { deckStats, dueCards, gradeCard, GRADES, cardState, nextIntervalPreview } from "../srs.js";
import { pageHead, backLink, callout, metric, statTile } from "./ui.js";

function lessonDone(id) {
  return !!store.data.lessons?.[id]?.completed;
}

function courseProgress(course) {
  const done = course.lessons.filter((l) => lessonDone(l.id)).length;
  return { done, total: course.lessons.length, pct: done / course.lessons.length };
}

/* ------------------------------------------------------------------ */
/* Course index                                                        */
/* ------------------------------------------------------------------ */

export const index = {
  render() {
    const s = store.data;
    const done = Object.values(s.lessons || {}).filter((l) => l.completed).length;
    const lvl = levelFor(s.profile.xp || 0);
    const cards = deckStats(FLASHCARDS);
    const accuracy = s.profile.quizzes ? Math.round((s.profile.correct / s.profile.quizzes) * 100) : 0;

    return `
    ${pageHead(
      "Learn",
      "Five short courses that build the model most people skip: membrane physics → monoamines → inhibition → kinetics → evidence.",
      `<a class="btn primary sm" href="#/cards">${icon("layers", 15)} Flashcards${cards.due ? ` (${cards.due})` : ""}</a>`
    )}

    <div class="grid grid-4" style="gap:10px;margin-bottom:22px">
      ${statTile({ label: "Lessons", value: `${done}/${TOTAL_LESSONS}`, sub: "completed", iconName: "book" })}
      ${statTile({ label: "Level", value: lvl.level, sub: `${s.profile.xp || 0} XP total`, iconName: "sparkles" })}
      ${statTile({ label: "Accuracy", value: `${accuracy}%`, sub: `${s.profile.quizzes || 0} questions`, iconName: "target" })}
      ${statTile({ label: "Cards due", value: cards.due, sub: `${cards.mature} mature`, iconName: "layers" })}
    </div>

    <div class="block-head"><div><h2>Courses</h2><p class="block-sub">Work in order — later lessons assume the earlier vocab</p></div></div>
    <div class="grid" style="gap:12px">
      ${COURSES.map((course, i) => {
        const p = courseProgress(course);
        const next = course.lessons.find((l) => !lessonDone(l.id)) || course.lessons[0];
        return `<div class="card">
          <div class="row between" style="align-items:flex-start;gap:12px;margin-bottom:9px">
            <div style="min-width:0;flex:1">
              <div class="row" style="gap:6px;margin-bottom:5px">
                <span class="chip chip-accent">${esc(course.level)}</span>
                <span class="chip">${p.total} lessons · ${course.minutes} min</span>
                ${p.done === p.total ? `<span class="chip chip-good">${icon("check", 11)} complete</span>` : ""}
              </div>
              <h3 style="font-size:17px">${i + 1}. ${esc(course.title)}</h3>
              <p class="small dim" style="margin-top:4px;line-height:1.55;max-width:62ch">${esc(course.blurb)}</p>
            </div>
          </div>

          <div style="margin:11px 0 12px">${metric("Progress", `${p.done} / ${p.total} lessons`, p.pct)}</div>

          <div class="list" style="margin:0 calc(-1 * var(--pad)) calc(-1 * var(--pad))">
            ${course.lessons
              .map((l, j) => {
                const ok = lessonDone(l.id);
                return `<a class="list-row" href="#/learn/${esc(course.id)}/${esc(l.id)}">
                  <span style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-family:var(--mono);flex:none;${ok ? "background:rgba(63,185,80,.15);color:var(--good)" : "background:var(--bg-3);color:var(--text-3)"}">${ok ? icon("check", 11) : j + 1}</span>
                  <div class="grow"><div class="title">${esc(l.title)}</div><div class="sub">${l.minutes} min · ${(l.quiz || []).length} questions · +${l.xp} XP</div></div>
                  ${icon("chevronRight", 15)}
                </a>`;
              })
              .join("")}
          </div>

          <a class="btn ${p.done === p.total ? "ghost" : "soft"} sm" href="#/learn/${esc(course.id)}/${esc(next.id)}" style="margin-top:12px">
            ${p.done === p.total ? "Review" : p.done ? "Continue" : "Start"} ${icon("arrowRight", 14)}
          </a>
        </div>`;
      }).join("")}
    </div>`;
  },
};

/* ------------------------------------------------------------------ */
/* Course page                                                         */
/* ------------------------------------------------------------------ */

export const course = {
  render(ctx) {
    const c = COURSES.find((x) => x.id === ctx.params.courseId);
    if (!c) {
      return `<div class="card">${emptyState("book", "Course not found", "That course does not exist.", `<a class="btn ghost sm" href="#/learn">${icon("arrowLeft", 14)} All courses</a>`)}</div>`;
    }
    const p = courseProgress(c);
    return `
    ${backLink("#/learn", "Learn")}
    <header class="page-head" style="margin-top:14px">
      <div class="eyebrow" style="margin-bottom:5px">${esc(c.level)} · ${p.total} lessons</div>
      <h1>${esc(c.title)}</h1>
      <p>${esc(c.blurb)}</p>
    </header>

    <div style="max-width:420px;margin-bottom:18px">${metric("Course progress", `${p.done} / ${p.total}`, p.pct)}</div>

    <div class="grid" style="gap:9px">
      ${c.lessons
        .map((l, i) => {
          const rec = store.data.lessons?.[l.id];
          const ok = !!rec?.completed;
          return `<a class="card hoverable" href="#/learn/${esc(c.id)}/${esc(l.id)}" style="text-decoration:none;color:inherit;padding:14px">
            <div class="row between" style="align-items:flex-start;gap:10px">
              <div class="row top" style="gap:11px;min-width:0">
                <span style="width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font-size:12px;font-family:var(--mono);flex:none;${ok ? "background:rgba(63,185,80,.15);color:var(--good);border:1px solid rgba(63,185,80,.3)" : "background:var(--bg-3);color:var(--text-2);border:1px solid var(--line)"}">${ok ? icon("check", 13) : i + 1}</span>
                <div style="min-width:0">
                  <div style="font-size:14.5px;font-weight:620">${esc(l.title)}</div>
                  <div class="tiny dim" style="margin-top:2px">${l.minutes} min · ${(l.quiz || []).length} questions · +${l.xp} XP${rec?.score != null ? ` · scored ${rec.score}/${(l.quiz || []).length}` : ""}</div>
                </div>
              </div>
              ${icon("chevronRight", 16)}
            </div>
          </a>`;
        })
        .join("")}
    </div>`;
  },
};

/* ------------------------------------------------------------------ */
/* Lesson                                                              */
/* ------------------------------------------------------------------ */

export const lesson = {
  render(ctx) {
    const found = LESSON_INDEX.get(ctx.params.lessonId);
    const c = COURSES.find((x) => x.id === ctx.params.courseId);
    if (!found || !c) {
      return `<div class="card">${emptyState("book", "Lesson not found", "That lesson does not exist.", `<a class="btn ghost sm" href="#/learn">${icon("arrowLeft", 14)} Back to Learn</a>`)}</div>`;
    }
    const l = found.lesson || found;
    const idx = c.lessons.findIndex((x) => x.id === l.id);
    const prev = c.lessons[idx - 1];
    const next = c.lessons[idx + 1];
    const done = lessonDone(l.id);

    return `
    <div class="row" style="margin-bottom:12px">
      ${backLink(`#/learn/${esc(c.id)}`, c.title)}
      <span class="spacer"></span>
      <span class="chip">${l.minutes} min</span>
      ${done ? `<span class="chip chip-good">${icon("check", 11)} done</span>` : ""}
    </div>

    <div class="split">
      <article>
        <header style="margin-bottom:16px">
          <div class="eyebrow" style="margin-bottom:5px">Lesson ${idx + 1} of ${c.lessons.length}</div>
          <h1 style="font-size:25px;letter-spacing:-.03em;line-height:1.2">${esc(l.title)}</h1>
        </header>

        <div class="md" id="lesson-body">${md(l.content)}</div>

        ${(l.quiz || []).length ? `
        <section class="card" id="quiz-card" style="margin-top:22px">
          <div class="card-head">
            <h3 style="font-size:14px">${icon("target", 14)} Check yourself</h3>
            <span class="spacer"></span>
            <span class="tiny mono dim" id="quiz-score">0 / ${l.quiz.length}</span>
          </div>
          <div class="quiz" id="quiz"></div>
        </section>` : ""}

        <div class="row wrap" style="gap:8px;margin-top:18px" id="lesson-actions">
          ${prev ? `<a class="btn ghost sm" href="#/learn/${esc(c.id)}/${esc(prev.id)}">${icon("arrowLeft", 14)} Previous</a>` : ""}
          <span class="spacer"></span>
          <button class="btn ${done ? "ghost" : "primary"} sm" data-act="complete">${icon(done ? "check" : "flag", 14)} ${done ? "Completed" : "Mark complete"}</button>
          ${next ? `<a class="btn soft sm" href="#/learn/${esc(c.id)}/${esc(next.id)}">Next ${icon("arrowRight", 14)}</a>` : `<a class="btn soft sm" href="#/cards">Flashcards ${icon("arrowRight", 14)}</a>`}
        </div>
      </article>

      <aside class="col sticky-side" style="gap:12px">
        <div class="card">
          <div class="eyebrow" style="margin-bottom:7px">In this course</div>
          <div class="stack" style="gap:2px">
            ${c.lessons
              .map(
                (x, i) => `<a class="row" href="#/learn/${esc(c.id)}/${esc(x.id)}" style="gap:8px;padding:6px 8px;border-radius:8px;text-decoration:none;color:inherit;${x.id === l.id ? "background:var(--accent-soft);color:var(--accent)" : ""}">
                  <span class="tiny mono" style="width:14px;opacity:.7">${i + 1}</span>
                  <span style="font-size:12.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.title)}</span>
                  ${lessonDone(x.id) ? `<span style="color:var(--good)">${icon("check", 11)}</span>` : ""}
                </a>`
              )
              .join("")}
          </div>
        </div>
        <div>${callout("info", "Read to explain", "If you cannot re-explain a section in your own words, you have read it but not learned it. Try the questions first, then re-read.")}</div>
      </aside>
    </div>`;
  },

  mount(root, ctx) {
    const found = LESSON_INDEX.get(ctx.params.lessonId);
    if (!found) return;
    const l = found.lesson || found;
    const quizEl = root.querySelector("#quiz");
    const scoreEl = root.querySelector("#quiz-score");
    const answers = new Map();

    const scored = () => Array.from(answers.values()).filter((v) => v.correct).length;

    const renderQuiz = () => {
      if (!quizEl) return;
      quizEl.innerHTML = (l.quiz || [])
        .map((q, qi) => {
          const ans = answers.get(qi);
          return `<div class="stack" style="gap:7px" data-q="${qi}">
            <div class="quiz-q"><span class="dim mono tiny">${qi + 1}.</span> ${esc(q.question)}</div>
            ${q.options
              .map((opt, oi) => {
                const state = ans ? (oi === q.correctIndex ? "correct" : ans.choice === oi ? "wrong" : "dimmed") : "";
                return `<button class="opt ${state}" data-qi="${qi}" data-oi="${oi}" ${ans ? "disabled" : ""}>
                  <span class="key">${String.fromCharCode(65 + oi)}</span>
                  <span style="flex:1">${esc(opt)}</span>
                  ${ans && oi === q.correctIndex ? `<span style="color:var(--good)">${icon("check", 14)}</span>` : ""}
                  ${ans && ans.choice === oi && oi !== q.correctIndex ? `<span style="color:var(--critical)">${icon("x", 14)}</span>` : ""}
                </button>`;
              })
              .join("")}
            ${ans ? `<div class="explain">${esc(q.explanation || "")}</div>` : ""}
          </div>`;
        })
        .join("");
      if (scoreEl) scoreEl.textContent = `${scored()} / ${(l.quiz || []).length}`;
    };

    renderQuiz();

    quizEl?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-qi]");
      if (!btn) return;
      const qi = Number(btn.dataset.qi);
      const oi = Number(btn.dataset.oi);
      if (answers.has(qi)) return;
      const q = l.quiz[qi];
      const correct = oi === q.correctIndex;
      answers.set(qi, { choice: oi, correct });
      store.update((s) => {
        s.profile.quizzes = (s.profile.quizzes || 0) + 1;
        if (correct) s.profile.correct = (s.profile.correct || 0) + 1;
      });
      if (correct) awardXP(4);
      renderQuiz();
      const answeredAll = answers.size === l.quiz.length;
      if (answeredAll && scored() === l.quiz.length) toast("Clean sweep — every question right", "success");
    });

    root.querySelector('[data-act="complete"]')?.addEventListener("click", () => {
      const already = lessonDone(l.id);
      const score = answers.size ? scored() : 0;
      store.update((s) => {
        if (!s.lessons) s.lessons = {};
        s.lessons[l.id] = { completed: true, at: new Date().toISOString(), score, total: (l.quiz || []).length };
        s.history.unshift({ id: `h-${Date.now()}`, kind: "lesson", label: l.title, at: new Date().toISOString() });
        s.history = s.history.slice(0, 60);
      });
      if (!already) {
        awardXP(l.xp || 30);
        touchStreak();
        toast(`Lesson complete · +${l.xp} XP`, "success");
      } else {
        toast("Already completed — progress saved", "info");
      }
      ctx.rerender();
    });
  },
};

/* ------------------------------------------------------------------ */
/* Flashcards                                                          */
/* ------------------------------------------------------------------ */

const DECK_META = {
  pharmacokinetics: { name: "Pharmacokinetics", color: "#f2b23e" },
  pharmacodynamics: { name: "Pharmacodynamics", color: "#6fb3ff" },
  interactions: { name: "Interactions", color: "#f85149" },
  withdrawal: { name: "Withdrawal", color: "#d29922" },
  evidence: { name: "Evidence", color: "#3fb950" },
};

function deckMeta(id) {
  const sys = SYSTEM_BY_ID.get(id);
  if (sys) return { name: sys.name, color: sys.color, abbr: sys.abbr };
  return { ...(DECK_META[id] || { name: id, color: "var(--accent)" }), abbr: "" };
}

const session = { queue: [], idx: 0, flipped: false, reviewed: 0, started: false, filter: "" };

function startSession(filter = "") {
  const deck = filter ? FLASHCARDS.filter((c) => c.system === filter) : FLASHCARDS;
  const due = dueCards(deck);
  session.queue = (due.length ? due : deck.map((card) => ({ card, st: cardState(card.id) }))).map((x) => x.card);
  session.idx = 0;
  session.flipped = false;
  session.reviewed = 0;
  session.started = true;
  session.filter = filter;
}

function cardFaceHtml(card, flipped) {
  const m = deckMeta(card.system);
  return `<div class="flashcard ${flipped ? "flipped" : ""}" id="fc" role="button" tabindex="0" aria-label="Flashcard — tap to flip">
    <div class="fc-inner">
      <div class="fc-face">
        <div class="row" style="justify-content:center;gap:6px">
          <span class="chip" style="--dot:${m.color}"><span class="dot" style="background:${m.color}"></span>${esc(m.abbr || m.name)}</span>
        </div>
        <div class="fc-q">${esc(card.front)}</div>
        <div class="fc-hint">Tap to reveal</div>
      </div>
      <div class="fc-face fc-back">
        <div class="fc-a">${esc(card.back)}</div>
        <div class="fc-hint">Tap to flip back</div>
      </div>
    </div>
  </div>`;
}

function sessionBody() {
  if (!session.started) startSession(session.filter);
  const { queue, idx } = session;

  if (!queue.length) {
    return `<div class="card">${emptyState("layers", "Nothing due", "Every card in this deck is scheduled for later. Come back tomorrow, or study ahead.", `<button class="btn ghost sm" data-act="start">${icon("refresh", 14)} Study ahead</button>`)}</div>`;
  }
  if (idx >= queue.length) {
    return `<div class="card center" style="padding:26px">
      <div class="empty-ic" style="margin:0 auto 10px;background:rgba(63,185,80,.12);border-color:rgba(63,185,80,.3);color:var(--good)">${icon("check", 24)}</div>
      <h3 style="font-size:17px;margin-bottom:5px">Session complete</h3>
      <p class="small dim" style="margin-bottom:14px">${session.reviewed} card${session.reviewed === 1 ? "" : "s"} reviewed. The scheduler moved each one to its next due date.</p>
      <div class="row" style="gap:8px;justify-content:center">
        <button class="btn primary sm" data-act="start">${icon("refresh", 14)} Study again</button>
        <a class="btn ghost sm" href="#/learn">Back to Learn</a>
      </div>
    </div>`;
  }

  const card = queue[idx];
  const st = cardState(card.id);
  return `
  <div class="row between" style="margin-bottom:9px">
    <span class="tiny mono dim">${idx + 1} / ${queue.length}</span>
    <span class="tiny dim">${st.seen ? `seen ${st.reps}× · ease ${st.ease}` : "new card"}</span>
  </div>
  <div class="meter" style="margin-bottom:14px"><i style="width:${Math.round((idx / queue.length) * 100)}%"></i></div>
  ${cardFaceHtml(card, session.flipped)}
  <div id="fc-grades" style="margin-top:12px">
    ${
      session.flipped
        ? `<div class="grid grid-4" style="gap:6px">
            ${GRADES.map((g) => `<button class="btn ${g.cls === "danger" ? "danger" : g.cls === "soft" ? "soft" : g.cls === "primary" ? "primary" : "ghost"} sm" data-grade="${g.key}" style="flex-direction:column;gap:1px;height:auto;padding:8px 4px">
              <span>${esc(g.label)}</span><span class="tiny" style="opacity:.7;font-weight:400">${esc(nextIntervalPreview(g.key))}</span>
            </button>`).join("")}
          </div>`
        : `<div class="row" style="gap:8px">
            <button class="btn soft sm" data-act="flip" style="flex:1">${icon("eye", 14)} Reveal answer</button>
            <button class="btn ghost sm" data-act="skip">Skip</button>
          </div>`
    }
  </div>`;
}

export const cards = {
  render() {
    const stats = deckStats(FLASHCARDS);
    const systems = Array.from(new Set(FLASHCARDS.map((c) => c.system)));
    return `
    ${pageHead(
      "Flashcards",
      "Spaced repetition over the mechanisms you keep half-forgetting. Grade honestly — the schedule is only as good as your answer.",
      `<button class="btn ghost sm" data-act="start">${icon("refresh", 14)} Restart</button>`
    )}

    <div class="grid grid-4" style="gap:10px;margin-bottom:16px">
      ${statTile({ label: "Due now", value: stats.due, sub: `${stats.total} cards`, iconName: "clock" })}
      ${statTile({ label: "Learning", value: stats.learning, sub: "in rotation", iconName: "activity" })}
      ${statTile({ label: "Mature", value: stats.mature, sub: "interval 21d+", iconName: "check" })}
      ${statTile({ label: "Seen", value: stats.seen, sub: "ever reviewed", iconName: "eye" })}
    </div>

    <div class="row wrap" style="gap:5px;margin-bottom:14px" id="fc-filter">
      <button class="chip chip-btn ${!session.filter ? "on" : ""}" data-sys="">All decks</button>
      ${systems
        .map((id) => {
          const m = deckMeta(id);
          return `<button class="chip chip-btn ${session.filter === id ? "on" : ""}" data-sys="${esc(id)}" style="--dot:${m.color}"><span class="dot" style="background:${m.color}"></span>${esc(m.name)} (${systemCardCount(id)})</button>`;
        })
        .join("")}
    </div>

    <div id="fc-out" style="max-width:560px">${sessionBody()}</div>

    <div style="margin-top:22px">${callout("info", "How the scheduler works", "Cards you rate “Again” reset to zero days. “Good” multiplies the interval by the card's ease factor; “Easy” grows it faster. Long intervals mean the knowledge is durable — not that the card is done.")}</div>`;
  },

  mount(root) {
    const out = root.querySelector("#fc-out");

    const paint = () => {
      out.innerHTML = sessionBody();
    };

    root.querySelector("#fc-filter")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-sys]");
      if (!btn) return;
      root.querySelectorAll("#fc-filter [data-sys]").forEach((b) => b.classList.toggle("on", b === btn));
      startSession(btn.dataset.sys);
      paint();
    });

    root.addEventListener("click", (ev) => {
      if (ev.target.closest('[data-act="start"]')) {
        startSession(session.filter);
        paint();
        return;
      }
      if (ev.target.closest("#fc") && !ev.target.closest("[data-grade]")) {
        session.flipped = !session.flipped;
        paint();
        return;
      }
      if (ev.target.closest('[data-act="flip"]')) {
        session.flipped = true;
        paint();
        return;
      }
      if (ev.target.closest('[data-act="skip"]')) {
        session.idx += 1;
        session.flipped = false;
        paint();
        return;
      }
      const grade = ev.target.closest("[data-grade]");
      if (grade) {
        const card = session.queue[session.idx];
        if (!card) return;
        const res = gradeCard(card.id, grade.dataset.grade);
        session.reviewed += 1;
        session.idx += 1;
        session.flipped = false;
        paint();
        const nextIn = res.interval ? `next in ${res.interval}d` : "back in this session";
        toast(`${nextIn}`, grade.dataset.grade === "again" ? "warn" : "success", 1600);
      }
    });

    root.querySelector("#fc-out")?.addEventListener("keydown", (ev) => {
      if ((ev.key === " " || ev.key === "Enter") && ev.target.closest("#fc")) {
        ev.preventDefault();
        session.flipped = !session.flipped;
        paint();
      }
    });
  },
};