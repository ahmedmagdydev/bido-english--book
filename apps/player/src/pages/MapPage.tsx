import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { listPacks, loadPack, setActivePack } from "../pack";
import { getReviews } from "../progress";
import { useApp } from "../store";
import Mascot from "../components/Mascot";
import { sfx } from "../audio";

interface Node {
  packId: string;
  title: string;
  vocab: number;
  masteredPct: number; // share of vocab at box ≥4
  started: boolean;
}

export default function MapPage() {
  const { pack } = useApp();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const ids = await listPacks();
      const out: Node[] = [];
      for (const id of ids) {
        try {
          const p = await loadPack(id);
          const reviews = await getReviews(id);
          const mastered = p.vocab.filter(
            (v) => (reviews.get(v.id)?.box ?? 0) >= 4,
          ).length;
          out.push({
            packId: id,
            title: p.title,
            vocab: p.vocab.length,
            masteredPct: p.vocab.length ? mastered / p.vocab.length : 0,
            started: reviews.size > 0,
          });
        } catch {
          /* pack failed to load — skip node */
        }
      }
      setNodes(out);
    })();
  }, []);

  const pick = async (n: Node) => {
    sfx.tap();
    await setActivePack(n.packId);
    // reset cached pack in the store so Home loads the new one
    useApp.setState({ pack: null });
    setMsg(`Now playing: ${n.title}`);
    setTimeout(() => (window.location.hash = "#/"), 700);
  };

  // first non-mastered node = where the mascot stands
  const currentIdx = Math.max(
    0,
    nodes.findIndex((n) => n.masteredPct < 0.8),
  );

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 0 }}>Journey 🗺</h1>
        <a href="#/" style={{ opacity: 0.6 }}>
          ← home
        </a>
      </div>

      <div className="map-path">
        {nodes.map((n, i) => {
          const isCurrent = i === currentIdx;
          const state = n.masteredPct >= 0.8 ? "mastered" : n.started ? "progress" : "new";
          return (
            <motion.div
              key={n.packId}
              className={`map-node ${state} c${i % 6} ${i % 2 ? "right" : "left"} ${isCurrent ? "current" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="map-node-inner">
                <button className="map-bubble" onClick={() => pick(n)}>
                  {isCurrent && (
                    <motion.div
                      className="map-mascot"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      <Mascot size={52} />
                    </motion.div>
                  )}
                  <span className="map-icon">
                    {state === "mastered" ? "🏆" : state === "progress" ? "▶" : "✨"}
                  </span>
                </button>
                <div className="map-caption">
                  <span className="map-title">{n.title}</span>
                  <span className="map-sub">
                    {n.started
                      ? `${Math.round(n.masteredPct * 100)}% mastered · ${n.vocab} words`
                      : `${n.vocab} words — new!`}
                  </span>
                  {pack?.packId === n.packId && (
                    <span className="badge">current</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {!nodes.length && <div className="card">no packs found</div>}
      </div>
      {msg && (
        <motion.p
          className="badge"
          style={{ textAlign: "center" }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          {msg}
        </motion.p>
      )}
    </div>
  );
}
