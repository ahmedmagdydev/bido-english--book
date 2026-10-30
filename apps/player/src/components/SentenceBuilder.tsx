import { useState } from "react";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip } from "../audio";

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
  const [placed, setPlaced] = useState<number[]>([]);
  const [secondChance, setSecondChance] = useState(false);
  const [solved, setSolved] = useState(false);

  const sentence = props.pack.sentences.find((s) => s.text === p.text);
  const clip = sentence?.audio.normal;
  const target = norm(p.text).split(" ").length;

  const tap = (i: number) => {
    if (solved) return;
    if (placed.includes(i)) {
      setPlaced(placed.filter((x) => x !== i));
      return;
    }
    const next = [...placed, i];
    setPlaced(next);
    if (next.length === target) {
      const attempt = next.map((x) => p.tokens[x]).join(" ");
      if (norm(attempt).toLowerCase() === norm(p.text).toLowerCase()) {
        setSolved(true);
        if (clip) playPackClip(props.packId, clip).catch(() => {});
        setTimeout(() => props.onDone(true, secondChance), 1100);
      } else {
        setSecondChance(true);
        // gentle reset — plan §7.2 kind failure: show nothing harsh
        setTimeout(() => setPlaced([]), 900);
      }
    }
  };

  return (
    <div className="card exercise-card">
      <p className="exercise-label">Build the sentence</p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear it" />
      <div className={solved ? "answer-strip solved" : "answer-strip"}>
        {placed.length === 0 && <span className="placeholder">tap words in order…</span>}
        {placed.map((x) => (
          <span key={x} className="token used">
            {p.tokens[x]}
          </span>
        ))}
      </div>
      <div className="tile-row">
        {p.tokens.map((t, i) => (
          <button
            key={i}
            className={placed.includes(i) ? "token-btn used" : "token-btn"}
            onClick={() => tap(i)}
          >
            {t}
          </button>
        ))}
      </div>
      {secondChance && !solved && (
        <p className="hint">Not quite — try a different order.</p>
      )}
      {solved && <p className="hint good">You built it! ⭐</p>}
    </div>
  );
}
