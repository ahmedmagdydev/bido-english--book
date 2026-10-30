import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ProgressExportSchema, type Attempt } from "@pagebuddy/schema";
import { db } from "../db";
import { useApp } from "../store";
import { streak } from "../progress";
import { sfx } from "../audio";

interface Stats {
  week: { date: string; minutes: number }[];
  totalMinutes: number;
  totalStars: number;
  accuracy: number | null;
  streakDays: number;
  wordsReviewed: number;
  hardest: { itemId: string; label: string; acc: number; tries: number }[];
  prompts: { question: string; answer: string; passage: string }[];
  persisted: boolean | null;
}

function Gate({ onPass }: { onPass: () => void }) {
  const [a, setA] = useState(() => 6 + Math.floor(Math.random() * 4));
  const [b, setB] = useState(() => 5 + Math.floor(Math.random() * 5));
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);

  const check = () => {
    if (parseInt(answer, 10) === a + b) {
      onPass();
    } else {
      setWrong(true);
      setAnswer("");
      setA(6 + Math.floor(Math.random() * 4));
      setB(5 + Math.floor(Math.random() * 5));
    }
  };

  return (
    <div className="page no-select">
      <h1>Parents only</h1>
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem" }}>Quick grown-up check:</p>
        <motion.p
          key={`${a}+${b}`}
          className="big-word"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {a} + {b} = ?
        </motion.p>
        <div className="row" style={{ justifyContent: "center", gap: 8 }}>
          <input
            className="pin-input"
            inputMode="numeric"
            value={answer}
            onChange={(e) => {
              setWrong(false);
              setAnswer(e.target.value.replace(/\D/g, ""));
            }}
            onKeyDown={(e) => e.key === "Enter" && check()}
            autoFocus
          />
          <button className="btn" onClick={check}>
            Go
          </button>
        </div>
        {wrong && <p style={{ color: "#e0742a" }}>Hmm, try again 🙂</p>}
      </div>
      <p style={{ textAlign: "center", opacity: 0.6 }}>
        <a href="#/">← back</a>
      </p>
    </div>
  );
}

function fmtDate(d: string) {
  return d.slice(5); // MM-DD
}

export default function ParentPage() {
  const { loadPack } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      const [dailies, reviews, attempts, pack, persistedRow] = await Promise.all(
        [
          db.daily.orderBy("date").toArray(),
          db.review.toArray(),
          db.attempts.toArray(),
          loadPack().catch(() => null),
          db.settings.get("storagePersisted"),
        ],
      );

      // last 7 days minutes
      const byDate = new Map(dailies.map((d) => [d.date, d]));
      const week: { date: string; minutes: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        week.push({ date: k, minutes: byDate.get(k)?.minutes ?? 0 });
      }

      // hardest words: ≥2 attempts, lowest accuracy first
      const labelOf = new Map<string, string>();
      for (const v of pack?.vocab ?? []) labelOf.set(v.id, v.word);
      for (const s of pack?.sentences ?? [])
        labelOf.set(s.id, s.text.split(" ").slice(0, 4).join(" ") + "…");
      const byItem = new Map<string, { ok: number; n: number }>();
      for (const a of attempts as Attempt[]) {
        const e = byItem.get(a.itemId) ?? { ok: 0, n: 0 };
        e.n++;
        if (a.correct) e.ok++;
        byItem.set(a.itemId, e);
      }
      const hardest = [...byItem.entries()]
        .filter(([, e]) => e.n >= 2)
        .map(([itemId, e]) => ({
          itemId,
          label: labelOf.get(itemId) ?? itemId,
          acc: e.ok / e.n,
          tries: e.n,
        }))
        .sort((x, y) => x.acc - y.acc || y.tries - x.tries)
        .slice(0, 10);

      // conversation prompts from the pack's comprehension questions —
      // "ask him tonight" ideas for real book talk (research pick)
      const comps = (pack?.exercises ?? []).filter(
        (e) => e.type === "comprehension" && e.approved,
      );
      const prompts = [...comps]
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map((e) => {
          const pl = e.payload as {
            question?: string;
            answer?: string | boolean;
            passage?: string;
          };
          return {
            question: pl.question ?? "",
            answer: String(pl.answer ?? ""),
            passage: pl.passage ?? "",
          };
        })
        .filter((x) => x.question);

      setStats({
        week,
        totalMinutes: dailies.reduce((s, d) => s + d.minutes, 0),
        totalStars: dailies.reduce((s, d) => s + d.stars, 0),
        accuracy: attempts.length
          ? (attempts as Attempt[]).filter((a) => a.correct).length /
            attempts.length
          : null,
        streakDays: await streak(),
        wordsReviewed: reviews.length,
        hardest,
        prompts,
        persisted: persistedRow ? Boolean(persistedRow.value) : null,
      });
    })();
  }, [unlocked]);

  const doExport = async () => {
    sfx.tap();
    const data = {
      app: "pagebuddy" as const,
      formatVersion: 1 as const,
      exportedAt: Date.now(),
      packs: await db.packs.toArray(),
      review: await db.review.toArray(),
      daily: await db.daily.toArray(),
      settings: Object.fromEntries(
        (await db.settings.toArray()).map((s) => [s.key, s.value]),
      ),
      attempts: await db.attempts.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagebuddy-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Progress downloaded ⬇");
  };

  const doImport = async (file: File) => {
    setMsg("");
    try {
      const raw = JSON.parse(await file.text());
      const parsed = ProgressExportSchema.safeParse(raw);
      if (!parsed.success) {
        setMsg("That doesn't look like a PageBuddy progress file.");
        return;
      }
      const d = parsed.data;
      await db.transaction("rw", db.review, db.daily, db.packs, db.settings, db.attempts, async () => {
        await db.review.bulkPut(d.review);
        await db.daily.bulkPut(d.daily);
        await db.packs.bulkPut(d.packs);
        for (const [key, value] of Object.entries(d.settings))
          await db.settings.put({ key, value });
        const attempts = (raw.attempts ?? []) as Attempt[];
        if (attempts.length) await db.attempts.bulkAdd(attempts);
      });
      setMsg(`Imported ${d.review.length} reviews, ${d.daily.length} days ✓`);
      setUnlocked(false);
      setUnlocked(true);
    } catch {
      setMsg("Couldn't read that file.");
    }
  };

  const maxMin = useMemo(
    () => Math.max(1, ...(stats?.week.map((w) => w.minutes) ?? [1])),
    [stats],
  );

  if (!unlocked) return <Gate onPass={() => setUnlocked(true)} />;

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1>Parent area</h1>
        <a href="#/" style={{ opacity: 0.6 }}>
          ← home
        </a>
      </div>

      {!stats ? (
        <div className="card">loading…</div>
      ) : (
        <>
          <div className="card stat-grid">
            <div className="stat">
              <b>{stats.streakDays}</b>
              <span>day streak 🔥</span>
            </div>
            <div className="stat">
              <b>{Math.round(stats.totalMinutes)}</b>
              <span>minutes total</span>
            </div>
            <div className="stat">
              <b>{stats.totalStars}</b>
              <span>stars ⭐</span>
            </div>
            <div className="stat">
              <b>
                {stats.accuracy == null ? "—" : `${Math.round(stats.accuracy * 100)}%`}
              </b>
              <span>accuracy</span>
            </div>
          </div>

          <div className="card">
            <h3>This week</h3>
            <div className="week-bars">
              {stats.week.map((w) => (
                <div key={w.date} className="week-col" title={`${w.date}: ${w.minutes}m`}>
                  <motion.div
                    className="week-bar"
                    initial={{ height: 0 }}
                    animate={{ height: `${(w.minutes / maxMin) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 22 }}
                  />
                  <span>{fmtDate(w.date).slice(3)}</span>
                </div>
              ))}
            </div>
          </div>

          {stats.prompts.length > 0 && (
            <div className="card">
              <h3>💬 Ask him tonight</h3>
              <ul className="hard-list">
                {stats.prompts.map((pr, i) => (
                  <li key={i} style={{ display: "block" }}>
                    <span style={{ fontWeight: 600 }}>{pr.question}</span>
                    <span style={{ display: "block", fontSize: "0.85rem", opacity: 0.65 }}>
                      answer: {pr.answer === "true" ? "yes, true" : pr.answer === "false" ? "no, false" : pr.answer}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                Story questions from his pack — ask at dinner, no pressure.
              </p>
            </div>
          )}

          <div className="card">
            <h3>Trickiest words</h3>
            {stats.hardest.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No data yet — play a session first.</p>
            ) : (
              <ul className="hard-list">
                {stats.hardest.map((h) => (
                  <li key={h.itemId}>
                    <span>{h.label}</span>
                    <span>
                      {Math.round(h.acc * 100)}% · {h.tries} tries
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
              {stats.wordsReviewed} items tracked
              {stats.persisted != null &&
                ` · storage ${stats.persisted ? "persisted ✓" : "not persisted (Safari may evict)"}`}
            </p>
          </div>

          <div className="card">
            <h3>Backup</h3>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={doExport}>
                ⬇ Export progress
              </button>
              <label className="btn btn-link" style={{ border: "2px solid #d7dceb" }}>
                ⬆ Import
                <input
                  type="file"
                  accept="application/json"
                  hidden
                  onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
                />
              </label>
            </div>
            {msg && <p>{msg}</p>}
          </div>
        </>
      )}
    </div>
  );
}
