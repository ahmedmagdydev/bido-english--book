import { useEffect } from "react";
import { motion } from "framer-motion";
import type { VocabItem } from "@pagebuddy/schema";
import SpeakButton from "./SpeakButton";
import { playPackClip } from "../audio";
import { packUrl } from "../pack";
import { t } from "../strings";

export default function Flashcard(props: {
  packId: string;
  vocab: VocabItem;
  lang?: string;
  onResult: (knewIt: boolean) => void;
}) {
  const v = props.vocab;
  // auto-play the word on show (exposure)
  useEffect(() => {
    playPackClip(props.packId, v.audio.normal).catch(() => {});
  }, [props.packId, v.id]);

  return (
    <motion.div
      className="card exercise-card"
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
    >
      <p className="exercise-label">{t(props.lang, "newWord")}</p>
      {v.image && (
        <img
          className="vocab-img"
          src={packUrl(props.packId, v.image.src)}
          alt={v.word}
        />
      )}
      <h2 className="big-word">{v.word}</h2>
      {v.pos && v.pos !== "other" && <span className="badge">{v.pos}</span>}
      <div className="row" style={{ marginTop: 10 }}>
        <SpeakButton packId={props.packId} clip={v.audio.normal} label={t(props.lang, "hearIt")} />
        {v.audio.slow && (
          <SpeakButton packId={props.packId} clip={v.audio.slow} label={t(props.lang, "slow")} />
        )}
      </div>
      {v.example && <p className="example">"{v.example}"</p>}
      <div className="verdict" style={{ marginTop: 16 }}>
        <button
          className="secondary"
          style={{ background: "#f8d9d9", color: "#8f2f2f" }}
          onClick={() => props.onResult(false)}
        >
          {t(props.lang, "again")}
        </button>
        <button
          className="secondary"
          style={{ background: "#d6f2e2", color: "#136b3c" }}
          onClick={() => props.onResult(true)}
        >
          {t(props.lang, "iKnowIt")}
        </button>
      </div>
    </motion.div>
  );
}
