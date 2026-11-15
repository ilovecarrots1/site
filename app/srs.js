/* Spaced repetition scheduler (SM-2 style, simplified for single-session use). */

import { store, dayKey, daysBetween, uid } from "./core.js";
import { FLASHCARDS } from "./data/learn.js";

export const GRADES = [
  { key: "again", label: "Again", hint: "Forgot", quality: 1, cls: "danger" },
  { key: "hard", label: "Hard", hint: "Struggled", quality: 3, cls: "ghost" },
  { key: "good", label: "Good", hint: "Recalled", quality: 4, cls: "soft" },
  { key: "easy", label: "Easy", hint: "Instant", quality: 5, cls: "primary" },
];

const DAY = 1;

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
    .sort((a, b) => (b.overdue || 0) - (a.overdue || 0) || a.card.id.localeCompare(b.card.id));
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
      if (prev.interval === 0) {
        interval = q === 5 ? 3 : q === 4 ? 1 : 1;
      } else {
        const factor = q === 3 ? 1.2 : q === 4 ? ease : ease * 1.3;
        interval = Math.max(1, Math.round(prev.interval * factor));
      }
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
      s.history.unshift({ id: uid("h"), kind: "card", label: `Reviewed card (again)`, at: new Date().toISOString() });
      s.history = s.history.slice(0, 60);
    }
    return { interval, due: next.due, ease: next.ease };
  });
}

export function nextIntervalPreview(grade) {
  const map = { again: "now", hard: "1 day", good: "2 days", easy: "4 days" };
  return map[grade] || "";
}