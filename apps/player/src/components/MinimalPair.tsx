import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  word: string; // the word that is played
  options: string[]; // the two close-sounding words
  answer: string;
}

// Minimal-pair listening: "pan" vs "panned" — which did you hear?
export default function MinimalPair(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const cardRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [secondChance, setSecondChance] = useState(false);

  const target = props.pack.vocab.find((v) => v.word === p.word);
  const clip = target?.audio.normal;

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const choose = (opt: string) => {
    if (picked) return;
    if (opt === p.answer) {
      setPicked(opt);
      sfx.correct();
      popConfetti(cardRef.current);
      setTimeout(() => props.onDone(true, secondChance), 1100);
    } else {
      setWrong(opt);
      setSecondChance(true);
      sfx.tryAgain();
      if (clip) playPackClip(props.packId, clip).catch(() => {});
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Which word did you hear?</p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear again" />
      <div className="options-grid two">
        {p.options.map((o, i) => {
          let cls = "option-btn tall";
          if (o === picked) cls += " correct";
          if (o === wrong && o !== picked) cls += " wrong";
          return (
            <motion.button
              key={o}
              className={cls}
              onClick={() => choose(o)}
              whileTap={{ scale: 0.93 }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 320, damping: 20 }}
            >
              {o}
            </motion.button>
          );
        })}
      </div>
      {wrong && !picked && <p className="hint">Almost — listen again.</p>}
      {picked && <p className="hint good">Sharp ears! ⭐</p>}
    </div>
  );
}
