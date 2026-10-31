import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import SpikePage from "./pages/SpikePage";
import ReadPage from "./pages/ReadPage";
import SessionPage from "./pages/SessionPage";
import SpeakPage from "./pages/SpeakPage";
import ParentPage from "./pages/ParentPage";
import MapPage from "./pages/MapPage";
import RewardsPage from "./pages/RewardsPage";
import LangGate from "./pages/LangGate";
import { getActiveLang, listPackMeta } from "./pack";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

// Root route: if several language worlds exist and none was ever chosen,
// land on the picker instead of Home — makes each language feel like its
// own app from the very first tap.
function HomeOrGate() {
  const [gate, setGate] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const metas = await listPackMeta().catch(() => []);
      const langs = new Set(metas.map((m) => m.language));
      // Dexie can block during a schema upgrade if another tab holds the
      // app open — never let the gate decision hang the whole page.
      const active = await Promise.race([
        getActiveLang().catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), 1200)),
      ]);
      setGate(langs.size > 1 && !active);
    })();
  }, []);
  if (gate == null)
    return <div className="page" style={{ textAlign: "center", paddingTop: "30vh" }}>🦊</div>;
  return gate ? <LangGate /> : <HomePage />;
}

export default function App() {
  const hash = useHashRoute();
  if (hash.startsWith("#/spike")) return <SpikePage />;
  if (hash.startsWith("#/read")) return <ReadPage />;
  if (hash.startsWith("#/session")) return <SessionPage />;
  if (hash.startsWith("#/speak")) return <SpeakPage />;
  if (hash.startsWith("#/parent")) return <ParentPage />;
  if (hash.startsWith("#/map")) return <MapPage />;
  if (hash.startsWith("#/rewards")) return <RewardsPage />;
  if (hash.startsWith("#/lang")) return <LangGate />;
  if (hash.startsWith("#/boss")) return <SessionPage boss />;
  return <HomeOrGate />;
}
