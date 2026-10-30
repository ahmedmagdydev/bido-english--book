import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import SpikePage from "./pages/SpikePage";
import ReadPage from "./pages/ReadPage";
import SessionPage from "./pages/SessionPage";

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
  return <HomePage />;
}
