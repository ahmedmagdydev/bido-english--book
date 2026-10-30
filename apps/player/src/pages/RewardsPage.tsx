import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../db";
import { streak } from "../progress";
import type { Attempt } from "@pagebuddy/schema";

interface Sticker {
  id: string;
  img?: string;
  emoji: string;
  label: string;
  how: string;
  earned: boolean;
}

export default function RewardsPage() {
  const [stickers, setStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    (async () => {
      const [dailies, attempts, streakDays, bossRow] = await Promise.all([
        db.daily.toArray(),
        db.attempts.toArray() as Promise<Attempt[]>,
        streak(),
        db.settings.get("bossClears"),
      ]);
      const stars = dailies.reduce((s, d) => s + d.stars, 0);
      const items = dailies.reduce((s, d) => s + d.itemsPracticed, 0);
      const retries = attempts.filter((a) => !a.correct).length;
      const spoken = attempts.filter(
        (a) => a.exerciseType === "speakCompare",
      ).length;
      const sessions = dailies.filter((d) => d.itemsPracticed > 0).length;
      const bossClears = Number(bossRow?.value) || 0;

      setStickers([
        {
          id: "first",
          img: "art/mascot.png",
          emoji: "🦊",
          label: "First Steps",
          how: "finish your first session",
          earned: sessions >= 1,
        },
        {
          id: "streak3",
          emoji: "🔥",
          label: "Warming Up",
          how: "3-day streak",
          earned: streakDays >= 3,
        },
        {
          id: "streak7",
          img: "art/sticker-rocket.png",
          emoji: "🚀",
          label: "Week Warrior",
          how: "7-day streak",
          earned: streakDays >= 7,
        },
        {
          id: "stars10",
          img: "art/sticker-star.png",
          emoji: "⭐",
          label: "Star Collector",
          how: "earn 10 stars",
          earned: stars >= 10,
        },
        {
          id: "stars50",
          emoji: "🌟",
          label: "Super Star",
          how: "earn 50 stars",
          earned: stars >= 50,
        },
        {
          id: "chest",
          img: "art/sticker-chest.png",
          emoji: "🧰",
          label: "Word Hoarder",
          how: "practise 100 items",
          earned: items >= 100,
        },
        {
          id: "retry",
          emoji: "💪",
          label: "Never Give Up",
          how: "try again 10 times",
          earned: retries >= 10,
        },
        {
          id: "voice",
          emoji: "🎤",
          label: "Voice Star",
          how: "say 5 words aloud",
          earned: spoken >= 5,
        },
        {
          id: "boss",
          emoji: "🏰",
          label: "Boss Tamer",
          how: "beat a boss round",
          earned: bossClears >= 1,
        },
      ]);
    })();
  }, []);

  const earnedCount = stickers.filter((s) => s.earned).length;

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 0 }}>Stickers 🏅</h1>
        <a href="#/" style={{ opacity: 0.6 }}>
          ← home
        </a>
      </div>

      <p style={{ textAlign: "center", opacity: 0.75 }}>
        {earnedCount} / {stickers.length} collected
      </p>

      <div className="sticker-grid">
        {stickers.map((s, i) => (
          <motion.div
            key={s.id}
            className={`sticker ${s.earned ? "earned" : "locked"}`}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
            whileTap={s.earned ? { scale: 1.12, rotate: 6 } : {}}
          >
            {s.img && s.earned ? (
              <img src={s.img} alt={s.label} className="sticker-img" />
            ) : (
              <span className="sticker-emoji">{s.earned ? s.emoji : "🔒"}</span>
            )}
            <b>{s.label}</b>
            <span>{s.earned ? "earned!" : s.how}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
