import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";

interface Payload {
  pairs: { word: string }[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hear a word on the left, tap its written match on the right.
export default function MatchPairs(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const cardRef = useRef<HTMLDivElement>(null);
  const pairs = useMemo(() => p.pairs.map((x) => x.word).slice(0, 5), [p]);
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);

  const [active, setActive] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [miss, setMiss] = useState<string | null>(null);
  const [secondChance, setSecondChance] = useState(false);

  const clipOf = (w: string) =>
    props.pack.vocab.find((v) => v.word === w)?.audio.normal;

  const done = matched.size === pairs.length && pairs.length > 0;

  const hear = (w: string) => {
    const c = clipOf(w);
    if (c) playPackClip(props.packId, c).catch(() => {});
  };

  const tapAudio = (w: string) => {
    if (matched.has(w)) return;
    setActive(w);
    setMiss(null);
    hear(w);
    sfx.tap();
  };

  const tapWord = (w: string) => {
    if (!active || matched.has(w) || done) return;
    if (w === active) {
      const next = new Set(matched).add(w);
      setMatched(next);
      setActive(null);
      if (next.size === pairs.length) {
        sfx.correct();
        popConfetti(cardRef.current);
        setTimeout(() => props.onDone(true, secondChance), 1200);
      } else {
        sfx.flip();
      }
    } else {
      setMiss(w);
      setSecondChance(true);
      sfx.tryAgain();
      setTimeout(() => setMiss(null), 800);
    }
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">Match the sounds to the words</p>
      <div className="match-grid">
        <div className="match-col">
          {left.map((w, i) => (
            <motion.button
              key={`a-${w}`}
              className={[
                "match-btn audio",
                matched.has(w) ? "matched" : "",
                active === w ? "active" : "",
              ].join(" ")}
              onClick={() => tapAudio(w)}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: matched.has(w) ? 0 : 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              disabled={matched.has(w)}
            >
              🔊
            </motion.button>
          ))}
        </div>
        <div className="match-col">
          {right.map((w, i) => (
            <motion.button
              key={`w-${w}`}
              className={[
                "match-btn word",
                matched.has(w) ? "matched" : "",
                miss === w ? "wrong" : "",
              ].join(" ")}
              onClick={() => tapWord(w)}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: matched.has(w) ? 0 : 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              disabled={matched.has(w)}
            >
              {w}
            </motion.button>
          ))}
        </div>
      </div>
      {!active && !done && (
        <p className="hint">Tap 🔊 to hear a word, then tap its match.</p>
      )}
      {miss && <p className="hint">Not that one — listen again.</p>}
      {done && <p className="hint good">All matched! ⭐</p>}
    </div>
  );
}
