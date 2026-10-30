import { useState } from "react";
import type { ExerciseItem, LessonPack } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip } from "../audio";

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
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [secondChance, setSecondChance] = useState(false);

  const sentence = props.pack.sentences.find((s) => s.text === p.text);
  const clip = sentence?.audio.normal;

  const parts = p.text.split(new RegExp(`\\b${escapeRe(p.blank)}\\b`, "i"));

  const choose = (opt: string) => {
    if (picked) return;
    if (opt.toLowerCase() === p.blank.toLowerCase()) {
      setPicked(opt);
      if (clip) playPackClip(props.packId, clip).catch(() => {});
      setTimeout(() => props.onDone(true, secondChance), 1100);
    } else {
      setWrong(opt);
      setSecondChance(true);
    }
  };

  return (
    <div className="card exercise-card">
      <p className="exercise-label">Fill the gap</p>
      <p className="cloze-text">
        {parts[0]}
        <span className={picked ? "blank filled" : "blank"}>
          {picked ?? "______"}
        </span>
        {parts.slice(1).join(p.blank)}
      </p>
      <SpeakButton packId={props.packId} clip={clip} label="Hear it" />
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
      {wrong && !picked && <p className="hint">Almost — try again.</p>}
      {picked && <p className="hint good">Nice one! ⭐</p>}
    </div>
  );
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
