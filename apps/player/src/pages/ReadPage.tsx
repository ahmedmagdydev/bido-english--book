import { useEffect, useState } from "react";
import { useApp } from "../store";
import { packUrl } from "../pack";
import { playPackClip } from "../audio";

export default function ReadPage() {
  const { pack, loadPack } = useApp();
  const [i, setI] = useState(0);

  useEffect(() => {
    loadPack();
  }, []);

  if (!pack || !pack.pages?.length) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading pages…</p>
        </div>
      </div>
    );
  }

  const page = pack.pages[i];
  const sentences = pack.sentences.filter((s) => s.sourcePage === page.page);
  const words = pack.vocab.filter((v) => v.sourcePage === page.page);

  return (
    <div className="page no-select">
      <h1>Read the story</h1>
      <div className="card" style={{ padding: 8 }}>
        <img
          src={packUrl(pack.packId, page.image)}
          alt={`book page ${page.page}`}
          className="reader-img"
        />
      </div>

      {words.length > 0 && (
        <div className="card">
          <p className="exercise-label">Words on this page</p>
          <div className="row">
            {words.map((v) => (
              <button
                key={v.id}
                className="token-btn"
                onClick={() => playPackClip(pack.packId, v.audio.normal)}
              >
                🔊 {v.word}
              </button>
            ))}
          </div>
        </div>
      )}

      {sentences.length > 0 && (
        <div className="card">
          <p className="exercise-label">Tap a sentence to hear it</p>
          {sentences.map((s) => (
            <button
              key={s.id}
              className="sentence-chip"
              onClick={() => playPackClip(pack.packId, s.audio.normal)}
            >
              {s.speaker && <b>{s.speaker}: </b>}
              {s.text}
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <button
          className="secondary"
          disabled={i === 0}
          onClick={() => setI(i - 1)}
        >
          ← Back
        </button>
        <span className="badge">
          {i + 1} / {pack.pages.length}
        </span>
        <button
          className="secondary"
          disabled={i === pack.pages.length - 1}
          onClick={() => setI(i + 1)}
        >
          Next →
        </button>
      </div>
      <p style={{ textAlign: "center" }}>
        <a href="#/">← home</a>
      </p>
    </div>
  );
}
