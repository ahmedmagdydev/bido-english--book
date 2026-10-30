// Shared Web Audio context. First creation/resume MUST happen inside a user
// tap (plan §7.5 audio unlock rule) — call unlockAudio() from a click handler.

let ctx: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

export async function unlockAudio(): Promise<AudioContext> {
  const c = getAudioContext();
  if (c.state !== "running") {
    await c.resume();
  }
  return c;
}

async function decode(url: string): Promise<AudioBuffer> {
  let p = buffers.get(url);
  if (!p) {
    const c = getAudioContext();
    p = fetch(url)
      .then((r) => {
        // capacitor:// custom scheme may report status 0 for valid files;
        // an empty body is the real failure signal, not .ok
        if (!r.ok && r.status !== 0) throw new Error(`${r.status} ${url}`);
        return r.arrayBuffer();
      })
      .then((b) => {
        if (!b.byteLength) throw new Error(`empty ${url}`);
        return c.decodeAudioData(b);
      });
    buffers.set(url, p);
  }
  return p;
}

export async function preload(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => decode(u)));
}

export interface PlayResult {
  url: string;
  decodeMs: number;
  scheduledAt: number;
  duration: number;
  done: Promise<void>;
}

// live buffer sources — lets the reader enforce one-voice-at-a-time
const liveSources = new Set<AudioBufferSourceNode>();

export function stopAll() {
  liveSources.forEach((s) => {
    try {
      s.stop();
    } catch {
      // never-started source (scheduled by playClips): stop() throws —
      // disconnect so it stays silent even once its start time arrives
      try {
        s.disconnect();
      } catch {}
    }
  });
  liveSources.clear();
  window.speechSynthesis?.cancel();
}

// Fallback voice for generated text that has no pre-rendered clip
// (comprehension questions etc.). WKWebView provides en voices; rate kept
// gentle for a young listener. Resolves when speech ends or is cancelled.
export function speak(text: string, rate = 0.92): Promise<void> {
  return new Promise((res) => {
    const synth = window.speechSynthesis;
    if (!synth) return res();
    stopAll();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    const voices = synth.getVoices();
    const en = voices.find((v) => v.lang.startsWith("en") && v.default)
      ?? voices.find((v) => v.lang.startsWith("en"));
    if (en) u.voice = en;
    u.onend = () => res();
    u.onerror = () => res();
    synth.speak(u);
  });
}

// Plays a clip through the shared context. One voice at a time — starting a
// clip stops whatever was already playing (kid rule: never two sounds
// overlapping). Returns timing info for the spike.
export async function playClip(url: string): Promise<PlayResult> {
  const c = getAudioContext();
  stopAll();
  const t0 = performance.now();
  const buf = await decode(url);
  const decodeMs = performance.now() - t0;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  const scheduledAt = c.currentTime;
  const done = new Promise<void>((res) => {
    src.onended = () => {
      liveSources.delete(src);
      res();
    };
  });
  liveSources.add(src);
  src.start();
  return { url, decodeMs, scheduledAt, duration: buf.duration, done };
}

// Pack-relative clip: refs in pack.json are "audio/x.wav" etc.
export async function playPackClip(packId: string, rel: string): Promise<PlayResult> {
  return playClip(`packs/${packId}/${rel}`);
}

// Plays several clips back-to-back (e.g. "which word did you NOT hear").
// Sources are registered so stopAll()/a new playClip() can cancel the queue.
export async function playClips(urls: string[], gapS = 0.35): Promise<void> {
  const c = getAudioContext();
  stopAll();
  let t = c.currentTime + 0.05;
  for (const url of urls) {
    const buf = await decode(url);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    liveSources.add(src);
    src.onended = () => liveSources.delete(src);
    src.start(t);
    t += buf.duration + gapS;
  }
}

/* --- synthesized UI sounds (no assets needed) --- */

function tone(
  freq: number,
  dur = 0.12,
  type: OscillatorType = "sine",
  at = 0,
  vol = 0.14,
): void {
  const c = getAudioContext();
  if (c.state !== "running") return;
  const osc = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + at;
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  tap(): void {
    tone(620, 0.05, "triangle", 0, 0.08);
  },
  correct(): void {
    tone(523.25, 0.12); // C5
    tone(659.25, 0.12, "sine", 0.09); // E5
    tone(783.99, 0.22, "sine", 0.18); // G5
  },
  tryAgain(): void {
    tone(392, 0.14, "sine", 0, 0.1); // G4
    tone(329.63, 0.2, "sine", 0.12, 0.1); // E4
  },
  flip(): void {
    tone(880, 0.05, "triangle", 0, 0.07);
    tone(1174.66, 0.06, "triangle", 0.04, 0.07);
  },
  star(): void {
    tone(1046.5, 0.09, "triangle"); // C6
    tone(1318.51, 0.1, "triangle", 0.07); // E6
    tone(1567.98, 0.16, "triangle", 0.14); // G6
  },
};

export function clearAudioCache() {
  buffers.clear();
}
