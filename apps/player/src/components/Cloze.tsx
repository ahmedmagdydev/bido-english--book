import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  text: string;
  blank: string;
  options: string[];
}

export default function Cloze(props: {
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

  const sentence = props.pack.sentences.find((s) => s.text === p.text);
  const clip = sentence?.audio.normal;

  // option-word audio: plays the candidate word alone (never the answer
  // in context) — only when a vocab clip exists for that option
  const optClip = (o: string) =>
    props.pack.vocab.find(
      (v) => v.word.toLowerCase() === o.toLowerCase(),
    )?.audio?.normal;

  const parts = p.text.split(new RegExp(`\\b${escapeRe(p.blank)}\\b`, "i"));

  const playSentence = () => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  };

  const choose = (opt: string) => {
    if (picked) return;
    if (opt.toLowerCase() === p.blank.toLowerCase()) {
      setPicked(opt);
      sfx.correct();
      popConfetti(cardRef.current);
      playSentence();
      setTimeout(() => props.onDone(true, secondChance), 1200);
    } else {
      setWrong(opt);
      setSecondChance(true);
      sfx.tryAgain();
      // no sentence audio on a miss — it contains the answer word, and
      // he told us he wants to guess, not hear it (kid feedback)
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Fill the gap</p>
      <p className="cloze-text">
        {parts[0]}
        <motion.span
          className={picked ? "blank filled" : "blank"}
          animate={picked ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.35 }}
        >
          {picked ?? "______"}
        </motion.span>
        {parts.slice(1).join(p.blank)}
      </p>
      <div className="options-grid">
        {p.options.map((o, i) => {
          let cls = "option-btn";
          if (o === picked) cls += " correct";
          if (o === wrong && o !== picked) cls += " wrong";
          const oc = optClip(o);
          return (
            <motion.button
              key={o}
              className={cls + (oc ? " has-audio" : "")}
              onClick={() => choose(o)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {o}
              {oc && (
                <span
                  className="opt-sound"
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.tap();
                    playPackClip(props.packId, oc).catch(() => {});
                  }}
                >
                  🔊
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {wrong && !picked && <p className="hint">Almost — try again.</p>}
      {picked && <p className="hint good">Nice one! ⭐</p>}
    </div>
  );
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
