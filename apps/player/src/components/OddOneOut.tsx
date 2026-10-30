import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playClips, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  played: string[]; // words heard in sequence
  options: string[]; // shown (played + the missing one)
  answer: string; // the one NOT heard
}

// "Which word did you NOT hear?" — plays 3 clips, shows 4 written words.
export default function OddOneOut(props: {
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
  const [playing, setPlaying] = useState(false);

  const urls = p.played
    .map((w) => props.pack.vocab.find((v) => v.word === w)?.audio.normal)
    .filter((u): u is string => Boolean(u))
    .map((rel) => `packs/${props.packId}/${rel}`);

  const play = async () => {
    if (playing || !urls.length) return;
    setPlaying(true);
    try {
      await playClips(urls);
    } finally {
      setTimeout(() => setPlaying(false), urls.length * 900);
    }
  };

  useEffect(() => {
    play();
  }, []);

  const choose = (opt: string) => {
    if (picked || playing) return;
    if (opt === p.answer) {
      setPicked(opt);
      sfx.correct();
      popConfetti(cardRef.current);
      setTimeout(() => props.onDone(true, secondChance), 1100);
    } else {
      setWrong(opt);
      setSecondChance(true);
      sfx.tryAgain();
      play();
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Which word did you NOT hear?</p>
      <button
        className="secondary speak-btn"
        onClick={play}
        disabled={playing}
      >
        {playing ? "🔊 Playing…" : "🔊 Hear them again"}
      </button>
      <div className="options-grid">
        {p.options.map((o, i) => {
          let cls = "option-btn";
          if (o === picked) cls += " correct";
          if (o === wrong && o !== picked) cls += " wrong";
          return (
            <motion.button
              key={o}
              className={cls}
              onClick={() => choose(o)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {o}
            </motion.button>
          );
        })}
      </div>
      {wrong && !picked && <p className="hint">Hmm — listen once more.</p>}
      {picked && <p className="hint good">That one was missing! ⭐</p>}
    </div>
  );
}
