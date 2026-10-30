import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playClips, playPackClip, sfx, speak, stopAll } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  kind: "mcq" | "tf";
  passage: string;
  passageSentences?: string[];
  question: string;
  options?: string[];
  answer: string | boolean;
  sourcePage?: number;
  audio?: {
    passage?: { normal: string; slow?: string }[];
    question?: { normal: string };
    options?: Record<string, { normal: string }>;
  };
}

// "Story question" — hear/read a passage, answer what it says. The answer
// lives in the story, so replaying it on a wrong pick is the scaffold,
// not a spoiler (different rule from cloze's guess-first flow).
export default function Comprehension(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const cardRef = useRef<HTMLDivElement>(null);
  const [answered, setAnswered] = useState<string | boolean | null>(null);
  const [wrong, setWrong] = useState<string | boolean | null>(null);
  const [secondChance, setSecondChance] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => stopAll(), []);

  const hearPassage = async () => {
    if (playing) return;
    setPlaying(true);
    stopAll();
    const clips = p.audio?.passage ?? [];
    try {
      if (clips.length) {
        await playClips(
          clips.map((c) => `packs/${props.packId}/${c.normal}`),
          0.3,
        );
      } else {
        await speak(p.passage);
      }
    } catch {
      /* decode/synth failure — text is still readable */
    }
    setPlaying(false);
  };

  const hearQuestion = () => {
    const clip = p.audio?.question?.normal;
    if (clip) playPackClip(props.packId, clip).catch(() => {});
    else speak(p.question).catch(() => {});
  };

  const hearOption = (o: string) => {
    const clip = p.audio?.options?.[o]?.normal;
    if (clip) playPackClip(props.packId, clip).catch(() => {});
    else speak(o).catch(() => {});
  };

  const choose = (pick: string | boolean) => {
    if (answered) return;
    const correct = pick === p.answer;
    if (correct) {
      setAnswered(pick);
      sfx.correct();
      popConfetti(cardRef.current);
      setTimeout(() => props.onDone(true, secondChance), 1100);
    } else {
      setWrong(pick);
      setSecondChance(true);
      sfx.tryAgain();
      hearPassage(); // the answer is in the story — hear it again
    }
  };

  const optClass = (o: string | boolean) =>
    `option-btn ${answered === o ? "correct" : ""} ${wrong === o ? "wrong" : ""}`;

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">📖 Story question</p>

      <div className="comp-passage">
        <p className="comp-passage-text">{p.passage}</p>
        <button className="mini-play" onClick={hearPassage} disabled={playing}>
          {playing ? "🔊 listening…" : "▶ hear the story"}
        </button>
      </div>

      <div className="comp-question">
        <h2 className="comp-q-text">{p.question}</h2>
        <button className="mini-play" onClick={hearQuestion}>
          🔊
        </button>
      </div>

      {p.kind === "mcq" && p.options ? (
        <div className="options-grid one">
          {p.options.map((o) => (
            <div key={o} className="comp-opt-row">
              <motion.button
                className={optClass(o)}
                onClick={() => choose(o)}
                whileTap={{ scale: 0.95 }}
              >
                {o}
              </motion.button>
              <button
                className="mini-play"
                onClick={() => hearOption(o)}
                aria-label={`hear ${o}`}
              >
                🔊
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="options-grid two">
          <motion.button
            className={optClass(true)}
            onClick={() => choose(true)}
            whileTap={{ scale: 0.92 }}
          >
            👍 True
          </motion.button>
          <motion.button
            className={optClass(false)}
            onClick={() => choose(false)}
            whileTap={{ scale: 0.92 }}
          >
            👎 False
          </motion.button>
        </div>
      )}

      {wrong != null && answered == null && (
        <p className="hint">Listen to the story again — the answer is in there.</p>
      )}
      {answered != null && <p className="hint good">Right! ⭐</p>}
    </div>
  );
}
