import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { ReviewedPageSchema } from "@pagebuddy/schema";
import { workDir } from "./paths.js";

const run = promisify(execFile);

// Cache key = hash(text + voice + speed) — re-runs only generate what changed
// (plan §6.1 stage 5). Providers:
//   piper   — local Piper TTS (PIPER_BIN + PIPER_VOICE), free voices, wav
//   edgetts — Edge neural voices via `edge-tts` CLI (EDGE_TTS_BIN, default
//             "edge-tts"; EDGE_VOICE default ar-SA-ZariyahNeural), mp3 out.
//             Needs internet at build time only. Select via TTS_PROVIDER env
//             or `pipeline tts <section> --provider edgetts`.

export const SPEEDS = ["normal", "slow"] as const;
export type Speed = (typeof SPEEDS)[number];
type Provider = "piper" | "edgetts";

export function audioFileName(
  text: string,
  voice: string,
  speed: Speed,
  ext = "wav",
) {
  const h = createHash("sha1")
    .update(`${text}|${voice}|${speed}`)
    .digest("hex")
    .slice(0, 16);
  return `${h}.${ext}`;
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function synthesize(
  text: string,
  voice: string,
  speed: Speed,
  outPath: string,
  provider: Provider,
): Promise<void> {
  if (provider === "edgetts") {
    const bin = process.env.EDGE_TTS_BIN ?? "edge-tts";
    await run(
      bin,
      [
        "--voice",
        voice,
        "--text",
        text,
        "--write-media",
        outPath,
        ...(speed === "slow" ? ["--rate=-25%"] : []),
      ],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    return;
  }
  const piper = process.env.PIPER_BIN;
  if (!piper) throw new Error("PIPER_BIN not set (path to piper executable)");
  // Piper's --length-scale >1 slows speech; used for the "slow" clip.
  const args = [
    "--model",
    voice,
    "--output_file",
    outPath,
    ...(speed === "slow" ? ["--length-scale", "1.4"] : []),
  ];
  const child = run(piper, args, { maxBuffer: 4 * 1024 * 1024 });
  // piper reads the text from stdin
  child.child.stdin?.end(text);
  await child;
}

interface TtsItem {
  key: string; // stable item key, e.g. "vocab:mother" / "sent:3"
  text: string;
}

export async function ttsSection(section: string): Promise<void> {
  const provider = (process.env.TTS_PROVIDER ?? "piper") as Provider;
  const voice =
    provider === "edgetts"
      ? (process.env.EDGE_VOICE ?? "ar-SA-ZariyahNeural")
      : process.env.PIPER_VOICE;
  if (!voice) {
    console.log(
      "PIPER_VOICE not set. Set PIPER_BIN + PIPER_VOICE to a Piper voice model\n" +
        "(https://github.com/rhasspy/piper — free, redistributable voices).",
    );
    return;
  }
  const ext = provider === "edgetts" ? "mp3" : "wav";
  if (provider === "edgetts") {
    const bin = process.env.EDGE_TTS_BIN ?? "edge-tts";
    await run(bin, ["--version"]); // sanity-check once up front
  } else {
    const piper = process.env.PIPER_BIN;
    if (!piper) throw new Error("PIPER_BIN not set (path to piper executable)");
    await run(piper, ["--help"]); // sanity-check the binary once up front
  }

  const dir = workDir(section);
  const audioDir = join(dir, "audio");
  await mkdir(audioDir, { recursive: true });

  const items: TtsItem[] = [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".reviewed.json"));
  for (const f of files.sort()) {
    const reviewed = ReviewedPageSchema.parse(
      JSON.parse(await readFile(join(dir, f), "utf8")),
    );
    if (reviewed.status !== "approved") continue;
    for (const v of reviewed.extract.vocab) {
      items.push({ key: `vocab:${v.word}`, text: v.word });
      if (v.example) items.push({ key: `ex:${v.example}`, text: v.example });
    }
    for (const s of reviewed.extract.sentences)
      items.push({ key: `sent:${s.text}`, text: s.text });
  }

  // comprehension questions + options — every enriched.*.json file
  // (comprehension LLM pass §6.5, bookex book-exercise pass)
  for (const ef of (await readdir(dir)).filter(
    (f) => f.startsWith("enriched.") && f.endsWith(".json"),
  )) {
    const comps = JSON.parse(await readFile(join(dir, ef), "utf8")) as {
      payload?: { question?: string; options?: string[] };
    }[];
    for (const c of comps) {
      const q = c.payload?.question;
      if (q) items.push({ key: `cq:${q}`, text: q });
      for (const o of c.payload?.options ?? [])
        items.push({ key: `cqo:${o}`, text: o });
    }
  }

  const manifest: Record<string, { normal: string; slow?: string }> = {};
  let made = 0;
  let cached = 0;
  for (const item of items) {
    for (const speed of SPEEDS) {
      const name = audioFileName(item.text, voice, speed, ext);
      const out = join(audioDir, name);
      if (await exists(out)) {
        manifest[item.key] = manifest[item.key] ?? { normal: "" };
        manifest[item.key][speed] = `audio/${name}`;
        cached++;
        continue;
      }
      process.stdout.write(`tts [${speed}] "${item.text.slice(0, 40)}" … `);
      try {
        await synthesize(item.text, voice, speed, out, provider);
      } catch {
        // transient provider failure (edge-tts NoAudioReceived etc.) — one retry
        try {
          await synthesize(item.text, voice, speed, out, provider);
        } catch {
          console.log("FAILED — skipped (no manifest entry)");
          continue;
        }
      }
      manifest[item.key] = manifest[item.key] ?? { normal: "" };
      manifest[item.key][speed] = `audio/${name}`;
      console.log("ok");
      made++;
    }
  }
  await writeFile(
    join(dir, "audio.manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`tts: ${made} generated, ${cached} cached → ${audioDir}`);
}
