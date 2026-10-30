import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAudioContext, playClip, unlockAudio } from "../audio";
import { db } from "../db";

type Verdict = "pending" | "pass" | "fail";

interface TestState {
  verdict: Verdict;
  detail: string;
  notes: string;
}

type Results = Record<number, TestState>;

const STORAGE_KEY = "pagebuddy-spike-v1";
const BEEP_COUNT = 6;
const IMG_COUNT = 30;
const SND_COUNT = 100;

const empty: TestState = { verdict: "pending", detail: "", notes: "" };

function loadResults(): Results {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Results;
  } catch {
    return {};
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function TestCard(props: {
  n: number;
  title: string;
  how: string;
  state: TestState;
  onVerdict: (v: Verdict) => void;
  onNotes: (s: string) => void;
  children: ReactNode;
}) {
  const cls =
    props.state.verdict === "pass"
      ? " pass"
      : props.state.verdict === "fail"
        ? " fail"
        : "";
  return (
    <div className={"card spike-test" + cls}>
      <h3>
        {props.n}. {props.title}{" "}
        <span className="badge">{props.state.verdict}</span>
      </h3>
      <p style={{ margin: "4px 0", fontSize: "0.9rem", opacity: 0.75 }}>
        {props.how}
      </p>
      {props.children}
      {props.state.detail && <div className="detail">{props.state.detail}</div>}
      <div className="verdict">
        <button
          className="secondary"
          style={{ background: "#d6f2e2", color: "#136b3c" }}
          onClick={() => props.onVerdict("pass")}
        >
          ✓ Pass
        </button>
        <button
          className="secondary"
          style={{ background: "#f8d9d9", color: "#8f2f2f" }}
          onClick={() => props.onVerdict("fail")}
        >
          ✗ Fail
        </button>
      </div>
      <textarea
        placeholder="Notes (what happened, quirks, latency feel…)"
        value={props.state.notes}
        onChange={(e) => props.onNotes(e.target.value)}
      />
    </div>
  );
}

export default function SpikePage() {
  const [results, setResults] = useState<Results>(loadResults);
  const [busy, setBusy] = useState<number | null>(null);
  const [dragCount, setDragCount] = useState(0);
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const dragInfo = useRef<{ id: number; x: number; y: number } | null>(null);
  const [orientation, setOrientation] = useState(
    () => `${screen.orientation?.type ?? "?"} ${screen.orientation?.angle ?? ""}`,
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    const f = () =>
      setOrientation(
        `${screen.orientation?.type ?? "?"} ${screen.orientation?.angle ?? ""}`,
      );
    window.addEventListener("orientationchange", f);
    window.addEventListener("resize", f);
    return () => {
      window.removeEventListener("orientationchange", f);
      window.removeEventListener("resize", f);
    };
  }, []);

  const set = (n: number, patch: Partial<TestState>) =>
    setResults((r) => ({ ...r, [n]: { ...(r[n] ?? empty), ...patch } }));

  const run = async (n: number, fn: () => Promise<string>) => {
    setBusy(n);
    try {
      const detail = await fn();
      set(n, { detail });
    } catch (e) {
      set(n, { detail: `ERROR: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(null);
    }
  };

  const ctx = (n: number) => ({
    state: results[n] ?? empty,
    onVerdict: (v: Verdict) => set(n, { verdict: v }),
    onNotes: (s: string) => set(n, { notes: s }),
  });

  // ---- test runners -------------------------------------------------------

  const runAudioTest = () =>
    run(2, async () => {
      await unlockAudio(); // inside the click handler — satisfies iOS rule
      const c = getAudioContext();
      const lines: string[] = [`context state: ${c.state}`];
      for (let i = 1; i <= BEEP_COUNT; i++) {
        const r = await playClip(`spike/beep-${i}.wav`);
        lines.push(`beep-${i}: decode+play ${r.decodeMs.toFixed(1)}ms`);
      }
      return lines.join("\n");
    });

  const runVoices = () =>
    run(3, async () => {
      const voices = speechSynthesis.getVoices();
      if (!voices.length) {
        speechSynthesis.onvoiceschanged = () => {};
        return "getVoices() returned 0 — tap again to retry";
      }
      const en = voices.filter((v) => v.lang.startsWith("en"));
      return (
        `total voices: ${voices.length}, English: ${en.length}\n` +
        en.map((v) => `${v.name} (${v.lang})${v.default ? " [default]" : ""}`).join("\n") +
        "\n\nNote: D2 says pre-generated audio — these are informational."
      );
    });

  const runRecord = () =>
    run(4, async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise<void>((res) => (rec.onstop = () => res()));
      rec.start();
      await new Promise((r) => setTimeout(r, 3000));
      rec.stop();
      await done;
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType });
      if (recordUrl) URL.revokeObjectURL(recordUrl);
      setRecordUrl(URL.createObjectURL(blob));
      return `mimeType: ${rec.mimeType}\nsize: ${blob.size} bytes\n3s clip ready — press play to hear it. Note whether iPad re-asked for mic permission.`;
    });

  const runSpeech = () =>
    run(5, async () => {
      const w = window as unknown as Record<string, unknown>;
      const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
        | (new () => SpeechRecognitionLike)
        | undefined;
      if (!SR) {
        return "SpeechRecognition API NOT present in this context.\n(Expected on iPad — this is why D4 excludes ASR from MVP.)";
      }
      return await new Promise<string>((resolve) => {
        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        const t = setTimeout(
          () => resolve("Timed out after 10s — recognition may have hung."),
          10000,
        );
        rec.onresult = (e) => {
          clearTimeout(t);
          resolve(
            `Heard: "${e.results[0][0].transcript}" (conf ${e.results[0][0].confidence.toFixed(2)})\n` +
              `mode: ${isStandalone() ? "standalone" : "tab"}, online: ${navigator.onLine}`,
          );
        };
        rec.onerror = (e) => {
          clearTimeout(t);
          resolve(`recognition error: ${e.error}\nonline: ${navigator.onLine}`);
        };
        rec.onend = () => {};
        rec.start();
      });
    });

  const runStorage = () =>
    run(6, async () => {
      const prev = await db.spike.get("last-write");
      const now = Date.now();
      await db.spike.put({ id: "last-write", ts: now });
      const persisted = await navigator.storage.persisted();
      const est = await navigator.storage.estimate();
      return (
        `wrote record at ${new Date(now).toLocaleString()}\n` +
        (prev
          ? `previous write: ${new Date(prev.ts).toLocaleString()} — ` +
            `${Math.round((now - prev.ts) / 60000)} min ago (survived restart if that was earlier)\n`
          : "no previous write found (first run or storage cleared)\n") +
        `persisted: ${persisted}\n` +
        `quota: ${fmtBytes(est.usage ?? 0)} used / ${fmtBytes(est.quota ?? 0)}`
      );
    });

  const runPersist = () =>
    run(6, async () => {
      const granted = await navigator.storage.persist();
      return `storage.persist() → ${granted}`;
    });

  const runSw = () =>
    run(7, async () => {
      if (!("serviceWorker" in navigator)) return "No serviceWorker support!";
      const reg = await navigator.serviceWorker.getRegistration();
      const keys = await caches.keys();
      let cached = 0;
      for (const k of keys) {
        const cache = await caches.open(k);
        cached += (await cache.keys()).length;
      }
      return (
        `SW registered: ${reg ? "yes (" + (reg.active?.state ?? "?") + ")" : "no"}\n` +
        `caches: ${keys.join(", ") || "none"}\n` +
        `cached responses: ${cached}\n\n` +
        `Now: turn on airplane mode, force-quit, relaunch. App loads + audio plays → Pass.`
      );
    });

  const runAssets = () =>
    run(10, async () => {
      const t0 = performance.now();
      const imgs = Array.from({ length: IMG_COUNT }, (_, i) => {
        const n = String(i + 1).padStart(2, "0");
        return new Promise<number>((res, rej) => {
          const img = new Image();
          img.onload = () => res(1);
          img.onerror = () => rej(new Error(`img-${n}`));
          img.src = `spike/img-${n}.png`;
        });
      });
      const imgCount = (await Promise.all(imgs)).length;
      const tImg = performance.now() - t0;
      const t1 = performance.now();
      let bytes = 0;
      const c = getAudioContext();
      for (let i = 1; i <= SND_COUNT; i++) {
        const n = String(i).padStart(3, "0");
        const buf = await fetch(`spike/snd-${n}.wav`).then((r) =>
          r.arrayBuffer(),
        );
        bytes += buf.byteLength;
        await c.decodeAudioData(buf.slice(0));
      }
      const tSnd = performance.now() - t1;
      return (
        `images: ${imgCount}/${IMG_COUNT} decoded in ${tImg.toFixed(0)}ms\n` +
        `audio: ${SND_COUNT} clips decoded in ${tSnd.toFixed(0)}ms ` +
        `(${fmtBytes(bytes)} raw)\n` +
        `Watch for crashes / stutters; note first-load feel.`
      );
    });

  const exportResults = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      context: {
        mode: isStandalone() ? "standalone" : "safari-tab",
        online: navigator.onLine,
        ua: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight} @${devicePixelRatio}x`,
      },
      results,
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert("Results JSON copied — paste it into a message/file.");
    } catch {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<pre>${text.replace(/</g, "&lt;")}</pre>`);
      } else {
        alert(text);
      }
    }
  };

  // ---- render -------------------------------------------------------------

  const mode = isStandalone() ? "standalone" : "safari-tab";

  return (
    <div className="page no-select">
      <h1>Phase 0 Device Spike</h1>
      <div className="card">
        <span className="badge">{mode}</span>{" "}
        <span className="badge">{navigator.onLine ? "online" : "offline"}</span>{" "}
        <span className="badge warn">
          {window.innerWidth}×{window.innerHeight} @{devicePixelRatio}x
        </span>
        <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          Run every test here in a Safari tab, then install to Home Screen
          (Share → Add to Home Screen) and run them all again. Results save
          per-context; use Export after each pass and send both JSON blobs to
          the dev. Checklist source: plan Appendix D.
        </p>
        <button onClick={exportResults}>Export results (JSON)</button>{" "}
        <button
          className="secondary"
          onClick={() => {
            setResults({});
            localStorage.removeItem(STORAGE_KEY);
          }}
        >
          Reset
        </button>
      </div>

      <TestCard
        n={1}
        title="Add to Home Screen, launch standalone"
        how="Share → Add to Home Screen, then launch from the icon."
        {...ctx(1)}
      >
        <p>
          Currently running as: <b>{mode}</b>
          {mode === "safari-tab" &&
            " — install and relaunch to complete this test."}
        </p>
        <p style={{ fontSize: "0.85rem" }}>
          Check: full screen (no Safari UI), correct icon, safe areas look right.
        </p>
      </TestCard>

      <TestCard
        n={2}
        title="Audio unlock + sequential playback"
        how="Tap below (this tap unlocks audio). 6 clips play in a row."
        {...ctx(2)}
      >
        <button disabled={busy === 2} onClick={runAudioTest}>
          {busy === 2 ? "Playing…" : "Unlock + play 6 clips"}
        </button>
        <p style={{ fontSize: "0.85rem" }}>
          Pass = every clip audible, none silent, feels instant.
        </p>
      </TestCard>

      <TestCard
        n={3}
        title="Speech synthesis voices (informational)"
        how="Lists English voices. We don't depend on them (D2)."
        {...ctx(3)}
      >
        <button disabled={busy === 3} onClick={runVoices}>
          List voices
        </button>
      </TestCard>

      <TestCard
        n={4}
        title="Microphone record + playback"
        how="Records 3s via getUserMedia + MediaRecorder, then plays back."
        {...ctx(4)}
      >
        <button disabled={busy === 4} onClick={runRecord}>
          {busy === 4 ? "Recording 3s…" : "Record 3 seconds"}
        </button>
        {recordUrl && (
          <p>
            <audio controls src={recordUrl} />
          </p>
        )}
      </TestCard>

      <TestCard
        n={5}
        title="Speech recognition (expected: unreliable)"
        how="Tries webkitSpeechRecognition. Say a short English phrase. Test online AND in airplane mode."
        {...ctx(5)}
      >
        <button disabled={busy === 5} onClick={runSpeech}>
          {busy === 5 ? "Listening…" : "Try recognition"}
        </button>
      </TestCard>

      <TestCard
        n={6}
        title="IndexedDB persistence"
        how="Write a record now, force-quit, reopen tomorrow, run again — previous write must still be there."
        {...ctx(6)}
      >
        <button disabled={busy === 6} onClick={runStorage}>
          Write + read record
        </button>{" "}
        <button className="secondary" disabled={busy === 6} onClick={runPersist}>
          Request storage.persist()
        </button>
      </TestCard>

      <TestCard
        n={7}
        title="Service worker offline launch"
        how="Run once online, then airplane mode → force-quit → relaunch."
        {...ctx(7)}
      >
        <button disabled={busy === 7} onClick={runSw}>
          Check SW + cache status
        </button>
      </TestCard>

      <TestCard
        n={8}
        title="Pointer-events drag (6 tiles)"
        how="Drag each tile around. Should be smooth, no page scroll, no text selection."
        {...ctx(8)}
      >
        <div className="drag-area">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <DragTile
              key={i}
              label={String(i + 1)}
              x={12 + i * 108}
              y={70}
              hue={210 + i * 24}
              onDrag={() => setDragCount((c) => c + 1)}
            />
          ))}
        </div>
        <p style={{ fontSize: "0.85rem" }}>completed drags: {dragCount}</p>
      </TestCard>

      <TestCard
        n={9}
        title="Rotation during drag & audio"
        how="Start a drag, rotate the iPad; also rotate while audio plays."
        {...ctx(9)}
      >
        <p>
          orientation now: <b>{orientation}</b> — rotate and confirm layout
          recovers, drag doesn't stick, audio keeps playing.
        </p>
      </TestCard>

      <TestCard
        n={10}
        title="Load 30 images + 100 audio clips"
        how="Decodes all spike assets. Watch memory / load time."
        {...ctx(10)}
      >
        <button disabled={busy === 10} onClick={runAssets}>
          {busy === 10 ? "Loading…" : "Load all assets"}
        </button>
      </TestCard>

      <div className="card">
        <h3>Decision rule (Appendix D)</h3>
        <p style={{ fontSize: "0.9rem" }}>
          If tests 2, 4, 6, 7 pass → PWA path confirmed. If 5 passes in Home
          Screen mode → speech scoring can move earlier. If 2, 6, or 7 fail in
          standalone → plan the Capacitor wrapper.
        </p>
        <p>
          <a href="#/">← back to home</a>
        </p>
      </div>
    </div>
  );
}

// minimal SpeechRecognition typing (not in TS DOM lib)
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
}
interface SpeechRecognitionResultEvent {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [i: number]: { [j: number]: { transcript: string; confidence: number } };
}

function DragTile(props: {
  label: string;
  x: number;
  y: number;
  hue: number;
  onDrag: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: props.x, y: props.y });
  const start = useRef<{ px: number; py: number; moved: boolean } | null>(null);

  return (
    <div
      ref={ref}
      className="drag-tile"
      style={{
        left: pos.current.x,
        top: pos.current.y,
        background: `hsl(${props.hue} 70% 55%)`,
      }}
      onPointerDown={(e) => {
        ref.current?.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX, py: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        if (!start.current || !ref.current) return;
        const dx = e.clientX - start.current.px;
        const dy = e.clientY - start.current.py;
        if (Math.abs(dx) + Math.abs(dy) > 20 && !start.current.moved) {
          start.current.moved = true;
          props.onDrag();
        }
        pos.current.x += dx;
        pos.current.y += dy;
        start.current.px = e.clientX;
        start.current.py = e.clientY;
        ref.current.style.left = `${pos.current.x}px`;
        ref.current.style.top = `${pos.current.y}px`;
      }}
      onPointerUp={() => (start.current = null)}
      onPointerCancel={() => (start.current = null)}
    >
      {props.label}
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n > 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}
