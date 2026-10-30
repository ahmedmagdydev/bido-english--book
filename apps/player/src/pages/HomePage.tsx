import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unlockAudio } from "../audio";
import Mascot from "../components/Mascot";
import { useApp } from "../store";
import { streak, todayStats } from "../progress";
import type { Daily } from "@pagebuddy/schema";

const GOAL_MINUTES = 10;

export default function HomePage() {
  const { loadPack } = useApp();
  const [day, setDay] = useState<Daily | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [packTitle, setPackTitle] = useState("");

  useEffect(() => {
    (async () => {
      const p = await loadPack().catch(() => null);
      setPackTitle(p?.title ?? "no pack yet");
      setDay(await todayStats());
      setStreakDays(await streak());
    })();
  }, []);

  const ringPct = Math.min(1, (day?.minutes ?? 0) / GOAL_MINUTES);

  return (
    <div className="page no-select">
      <div className="home-top">
        <div>
          <h1 style={{ marginBottom: 0 }}>PageBuddy</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>{packTitle}</p>
        </div>
        <div className="goal-ring" style={{ ["--pct" as string]: ringPct * 360 }}>
          <span>{day?.minutes ?? 0}m</span>
        </div>
      </div>

      {streakDays > 0 && (
        <p className="badge" style={{ fontSize: "1rem" }}>
          🔥 {streakDays}-day streak
        </p>
      )}

      <div className="card" style={{ textAlign: "center", padding: "20px 16px 36px" }}>
        <Mascot size={140} animate />
        <div>
          <motion.a
            href="#/session"
            onClick={() => unlockAudio()}
            className="play-btn"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.94 }}
            style={{ marginTop: 8 }}
          >
            ▶ Play
          </motion.a>
        </div>
      </div>

      <div className="card">
        <p><a href="#/read">📖 Read the story →</a></p>
      </div>

      <div className="card">
        <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
          today: {day?.itemsPracticed ?? 0} words · {day?.stars ?? 0} ⭐ ·{" "}
          <a href="#/spike">device spike</a>
        </p>
      </div>
    </div>
  );
}
