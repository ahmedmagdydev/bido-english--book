import type { Review } from "./progress.js";

// Plan Appendix C: gentle Leitner. Box 1..6, intervals indexed by box - 1.
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function updateReview(r: Review, correct: boolean, now = Date.now()): Review {
  const box = correct ? Math.min(r.box + 1, 6) : Math.max(r.box - 2, 1);
  const days = INTERVAL_DAYS[box - 1];
  return {
    ...r,
    box,
    streak: correct ? r.streak + 1 : 0,
    lapses: correct ? r.lapses : r.lapses + 1,
    lastSeen: now,
    nextDue: now + days * 24 * 60 * 60 * 1000,
  };
}

export function newReview(itemId: string, packId: string, now = Date.now()): Review {
  return { itemId, packId, box: 1, nextDue: now, streak: 0, lapses: 0, lastSeen: now };
}

export function isMastered(r: Review): boolean {
  return r.box === 6 && r.streak >= 2;
}
