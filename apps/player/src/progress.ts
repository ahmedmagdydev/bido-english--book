import {
  newReview,
  updateReview,
  type Attempt,
  type Daily,
  type Review,
} from "@pagebuddy/schema";
import { db } from "./db";

const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export async function getReviews(packId: string): Promise<Map<string, Review>> {
  const rows = await db.review.where("packId").equals(packId).toArray();
  return new Map(rows.map((r) => [r.itemId, r]));
}

export async function recordAttempt(
  itemId: string,
  packId: string,
  exerciseType: string,
  correct: boolean,
  ms: number,
  lang = "en",
): Promise<void> {
  const review =
    (await db.review.get([packId, itemId])) ?? newReview(itemId, packId);
  await db.review.put(updateReview(review, correct));
  const attempt: Attempt = {
    itemId,
    packId,
    lang,
    exerciseType,
    correct,
    ms,
    ts: Date.now(),
  };
  await db.attempts.add(attempt);
}

export async function dueItems(packId: string, now = Date.now()): Promise<Review[]> {
  const reviews = await getReviews(packId);
  return [...reviews.values()].filter((r) => r.nextDue <= now);
}

export async function finishSession(stats: {
  itemsPracticed: number;
  correct: number;
  stars: number;
  minutes: number;
  lang?: string;
}): Promise<void> {
  const key = todayKey();
  const lang = stats.lang ?? "en";
  const prev = (await db.daily.get([key, lang])) as Daily | undefined;
  const itemsPracticed = (prev?.itemsPracticed ?? 0) + stats.itemsPracticed;
  const totalCorrect =
    Math.round((prev?.accuracy ?? 0) * (prev?.itemsPracticed ?? 0)) +
    stats.correct;
  await db.daily.put({
    date: key,
    lang,
    minutes: (prev?.minutes ?? 0) + stats.minutes,
    itemsPracticed,
    accuracy: itemsPracticed ? totalCorrect / itemsPracticed : 0,
    stars: (prev?.stars ?? 0) + stats.stars,
  });
}

export async function todayStats(lang = "en"): Promise<Daily | null> {
  return (await db.daily.get([todayKey(), lang])) ?? null;
}

// All daily rows for one language world (stars/items totals).
export async function langDailies(lang = "en"): Promise<Daily[]> {
  return db.daily.filter((d) => d.lang === lang).toArray();
}

// Streak with one "freeze" (plan §7.4): a single missed day doesn't break
// the chain — the freeze is consumed and the walk continues.
export async function streak(lang = "en"): Promise<number> {
  const rows = await db.daily.orderBy("date").reverse().toArray();
  const days = new Set(rows.filter((r) => r.lang === lang).map((r) => r.date));
  if (!days.size) return 0;
  let count = 0;
  let freezes = 1;
  const cursor = new Date();
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    if (days.has(todayKey(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (freezes > 0) {
      // a freeze only helps across a real gap — the day after must exist
      const after = new Date(cursor);
      after.setDate(after.getDate() - 1);
      if (days.has(todayKey(after))) {
        freezes--;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }
    break;
  }
  return count;
}
