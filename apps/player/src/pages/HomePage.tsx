import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unlockAudio, playPackClip } from "../audio";
import Mascot from "../components/Mascot";
import { useApp } from "../store";
import { streak, todayStats, langDailies } from "../progress";
import { t } from "../strings";
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
      // every stat belongs to this language's world — switching worlds
      // swaps stars/streak/goal, just like a separate app
      const lang = p?.language ?? "en";
      setDay(await todayStats(lang));
      setStreakDays(await streak(lang));
      const dailies = await langDailies(lang);
      setTotalStars(dailies.reduce((s, d) => s + d.stars, 0));
    })();
  }, []);

  const petStage =
    totalStars >= 30 ? "buddy" : totalStars >= 10 ? "hatched" : "egg";
  const nextStage = PET_STAGES.find((s) => totalStars < s.at);
  const lang = pack?.language;

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 6 }}>PageBuddy</h1>
        <a href="#/lang" className="lang-chip" title="switch world">
          {lang === "ar" ? "🌐 English" : "🌐 العربية"}
        </a>
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
            {t(lang, "play")}
          </motion.a>
        </div>
      </div>

      {pack && pack.vocab.length > 0 && (
        <div className="vocab-banner">
          <span className="banner-tag">{t(lang, "lessonWords")}</span>
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
          <span className="mode-title">{t(lang, "sayIt")}</span>
          <span className="mode-sub">{t(lang, "sayItSub")}</span>
        </a>
        <a href="#/read" className="mode-card sky">
          <span className="mode-icon">📖</span>
          <span className="mode-title">{t(lang, "read")}</span>
          <span className="mode-sub">{t(lang, "readSub")}</span>
        </a>
        <a href="#/map" className="mode-card sun">
          <span className="mode-icon">🗺</span>
          <span className="mode-title">{t(lang, "journey")}</span>
          <span className="mode-sub">{t(lang, "journeySub")}</span>
        </a>
        <a href="#/rewards" className="mode-card grape">
          <span className="mode-icon">🏅</span>
          <span className="mode-title">{t(lang, "stickers")}</span>
          <span className="mode-sub">{t(lang, "stickersSub")}</span>
        </a>
        <a href="#/boss" className="mode-card pink">
          <span className="mode-icon">🏰</span>
          <span className="mode-title">{t(lang, "boss")}</span>
          <span className="mode-sub">{t(lang, "bossSub")}</span>
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
            {petStage === "egg" && t(lang, "petComing")}
            {petStage === "hatched" && t(lang, "petHatched")}
            {petStage === "buddy" && t(lang, "petBuddy")}
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
