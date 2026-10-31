import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  lettersOf,
  normWord,
  type ExerciseItem,
  type LessonPack,
} from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip, sfx } from "../audio";
import { popConfetti } from "../celebrate";
import { t } from "../strings";

interface Payload {
  word: string;
  tiles: string[];
}

// "spellingTiles" (word visible — letter ordering) and "dictation"
// (audio only — true spelling) share this tile UI. The bank shows each
// unique tile once — a tile can be tapped as many times as the word
// needs it (handles double letters like the two t's in "letter").
// Arabic tiles are graphemes (letter+harakat), so the answer is kept as
// an array of tile units — never split by code unit.
export default function SpellingTiles(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const lang = props.pack.language ?? "en";
  const dictation = props.exercise.type === "dictation";
  const cardRef = useRef<HTMLDivElement>(null);
  const [answer, setAnswer] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [secondChance, setSecondChance] = useState(false);

  const target = props.pack.vocab.find((v) => v.word === p.word);
  const clip = target?.audio.normal;
  const slow = target?.audio.slow;
  const targetUnits = lettersOf(p.word, lang);
  const targetKey = normWord(targetUnits.join(""), lang);
  const need = targetUnits.length;
  const bank = [...new Set(p.tiles)];

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const tap = (tile: string) => {
    if (solved || shaking || answer.length >= need) return;
    const next = [...answer, tile];
    setAnswer(next);
    sfx.tap();
    if (next.length === need) {
      if (normWord(next.join(""), lang) === targetKey) {
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
          setAnswer([]);
          setShaking(false);
        }, 900);
      }
    }
  };

  const removeAt = (i: number) => {
    if (solved || shaking) return;
    setAnswer(answer.filter((_, j) => j !== i));
    sfx.tap();
  };

  const backspace = () => {
    if (solved || shaking || !answer.length) return;
    setAnswer(answer.slice(0, -1));
    sfx.tap();
  };

  return (
    <div className="card exercise-card" ref={cardRef}>
      <p className="exercise-label">
        {dictation ? t(lang, "listenSpell") : t(lang, "spellWord")}
      </p>
      {!dictation && <h2 className="big-word">{p.word}</h2>}
      <div className="row" style={{ justifyContent: "center" }}>
        <SpeakButton
          packId={props.packId}
          clip={clip}
          label={t(lang, "hearIt")}
        />
        {slow && (
          <SpeakButton packId={props.packId} clip={slow} label={t(lang, "slow")} />
        )}
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
          <span className="placeholder">{t(lang, "tapOrder")}</span>
        )}
        {answer.map((ch, i) => (
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
        {bank.map((tile, i) => (
          <motion.button
            key={tile}
            className="token-btn letter"
            onClick={() => tap(tile)}
            whileTap={{ scale: 0.85 }}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 24 }}
          >
            {tile}
          </motion.button>
        ))}
      </div>
      {secondChance && !solved && (
        <p className="hint">{t(lang, "almost")}</p>
      )}
      {solved && <p className="hint good">{t(lang, "spelledIt")}</p>}
    </div>
  );
}
