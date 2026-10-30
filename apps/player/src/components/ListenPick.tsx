import { useEffect, useState } from "react";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import { playPackClip } from "../audio";
import SpeakButton from "./SpeakButton";

interface Payload {
  prompt: { kind: string; text: string };
  options: string[];
  answer: string;
}

export default function ListenPick(props: {
  packId: string;
  pack: LessonPack;
  exercise: ExerciseItem;
  onDone: (correct: boolean, secondChance: boolean) => void;
}) {
  const p = props.exercise.payload as unknown as Payload;
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [secondChance, setSecondChance] = useState(false);

  const target = props.pack.vocab.find((v) => v.word === p.answer);
  const clip = target?.audio.normal;

  useEffect(() => {
    if (clip) playPackClip(props.packId, clip).catch(() => {});
  }, [clip]);

  const choose = (opt: string) => {
    if (picked) return;
    if (opt === p.answer) {
      setPicked(opt);
      setTimeout(() => props.onDone(true, secondChance), 900);
    } else {
      setWrong(opt);
      setSecondChance(true);
      if (clip) playPackClip(props.packId, clip).catch(() => {});
    }
  };

  return (
    <div className="card exercise-card">
      <p className="exercise-label">Listen and pick</p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear again" />
      <div className="options-grid">
        {p.options.map((o) => {
          let cls = "option-btn";
          if (o === picked) cls += " correct";
          if (o === wrong && o !== picked) cls += " wrong";
          return (
            <button key={o} className={cls} onClick={() => choose(o)}>
              {o}
            </button>
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
