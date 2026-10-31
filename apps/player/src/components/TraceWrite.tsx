import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";
import { t } from "../strings";

interface Payload {
  word: string;
}

const W = 640;
const H = 340;
const FONT =
  '"Geeza Pro","SF Arabic","Noto Naskh Arabic","Segoe UI","Andika",sans-serif';
const BRUSH = 26; // coverage stamp radius (logical px)
const NEED = 0.55; // fraction of glyph pixels the finger must cover

// Finger-tracing practice ("trace"): the word is drawn as a dotted guide
// (school-worksheet style — حروف منقطة) on one canvas; the kid drags a
// finger on an ink canvas above it. A hidden mask of the solid glyph
// measures how much of the letterform they actually covered — language-
// agnostic, so Arabic shaping/tashkeel work for free.
export default function TraceWrite(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const lang = props.pack.language ?? "en";
  const guideRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const samples = useRef<{ x: number; y: number }[]>([]);
  const hit = useRef<boolean[]>([]);
  const strokes = useRef(0);
  const [progress, setProgress] = useState(0);
  const [solved, setSolved] = useState(false);
  const [started, setStarted] = useState(false);

  const vocab = props.pack.vocab.find((v) => v.word === p.word);
  const clip = vocab?.audio.normal;
  const slow = vocab?.audio.slow;

  const fontSize = (word: string) => {
    const c = document.createElement("canvas").getContext("2d")!;
    const probe = (px: number) => {
      c.font = `${px}px ${FONT}`;
      return c.measureText(word).width;
    };
    let px = 210;
    while (px > 40 && probe(px) > W * 0.82) px -= 8;
    return px;
  };

  const drawGuide = (solid: boolean) => {
    const ctx = guideRef.current?.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    // worksheet lines
    ctx.strokeStyle = "#e6ddf0";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(24, H * 0.72);
    ctx.lineTo(W - 24, H * 0.72);
    ctx.stroke();
    ctx.strokeStyle = "#f3edf8";
    ctx.beginPath();
    ctx.moveTo(24, H * 0.38);
    ctx.lineTo(W - 24, H * 0.38);
    ctx.stroke();
    ctx.font = `${fontSize(p.word)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = lang === "ar" ? "rtl" : "ltr";
    if (solid) {
      ctx.fillStyle = "#3d3560";
      ctx.fillText(p.word, W / 2, H * 0.55);
    } else {
      ctx.fillStyle = "rgba(120,100,160,0.12)";
      ctx.fillText(p.word, W / 2, H * 0.55);
      ctx.setLineDash([3, 7]);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#8f7fc0";
      ctx.strokeText(p.word, W / 2, H * 0.55);
    }
    ctx.restore();
  };

  // offscreen solid render → alpha mask → sample points for coverage
  const buildMask = () => {
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const ctx = off.getContext("2d")!;
    ctx.font = `${fontSize(p.word)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = lang === "ar" ? "rtl" : "ltr";
    ctx.fillStyle = "#000";
    ctx.fillText(p.word, W / 2, H * 0.55);
    const data = ctx.getImageData(0, 0, W, H).data;
    const pts: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y += 3)
      for (let x = 0; x < W; x += 3)
        if (data[(y * W + x) * 4 + 3] > 60) pts.push({ x, y });
    samples.current = pts;
    hit.current = new Array(pts.length).fill(false);
  };

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    for (const c of [guideRef.current, inkRef.current]) {
      if (!c) continue;
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = "100%";
      c.style.height = "auto";
    }
    drawGuide(false);
    buildMask();
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, []);

  const stamp = (x: number, y: number) => {
    const ink = inkRef.current?.getContext("2d");
    if (ink) {
      const dpr = window.devicePixelRatio || 1;
      ink.save();
      ink.scale(dpr, dpr);
      ink.fillStyle = "#4f8ef7";
      ink.beginPath();
      ink.arc(x, y, BRUSH * 0.55, 0, Math.PI * 2);
      ink.fill();
      ink.restore();
    }
    const pts = samples.current;
    const r2 = BRUSH * BRUSH;
    let newly = 0;
    for (let i = 0; i < pts.length; i++) {
      if (hit.current[i]) continue;
      const dx = pts[i].x - x;
      const dy = pts[i].y - y;
      if (dx * dx + dy * dy <= r2) {
        hit.current[i] = true;
        newly++;
      }
    }
    if (newly) {
      const done = hit.current.filter(Boolean).length;
      const pct = pts.length ? done / pts.length : 0;
      setProgress(pct);
      if (pct >= NEED && strokes.current >= 1 && !solved) {
        setSolved(true);
        drawGuide(true);
        sfx.correct();
        popConfetti(inkRef.current);
        if (clip) playPackClip(props.packId, clip).catch(() => {});
        setTimeout(() => props.onDone(true, false), 1300);
      }
    }
  };

  const pos = (e: React.PointerEvent) => {
    const r = inkRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const down = (e: React.PointerEvent) => {
    if (solved) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current++;
    if (!started) {
      setStarted(true);
      sfx.tap();
    }
    const pt = pos(e);
    last.current = pt;
    stamp(pt.x, pt.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || solved) return;
    const pt = pos(e);
    const from = last.current ?? pt;
    const dist = Math.hypot(pt.x - from.x, pt.y - from.y);
    const steps = Math.max(1, Math.ceil(dist / 9));
    for (let i = 1; i <= steps; i++)
      stamp(from.x + ((pt.x - from.x) * i) / steps, from.y + ((pt.y - from.y) * i) / steps);
    last.current = pt;
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    if (solved) return;
    const ink = inkRef.current?.getContext("2d");
    if (ink) {
      const dpr = window.devicePixelRatio || 1;
      ink.save();
      ink.scale(dpr, dpr);
      ink.clearRect(0, 0, W, H);
      ink.restore();
    }
    hit.current.fill(false);
    setProgress(0);
    sfx.tap();
  };

  return (
    <div className="card exercise-card">
      <p className="exercise-label">{t(lang, "traceIt")}</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <SpeakButton packId={props.packId} clip={clip} label={t(lang, "hearIt")} />
        {slow && (
          <SpeakButton packId={props.packId} clip={slow} label={t(lang, "slow")} />
        )}
        <button className="speak-btn" onClick={clear}>
          🧽 {t(lang, "erase")}
        </button>
      </div>
      <div className="trace-wrap">
        <canvas ref={guideRef} className="trace-guide" />
        <canvas
          ref={inkRef}
          className="trace-ink"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="trace-track">
        <motion.div
          className="trace-fill"
          animate={{ width: `${Math.min(100, (progress / NEED) * 100)}%` }}
        />
      </div>
      {!started && <p className="hint">{t(lang, "traceHint")}</p>}
      {solved && <p className="hint good">{t(lang, "niceOne")}</p>}
    </div>
  );
}
