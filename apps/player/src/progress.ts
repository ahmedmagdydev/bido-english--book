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
): Promise<void> {
  const review =
    (await db.review.get(itemId)) ?? newReview(itemId, packId);
  await db.review.put(updateReview(review, correct));
  const attempt: Attempt = {
    itemId,
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
}): Promise<void> {
  const key = todayKey();
  const prev = (await db.daily.get(key)) as Daily | undefined;
  const itemsPracticed = (prev?.itemsPracticed ?? 0) + stats.itemsPracticed;
  const totalCorrect =
    Math.round((prev?.accuracy ?? 0) * (prev?.itemsPracticed ?? 0)) +
    stats.correct;
  await db.daily.put({
    date: key,
    minutes: (prev?.minutes ?? 0) + stats.minutes,
    itemsPracticed,
    accuracy: itemsPracticed ? totalCorrect / itemsPracticed : 0,
    stars: (prev?.stars ?? 0) + stats.stars,
  });
}

export async function todayStats(): Promise<Daily | null> {
  return (await db.daily.get(todayKey())) ?? null;
}

export async function streak(): Promise<number> {
  // consecutive days with any practice, ending today or yesterday
  const rows = await db.daily.orderBy("date").reverse().toArray();
  if (!rows.length) return 0;
  const days = new Set(rows.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
