import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  word: string; // written on screen
  hear: string; // word actually played
  same: boolean;
}

// "Same or different?" — shows a word, plays a clip, child decides if they match.
export default function TrueFalse(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const cardRef = useRef<HTMLDivElement>(null);
  const [answered, setAnswered] = useState<"same" | "different" | null>(null);
  const [wrong, setWrong] = useState<"same" | "different" | null>(null);
  const [secondChance, setSecondChance] = useState(false);

  const clip = props.pack.vocab.find((v) => v.word === p.hear)?.audio.normal;

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const choose = (says: "same" | "different") => {
    if (answered) return;
    const correct = (says === "same") === p.same;
    if (correct) {
      setAnswered(says);
      sfx.correct();
      popConfetti(cardRef.current);
      setTimeout(() => props.onDone(true, secondChance), 1100);
    } else {
      setWrong(says);
      setSecondChance(true);
      sfx.tryAgain();
      if (clip) playPackClip(props.packId, clip).catch(() => {});
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Same word or different?</p>
      <motion.h2
        className="big-word"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
      >
        {p.word}
      </motion.h2>
      <SpeakButton packId={props.packId} clip={clip} label="Hear again" />
      <div className="options-grid two">
        <motion.button
          className={`option-btn ${answered === "same" ? "correct" : ""} ${wrong === "same" ? "wrong" : ""}`}
          onClick={() => choose("same")}
          whileTap={{ scale: 0.92 }}
        >
          👍 Same
        </motion.button>
        <motion.button
          className={`option-btn ${answered === "different" ? "correct" : ""} ${wrong === "different" ? "wrong" : ""}`}
          onClick={() => choose("different")}
          whileTap={{ scale: 0.92 }}
        >
          👎 Different
        </motion.button>
      </div>
      {wrong && !answered && <p className="hint">Listen again — same or not?</p>}
      {answered && <p className="hint good">Right! ⭐</p>}
    </div>
  );
}
