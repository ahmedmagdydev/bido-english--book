import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { db } from "./db";
import "@fontsource/andika/400.css";
import "@fontsource/andika/700.css";
import "./index.css";

// Ask the browser not to evict IndexedDB under storage pressure (plan §9.3).
// Result is kept in settings so the parent area can display it.
navigator.storage
  ?.persist?.()
  .then((granted) => db.settings.put({ key: "storagePersisted", value: granted }))
  .catch(() => undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
