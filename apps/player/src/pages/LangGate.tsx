import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PackLang } from "@pagebuddy/schema";
import { listPackMeta, getActiveLang, type PackMeta } from "../pack";
import { useApp } from "../store";
import Mascot from "../components/Mascot";
import { sfx } from "../audio";

const WORLD: Record<
  PackLang,
  { name: string; sub: string; emoji: string; cls: string }
> = {
  en: {
    name: "English",
    sub: "Let's learn English!",
    emoji: "📘",
    cls: "coral",
  },
  ar: {
    name: "العربية",
    sub: "هيا نتعلم العربية!",
    emoji: "📗",
    cls: "mint",
  },
};

// The world picker — each language is its own little app: own packs,
// own journey, own stars/streak/stickers. Shown on first run when more
// than one language exists, and anytime via the 🌐 chip on Home.
export default function LangGate() {
  const { switchLang } = useApp();
  const [metas, setMetas] = useState<PackMeta[]>([]);
  const [current, setCurrent] = useState<PackLang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      setMetas(await listPackMeta());
      setCurrent(await getActiveLang());
      setReady(true);
    })();
  }, []);

  const langs = [...new Set(metas.map((m) => m.language))];

  const pick = async (lang: PackLang) => {
    sfx.tap();
    await switchLang(lang);
    window.location.hash = "#/";
  };

  if (!ready) return null;
  if (langs.length <= 1) {
    window.location.hash = "#/";
    return null;
  }

  return (
    <div className="page no-select">
      <div className="home-top">
        <h1 style={{ marginBottom: 6 }}>PageBuddy</h1>
        {current && (
          <a href="#/" style={{ opacity: 0.6 }}>
            ← home
          </a>
        )}
      </div>
      <p style={{ textAlign: "center", opacity: 0.7 }}>
        Pick a world — each has its own journey, stars and stickers!
      </p>
      <div className="lang-grid">
        {langs.map((lang, i) => {
          const w = WORLD[lang];
          const packs = metas.filter((m) => m.language === lang);
          return (
            <motion.button
              key={lang}
              className={`lang-card ${w.cls}`}
              dir={lang === "ar" ? "rtl" : "ltr"}
              onClick={() => pick(lang)}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 260, damping: 20 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="lang-emoji">{w.emoji}</span>
              <span className="lang-name">{w.name}</span>
              <span className="lang-sub">{w.sub}</span>
              <span className="lang-packs">
                {packs.length} {lang === "ar" ? "دروس" : `pack${packs.length > 1 ? "s" : ""}`}
              </span>
              {current === lang && <span className="badge">current</span>}
            </motion.button>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <Mascot size={90} animate />
      </div>
    </div>
  );
}
