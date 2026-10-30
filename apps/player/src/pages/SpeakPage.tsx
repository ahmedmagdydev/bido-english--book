import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../store";
import { playPackClip, playClips, getAudioContext, sfx } from "../audio";
import { popConfetti } from "../celebrate";
import { recordAttempt, getReviews } from "../progress";
import Mascot from "../components/Mascot";

interface Item {
  id: string;
  text: string;
  audio: string;
  slow?: string;
  kind: "word" | "sentence";
}

type Stage = "listen" | "ready" | "recording" | "recorded";

const mime = (() => {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
})();

export default function SpeakPage() {
  const { loadPack } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("listen");
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [micErr, setMicErr] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [packId, setPackId] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const levelRef = useRef<HTMLDivElement | null>(null);
  const meterSrcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    (async () => {
      const pack = await loadPack().catch(() => null);
      if (!pack) return;
      setPackId(pack.packId);
      const reviews = await getReviews(pack.packId);
      const now = Date.now();
      const due = (id: string) => (reviews.get(id)?.nextDue ?? 0) <= now;
      const words: Item[] = pack.vocab
        .filter((v) => v.audio?.normal)
        .map((v) => ({
          id: v.id,
          text: v.word,
          audio: v.audio!.normal,
          slow: v.audio!.slow,
          kind: "word" as const,
        }));
      const sents: Item[] = pack.sentences
        .filter(
          (s) => s.audio?.normal && s.text.split(" ").length <= 9,
        )
        .map((s) => ({
          id: s.id,
          text: s.text,
          audio: s.audio!.normal,
          slow: s.audio!.slow,
          kind: "sentence" as const,
        }));
      // due items first, then a spread of the rest
      const all = [
        ...words.filter((w) => due(w.id)),
        ...sents.filter((s) => due(s.id)),
        ...words.filter((w) => !due(w.id)),
        ...sents.filter((s) => !due(s.id)),
      ];
      setItems(all.slice(0, 12));
    })();
  }, []);

  // unmount-only: release the mic + stop the level meter
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
      meterSrcRef.current?.disconnect();
    },
    [],
  );

  // revoke only the *previous* blob url when it changes
  useEffect(() => {
    const u = clipUrl;
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [clipUrl]);

  const item = items[idx];

  const playModel = async (slow = false) => {
    if (!item) return;
    setListening(true);
    sfx.tap();
    try {
      await playPackClip(
        packId,
        slow && item.slow ? item.slow : item.audio,
      );
    } finally {
      setTimeout(() => setListening(false), 400);
    }
  };

  const startMeter = (stream: MediaStream) => {
    const ctx = getAudioContext();
    meterSrcRef.current?.disconnect();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    meterSrcRef.current = src;
    const data = new Uint8Array(an.frequencyBinCount);
    const tick = () => {
      an.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      if (levelRef.current)
        levelRef.current.style.width = `${Math.min(100, 10 + peak * 160)}%`;
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopMeter = () => {
    cancelAnimationFrame(rafRef.current);
    meterSrcRef.current?.disconnect();
    meterSrcRef.current = null;
  };

  const startRec = async () => {
    if (mime === null) return;
    setMicErr(null);
    try {
      // re-acquire if the stream is missing or its tracks have died
      if (!streamRef.current?.active)
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      chunksRef.current = [];
      const rec = new MediaRecorder(
        streamRef.current,
        mime ? { mimeType: mime } : undefined,
      );
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stopMeter();
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/mp4",
        });
        setClipUrl(URL.createObjectURL(blob));
        setStage("recorded");
      };
      recRef.current = rec;
      rec.start(250);
      startMeter(streamRef.current);
      setStage("recording");
      sfx.tap();
    } catch {
      setMicErr("Microphone isn't available — check permission and try again.");
    }
  };

  const stopRec = () => {
    recRef.current?.stop();
    sfx.tap();
  };

  const playCompare = async () => {
    if (!clipUrl || !item) return;
    sfx.tap();
    try {
      await playClips([`packs/${packId}/${item.audio}`, clipUrl], 0.6);
    } catch {
      setMicErr("Couldn't play the comparison — try tapping each button.");
    }
  };

  const playMine = () => {
    if (!clipUrl) return;
    sfx.tap();
    new Audio(clipUrl).play();
  };

  const rate = async (good: boolean) => {
    if (!item) return;
    await recordAttempt(item.id, packId, "speakCompare", good, 0);
    if (good) {
      sfx.correct();
      popConfetti();
    } else {
      sfx.tryAgain();
    }
    next();
  };

  const next = () => {
    setClipUrl(null);
    setStage("listen");
    if (idx + 1 >= items.length) setDone(true);
    else setIdx(idx + 1);
  };

  const progress = items.length ? (idx + (done ? 1 : 0)) / items.length : 0;

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 0 }}>Say it! 🎤</h1>
        <a href="#/" style={{ opacity: 0.6 }}>
          ← home
        </a>
      </div>

      <motion.div
        className="progress-bar"
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
      >
        <div
          className="progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </motion.div>

      {mime === null ? (
        <div className="card" style={{ textAlign: "center" }}>
          <Mascot size={100} />
          <h3>Recording isn't available here</h3>
          <p style={{ opacity: 0.75 }}>
            This browser can't record audio. Try Safari on the iPad.
          </p>
        </div>
      ) : done ? (
        <motion.div
          className="card"
          style={{ textAlign: "center" }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Mascot size={120} animate />
          <h2>Nice talking! 🌟</h2>
          <a className="play-btn" href="#/">
            Done
          </a>
        </motion.div>
      ) : !item ? (
        <div className="card">loading…</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            className="card speak-card"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
          >
            <span className="badge">{item.kind === "word" ? "word" : "sentence"}</span>
            <p className="big-word speak-text">{item.text}</p>

            <div className="speak-grid">
              <motion.button
                className="btn round-btn"
                onClick={() => playModel(false)}
                disabled={listening}
                whileTap={{ scale: 0.92 }}
              >
                🔊
                <span>listen</span>
              </motion.button>
              {item.slow && (
                <motion.button
                  className="btn round-btn"
                  onClick={() => playModel(true)}
                  disabled={listening}
                  whileTap={{ scale: 0.92 }}
                >
                  🐢
                  <span>slow</span>
                </motion.button>
              )}

              {stage !== "recording" ? (
                <motion.button
                  className="btn round-btn rec-btn"
                  onClick={startRec}
                  whileTap={{ scale: 0.92 }}
                >
                  🔴
                  <span>record</span>
                </motion.button>
              ) : (
                <motion.button
                  className="btn round-btn rec-btn recording"
                  onClick={stopRec}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                >
                  ⏹
                  <span>stop</span>
                </motion.button>
              )}

              {stage === "recorded" && (
                <motion.button
                  className="btn round-btn"
                  onClick={playMine}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.92 }}
                >
                  👂
                  <span>hear me</span>
                </motion.button>
              )}

              {stage === "recorded" && (
                <motion.button
                  className="btn round-btn"
                  onClick={playCompare}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.92 }}
                >
                  ⚖
                  <span>compare</span>
                </motion.button>
              )}
            </div>

            {stage === "recording" && (
              <div className="level-track" aria-hidden="true">
                <div className="level-fill" ref={levelRef} />
              </div>
            )}

            {micErr && <p style={{ color: "#e0742a" }}>{micErr}</p>}
            {stage === "recording" && (
              <p className="pulse-hint">Say it out loud… then tap stop</p>
            )}
            {stage === "listen" && !micErr && (
              <p className="pulse-hint">Listen first, then record yourself!</p>
            )}

            {stage === "recorded" && (
              <motion.div
                className="row"
                style={{ justifyContent: "center", gap: 12, marginTop: 12 }}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <button className="btn self-good" onClick={() => rate(true)}>
                  😃 I said it!
                </button>
                <button className="btn self-again" onClick={() => rate(false)}>
                  🔁 once more
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
