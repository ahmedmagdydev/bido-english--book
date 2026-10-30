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
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.arrayBuffer();
      })
      .then((b) => c.decodeAudioData(b));
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
}

// Plays a clip through the shared context. Returns timing info for the spike.
export async function playClip(url: string): Promise<PlayResult> {
  const c = getAudioContext();
  const t0 = performance.now();
  const buf = await decode(url);
  const decodeMs = performance.now() - t0;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  const scheduledAt = c.currentTime;
  src.start();
  return { url, decodeMs, scheduledAt };
}

// Pack-relative clip: refs in pack.json are "audio/x.wav" etc.
export async function playPackClip(packId: string, rel: string): Promise<PlayResult> {
  return playClip(`packs/${packId}/${rel}`);
}

export function clearAudioCache() {
  buffers.clear();
}
