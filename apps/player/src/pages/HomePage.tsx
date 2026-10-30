import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unlockAudio, playPackClip } from "../audio";
import Mascot from "../components/Mascot";
import { useApp } from "../store";
import { streak, todayStats } from "../progress";
import { db } from "../db";
import type { Daily, LessonPack } from "@pagebuddy/schema";

const GOAL_MINUTES = 10;
const PET_STAGES = [
  { at: 10, label: "hatches" },
  { at: 30, label: "stands up" },
  { at: 60, label: "gets a crown" },
  { at: 120, label: "super buddy" },
];

export default function HomePage() {
  const { loadPack } = useApp();
  const [day, setDay] = useState<Daily | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [pack, setPack] = useState<LessonPack | null>(null);

  useEffect(() => {
    (async () => {
      const p = await loadPack().catch(() => null);
      setPack(p);
      setDay(await todayStats());
      setStreakDays(await streak());
      const dailies = await db.daily.toArray();
      setTotalStars(dailies.reduce((s, d) => s + d.stars, 0));
    })();
  }, []);

  const petStage =
    totalStars >= 30 ? "buddy" : totalStars >= 10 ? "hatched" : "egg";
  const nextStage = PET_STAGES.find((s) => totalStars < s.at);

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 6 }}>PageBuddy</h1>
        <div className="stat-pills">
          <span className="stat-pill">⭐ {totalStars}</span>
          <span className="stat-pill">🔥 {streakDays}</span>
          <span className="stat-pill">
            🎯 {day?.minutes ?? 0}<small>/{GOAL_MINUTES}m</small>
          </span>
        </div>
      </div>

      <div className="card chunk sky" style={{ textAlign: "center", padding: "14px 16px 30px" }}>
        <p style={{ margin: "0 0 4px", fontWeight: 800, opacity: 0.65, fontSize: "0.9rem" }}>
          {pack?.title ?? "no pack yet"}
        </p>
        <Mascot size={120} animate />
        <div>
          <motion.a
            href="#/session"
            onClick={() => unlockAudio()}
            className="chunk-btn coral"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.94 }}
            style={{
              display: "inline-block",
              fontSize: "1.5rem",
              fontWeight: 800,
              minWidth: 220,
              minHeight: 76,
              lineHeight: "76px",
              textDecoration: "none",
              marginTop: 6,
            }}
          >
            ▶ Play
          </motion.a>
        </div>
      </div>

      {pack && pack.vocab.length > 0 && (
        <div className="vocab-banner">
          <span className="banner-tag">📖 this lesson's words</span>
          <div className="vocab-chips">
            {pack.vocab.slice(0, 8).map((v) => (
              <button
                key={v.id}
                className="vocab-chip"
                onClick={() =>
                  v.audio?.normal &&
                  playPackClip(pack.packId, v.audio.normal).catch(() => {})
                }
              >
                {v.word}
              </button>
            ))}
            {pack.vocab.length > 8 && (
              <span className="vocab-chip" style={{ opacity: 0.7 }}>
                +{pack.vocab.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mode-grid">
        <a href="#/speak" className="mode-card mint">
          <span className="mode-icon">🎤</span>
          <span className="mode-title">Say it!</span>
          <span className="mode-sub">record &amp; listen</span>
        </a>
        <a href="#/read" className="mode-card sky">
          <span className="mode-icon">📖</span>
          <span className="mode-title">Read</span>
          <span className="mode-sub">the story</span>
        </a>
        <a href="#/map" className="mode-card sun">
          <span className="mode-icon">🗺</span>
          <span className="mode-title">Journey</span>
          <span className="mode-sub">your path</span>
        </a>
        <a href="#/rewards" className="mode-card grape">
          <span className="mode-icon">🏅</span>
          <span className="mode-title">Stickers</span>
          <span className="mode-sub">your prizes</span>
        </a>
        <a href="#/boss" className="mode-card pink">
          <span className="mode-icon">🏰</span>
          <span className="mode-title">Boss</span>
          <span className="mode-sub">tricky words</span>
        </a>
      </div>

      <div className="pet-card">
        <div className="pet-stage">
          {petStage === "egg" && <div className="egg">🥚</div>}
          {petStage === "hatched" && <div className="egg">🐣</div>}
          {petStage === "buddy" && <Mascot size={100} animate />}
        </div>
        <div className="pet-body">
          <h3>
            {petStage === "egg" && "Your buddy is coming!"}
            {petStage === "hatched" && "Buddy hatched!"}
            {petStage === "buddy" && "Buddy the fox!"}
          </h3>
          <div className="pet-track">
            <div
              className="pet-fill"
              style={{
                width: `${Math.min(100, (totalStars / (nextStage?.at ?? 120)) * 100)}%`,
              }}
            />
          </div>
          <div className="pet-milestones">
            {PET_STAGES.map((s) => (
              <span
                key={s.at}
                className={`pet-mile ${totalStars >= s.at ? "done" : "locked"}`}
              >
                {totalStars >= s.at ? "⭐" : "🔒"}
                <br />
                {s.at}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.8rem", opacity: 0.6, textAlign: "center" }}>
        today: {day?.itemsPracticed ?? 0} words · {day?.stars ?? 0} ⭐ ·{" "}
        <a href="#/parent">parent area</a> · <a href="#/spike">device spike</a>
      </p>
    </div>
  );
}
