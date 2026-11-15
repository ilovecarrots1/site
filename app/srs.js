/* Spaced repetition scheduler (SM-2 style, simplified for single-session use). */

import { store, dayKey, daysBetween, uid } from "./core.js";
import { FLASHCARDS } from "./data/learn.js";

export const GRADES = [
  { key: "again", label: "Again", hint: "Forgot", quality: 1, cls: "danger" },
  { key: "hard", label: "Hard", hint: "Struggled", quality: 3, cls: "ghost" },
  { key: "good", label: "Good", hint: "Recalled", quality: 4, cls: "soft" },
  { key: "easy", label: "Easy", hint: "Instant", quality: 5, cls: "primary" },
];

function blank() {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: null, seen: null };
}

export function cardState(cardId) {
  const s = store.data.srs || {};
  return { ...blank(), ...(s[cardId] || {}) };
}

/** Cards that are due (or never seen), ordered: unseen first, then earliest due. */
export function dueCards(deck = FLASHCARDS) {
  const today = dayKey();
  return deck
    .map((card) => {
      const st = cardState(card.id);
      const due = st.due || null;
      const overdue = due ? daysBetween(due, today) : 0;
      const isDue = !due || overdue >= 0;
      return { card, st, isDue, overdue: due ? overdue : 0 };
    })
    .filter((x) => x.isDue)
    .sort(
      (a, b) =>
        Number(!!a.st.seen) - Number(!!b.st.seen) ||
        (b.overdue || 0) - (a.overdue || 0) ||
        a.card.id.localeCompare(b.card.id)
    );
}

export function deckStats(deck = FLASHCARDS) {
  const today = dayKey();
  let due = 0;
  let learning = 0;
  let mature = 0;
  let seen = 0;
  for (const card of deck) {
    const st = cardState(card.id);
    if (st.seen) seen++;
    if (st.interval >= 21) mature++;
    else if (st.seen) learning++;
    if (!st.due || daysBetween(st.due, today) >= 0) due++;
  }
  return { due, learning, mature, seen, total: deck.length };
}

/**
 * Grade a card and reschedule it.
 * @returns {{interval:number, due:string, ease:number}}
 */
export function gradeCard(cardId, grade) {
  const q = GRADES.find((g) => g.key === grade)?.quality ?? 4;
  return store.update((s) => {
    if (!s.srs) s.srs = {};
    const prev = { ...blank(), ...(s.srs[cardId] || {}) };
    let ease = prev.ease;
    let interval = prev.interval;
    let lapses = prev.lapses;
    let reps = prev.reps;

    if (q < 3) {
      lapses += 1;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
      reps = 0;
    } else {
      reps += 1;
      interval = scheduleInterval(prev.interval, ease, q);
      ease = Math.min(3.0, Math.max(1.3, ease + (q === 5 ? 0.1 : q === 3 ? -0.15 : 0)));
    }

    const due = new Date();
    due.setDate(due.getDate() + (interval || 0));
    const next = {
      ease: Math.round(ease * 100) / 100,
      interval,
      reps,
      lapses,
      due: dayKey(due),
      seen: new Date().toISOString(),
    };
    s.srs[cardId] = next;
    if (grade === "again") {
      if (!Array.isArray(s.history)) s.history = [];
      s.history.unshift({ id: uid("h"), kind: "card", label: `Reviewed card (again)`, at: new Date().toISOString() });
      s.history = s.history.slice(0, 60);
    }
    return { interval, due: next.due, ease: next.ease };
  });
}

/** Interval (in days) the scheduler produces for this grade and previous interval. */
function scheduleInterval(prevInterval, ease, q) {
  if (q < 3) return 0;
  if (!prevInterval) return q === 5 ? 6 : q === 4 ? 3 : 1;
  const factor = q === 5 ? ease * 1.3 : q === 4 ? ease : 1.2;
  return Math.max(1, Math.round(prevInterval * factor));
}

function humanDays(days) {
  if (!days) return "now";
  if (days === 1) return "tomorrow";
  if (days < 30) return days + " days";
  if (days < 365) return Math.round(days / 30) + " mo";
  return (days / 365).toFixed(1) + " yr";
}

/** Preview matching exactly what gradeCard would schedule for this card. */
export function nextIntervalPreview(grade, cardId) {
  const g = GRADES.find((x) => x.key === grade);
  const q = g ? g.quality : 4;
  const st = cardId ? cardState(cardId) : blank();
  const ease = q === 3 ? Math.max(1.3, st.ease - 0.15) : q === 5 ? Math.min(3, st.ease + 0.1) : st.ease;
  return humanDays(scheduleInterval(st.interval, ease, q));
}