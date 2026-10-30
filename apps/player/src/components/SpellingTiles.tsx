import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  word: string;
  tiles: string[];
}

const letters = (w: string) =>
  w.toLowerCase().replace(/[^a-z']/g, "").replace(/'/g, "");

// "spellingTiles" (word visible — letter ordering) and "dictation"
// (audio only — true spelling) share this tile UI. The bank shows each
// unique letter once — a letter can be tapped as many times as the word
// needs it (handles double letters like the two t's in "letter").
export default function SpellingTiles(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const dictation = props.exercise.type === "dictation";
  const cardRef = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState("");
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [secondChance, setSecondChance] = useState(false);

  const target = props.pack.vocab.find((v) => v.word === p.word);
  const clip = target?.audio.normal;
  const slow = target?.audio.slow;
  const need = letters(p.word).length;
  const bank = [...new Set(p.tiles)];

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const tap = (letter: string) => {
    if (solved || shaking || answer.length >= need) return;
    const next = answer + letter;
    setAnswer(next);
    sfx.tap();
    if (next.length === need) {
      if (next === letters(p.word)) {
        setSolved(true);
        sfx.correct();
        popConfetti(cardRef.current);
        if (clip) playPackClip(props.packId, clip).catch(() => {});
        setTimeout(() => props.onDone(true, secondChance), 1200);
      } else {
        setShaking(true);
        setSecondChance(true);
        sfx.tryAgain();
        setTimeout(() => {
          setAnswer("");
          setShaking(false);
        }, 900);
      }
    }
  };

  const removeAt = (i: number) => {
    if (solved || shaking) return;
    setAnswer(answer.slice(0, i) + answer.slice(i + 1));
    sfx.tap();
  };

  const backspace = () => {
    if (solved || shaking || !answer) return;
    setAnswer(answer.slice(0, -1));
    sfx.tap();
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">
        {dictation ? "Listen and spell" : "Spell the word"}
      </p>
      {!dictation && <h2 className="big-word">{p.word}</h2>}
      <div className="row" style={{ justifyContent: "center" }}>
        <SpeakButton packId={props.packId} clip={clip} label="Hear it" />
        {slow && <SpeakButton packId={props.packId} clip={slow} label="Slow" />}
      </div>
      <div
        className={
          solved
            ? "answer-strip solved"
            : shaking
              ? "answer-strip shake-strip"
              : "answer-strip"
        }
      >
        {answer.length === 0 && (
          <span className="placeholder">tap the letters in order…</span>
        )}
        {answer.split("").map((ch, i) => (
          <motion.button
            key={i}
            className="token used letter"
            layout
            initial={{ scale: 0.5, y: 14 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            onClick={() => removeAt(i)}
            title="tap to remove"
          >
            {ch}
          </motion.button>
        ))}
        {answer.length > 0 && !solved && (
          <motion.button
            className="token-btn letter backspace-btn"
            onClick={backspace}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            aria-label="backspace"
          >
            ⌫
          </motion.button>
        )}
      </div>
      <div className="tile-row">
        {bank.map((t, i) => (
          <motion.button
            key={t}
            className="token-btn letter"
            onClick={() => tap(t)}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 24 }}
          >
            {t}
          </motion.button>
        ))}
      </div>
      {secondChance && !solved && (
        <p className="hint">Not quite — listen once more and try again.</p>
      )}
      {solved && <p className="hint good">You spelled it! ⭐</p>}
    </div>
  );
}
