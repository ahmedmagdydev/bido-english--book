import { useState } from "react";
import { playPackClip } from "../audio";

export default function SpeakButton(props: {
  packId: string;
  clip?: string;
  label?: string;
  small?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  if (!props.clip) return null;
  return (
    <button
      className="secondary speak-btn"
      style={props.small ? { minHeight: 44, padding: "6px 14px" } : undefined}
      disabled={playing}
      onClick={async () => {
        setPlaying(true);
        try {
          await playPackClip(props.packId, props.clip!);
        } finally {
          setTimeout(() => setPlaying(false), 600);
        }
      }}
    >
      {playing ? "…" : `🔊 ${props.label ?? "Listen"}`}
    </button>
  );
}
