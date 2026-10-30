import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import SpikePage from "./pages/SpikePage";
import ReadPage from "./pages/ReadPage";
import SessionPage from "./pages/SessionPage";
import SpeakPage from "./pages/SpeakPage";
import ParentPage from "./pages/ParentPage";
import MapPage from "./pages/MapPage";
import RewardsPage from "./pages/RewardsPage";

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
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
  if (hash.startsWith("#/boss")) return <SessionPage boss />;
  return <HomePage />;
}
