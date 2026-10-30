import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  text: string;
  tokens: string[];
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export default function SentenceBuilder(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const cardRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [secondChance, setSecondChance] = useState(false);
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);

  const sentence = props.pack.sentences.find((s) => s.text === p.text);
  const clip = sentence?.audio.normal;
  const target = norm(p.text).split(" ").length;

  const tap = (i: number) => {
    if (solved || shaking) return;
    if (placed.includes(i)) {
      setPlaced(placed.filter((x) => x !== i));
      sfx.tap();
      return;
    }
    const next = [...placed, i];
    setPlaced(next);
    sfx.tap();
    if (next.length === target) {
      const attempt = next.map((x) => p.tokens[x]).join(" ");
      if (norm(attempt).toLowerCase() === norm(p.text).toLowerCase()) {
        setSolved(true);
        sfx.correct();
        popConfetti(cardRef.current);
        if (clip) playPackClip(props.packId, clip).catch(() => {});
        setTimeout(() => props.onDone(true, secondChance), 1200);
      } else {
        setSecondChance(true);
        setShaking(true);
        sfx.tryAgain();
        // gentle reset — plan §7.2 kind failure: show nothing harsh
        setTimeout(() => {
          setPlaced([]);
          setShaking(false);
        }, 900);
      }
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Build the sentence</p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear it" />
      <div
        className={
          solved
            ? "answer-strip solved"
            : shaking
              ? "answer-strip shake-strip"
              : "answer-strip"
        }
      >
        {placed.length === 0 && <span className="placeholder">tap words in order…</span>}
        {placed.map((x) => (
          <motion.span
            key={x}
            className="token used"
            layout
            initial={{ scale: 0.6, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 22 }}
          >
            {p.tokens[x]}
          </motion.span>
        ))}
      </div>
      <div className="tile-row">
        {p.tokens.map((t, i) => (
          <motion.button
            key={i}
            className={placed.includes(i) ? "token-btn used" : "token-btn"}
            onClick={() => tap(i)}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.045, type: "spring", stiffness: 380, damping: 24 }}
          >
            {t}
          </motion.button>
        ))}
      </div>
      {secondChance && !solved && (
        <p className="hint">Not quite — try a different order.</p>
      )}
      {solved && <p className="hint good">You built it! ⭐</p>}
    </div>
  );
}
