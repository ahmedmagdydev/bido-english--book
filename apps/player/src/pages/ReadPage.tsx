import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../store";
import { packUrl } from "../pack";
import { playPackClip, stopAll } from "../audio";
import type { SentenceItem } from "@pagebuddy/schema";

export default function ReadPage() {
  const { pack, loadPack } = useApp();
  const [i, setI] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [liveWord, setLiveWord] = useState(-1);
  const [auto, setAuto] = useState(false);
  const playToken = useRef(0);
  const autoRef = useRef(false);
  const timers = useRef<number[]>([]);
  const paraEls = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    loadPack();
    return () => {
      autoRef.current = false;
      clearTimers();
      stopAll();
    };
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const stopPlayback = () => {
    stopAll();
    clearTimers();
    setLiveWord(-1);
  };

  const changePage = (n: number) => {
    autoRef.current = false;
    setAuto(false);
    stopPlayback();
    setPlayingId(null);
    setI(n);
  };

  if (!pack || !pack.pages?.length) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading pages…</p>
        </div>
      </div>
    );
  }

  const page = pack.pages[i];
  const sentences = pack.sentences.filter((s) => s.sourcePage === page.page);
  const words = pack.vocab.filter((v) => v.sourcePage === page.page);

  // plays one paragraph + karaoke word highlight; resolves when clip ends
  const playPara = async (s: SentenceItem) => {
    const token = ++playToken.current;
    stopAll();
    clearTimers();
    setPlayingId(s.id);
    setLiveWord(-1);
    if (autoRef.current)
      paraEls.current
        .get(s.id)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    try {
      const r = await playPackClip(pack.packId, s.audio.normal);
      // approximate karaoke: split clip duration across words by length
      const ws = s.text.split(/\s+/);
      const weights = ws.map((w) => w.length + 0.5);
      const total = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      ws.forEach((_, wi) => {
        const at = (acc / total) * r.duration * 1000;
        timers.current.push(
          window.setTimeout(() => setLiveWord(wi), Math.max(0, at - 50)),
        );
        acc += weights[wi];
      });
      await r.done;
    } catch {}
    clearTimers();
    if (playToken.current === token) {
      setPlayingId(null);
      setLiveWord(-1);
    }
  };

  const tapPara = (s: SentenceItem) => {
    autoRef.current = false;
    setAuto(false);
    if (playingId === s.id) {
      stopPlayback();
      setPlayingId(null);
      return;
    }
    playPara(s);
  };

  const readAll = async () => {
    if (auto) {
      autoRef.current = false;
      setAuto(false);
      stopPlayback();
      setPlayingId(null);
      return;
    }
    autoRef.current = true;
    setAuto(true);
    for (const s of sentences) {
      if (!autoRef.current || !s.audio?.normal) break;
      await playPara(s);
    }
    autoRef.current = false;
    setAuto(false);
  };

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 0 }}>Read the story</h1>
        <a href="#/" style={{ opacity: 0.6 }}>
          ← home
        </a>
      </div>

      <div className="card chunk sky" style={{ padding: 8 }}>
        <img
          src={packUrl(pack.packId, page.image)}
          alt={`book page ${page.page}`}
          className="reader-img"
        />
      </div>

      {sentences.length > 0 && (
        <div className="card story-card">
          <div className="story-head">
            <p className="exercise-label" style={{ margin: 0 }}>
              📖 Tap a paragraph to hear it
            </p>
            <button className="chunk-btn mint read-all" onClick={readAll}>
              {auto ? "⏹ stop" : "▶ read it all"}
            </button>
          </div>
          {sentences.map((s) => (
            <motion.p
              key={s.id}
              ref={(el) => {
                if (el) paraEls.current.set(s.id, el);
              }}
              className={`story-para ${playingId === s.id ? "playing" : ""}`}
              onClick={() => s.audio?.normal && tapPara(s)}
              whileTap={{ scale: 0.99 }}
            >
              <span className="para-icon">
                {playingId === s.id ? "⏸" : "▶"}
              </span>
              <span className="para-text">
                {s.speaker && <b>{s.speaker}: </b>}
                {s.text.split(/\s+/).map((w, wi) => (
                  <span
                    key={wi}
                    className={
                      playingId === s.id && wi === liveWord
                        ? "word-live"
                        : undefined
                    }
                  >
                    {w}{" "}
                  </span>
                ))}
              </span>
            </motion.p>
          ))}
        </div>
      )}

      {words.length > 0 && (
        <div className="card">
          <p className="exercise-label">Words on this page</p>
          <div className="row">
            {words.map((v) => (
              <button
                key={v.id}
                className="token-btn"
                onClick={() => {
                  autoRef.current = false;
                  setAuto(false);
                  stopPlayback();
                  setPlayingId(null);
                  playPackClip(pack.packId, v.audio.normal).catch(() => {});
                }}
              >
                🔊 {v.word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <button
          className="secondary"
          disabled={i === 0}
          onClick={() => changePage(i - 1)}
        >
          ← Back
        </button>
        <span className="badge">
          {i + 1} / {pack.pages.length}
        </span>
        <button
          className="secondary"
          disabled={i === pack.pages.length - 1}
          onClick={() => changePage(i + 1)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
