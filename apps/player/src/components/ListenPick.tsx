import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playPackClip, sfx } from "../audio";
import { packUrl } from "../pack";
import { popConfetti } from "../celebrate";
import SpeakButton from "./SpeakButton";

interface Payload {
  prompt: { kind: string; text: string };
  options: string[];
  answer: string;
  pictures?: Record<string, string>; // word → pack-relative image
}

export default function ListenPick(props: {
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

  const target = props.pack.vocab.find((v) => v.word === p.answer);
  const clip = target?.audio.normal;
  const allPictured =
    !!p.pictures && p.options.every((o) => p.pictures![o]);

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const choose = (opt: string) => {
    if (picked) return;
    if (opt === p.answer) {
      setPicked(opt);
      sfx.correct();
      popConfetti(cardRef.current);
      setTimeout(() => props.onDone(true, secondChance), 1000);
    } else {
      setWrong(opt);
      setSecondChance(true);
      sfx.tryAgain();
      if (clip) playPackClip(props.packId, clip).catch(() => {});
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">
        {allPictured ? "Listen and tap the picture" : "Listen and pick"}
      </p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear again" />
      <div className={allPictured ? "options-grid pics" : "options-grid"}>
        {p.options.map((o, i) => {
          let cls = allPictured ? "option-btn pic" : "option-btn";
          if (o === picked) cls += " correct";
          if (o === wrong && o !== picked) cls += " wrong";
          return (
            <motion.button
              key={o}
              className={cls}
              onClick={() => choose(o)}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.07, type: "spring", stiffness: 320, damping: 22 }}
            >
              {allPictured ? (
                <img
                  src={packUrl(props.packId, p.pictures![o])}
                  alt=""
                  className="pic-option"
                  draggable={false}
                />
              ) : (
                o
              )}
            </motion.button>
          );
        })}
      </div>
      {wrong && !picked && (
        <p className="hint">Oops, try again — listen once more.</p>
      )}
      {picked && <p className="hint good">That's it! ⭐</p>}
    </div>
  );
}
