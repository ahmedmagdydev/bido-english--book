import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { ReviewedPageSchema } from "@pagebuddy/schema";
import { workDir } from "./paths.js";

const run = promisify(execFile);

// Cache key = hash(text + voice + speed) — re-runs only generate what changed
// (plan §6.1 stage 5). Provider: local Piper TTS (free, MIT-licensed voices,
// redistribution-friendly). Needs PIPER_BIN + PIPER_VOICE in env, e.g.:
//   PIPER_BIN=D:\tools\piper\piper.exe
//   PIPER_VOICE=D:\tools\piper\en_US-lessac-medium.onnx

export const SPEEDS = ["normal", "slow"] as const;
export type Speed = (typeof SPEEDS)[number];

export function audioFileName(text: string, voice: string, speed: Speed) {
  const h = createHash("sha1")
    .update(`${text}|${voice}|${speed}`)
    .digest("hex")
    .slice(0, 16);
  return `${h}.wav`;
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
): Promise<void> {
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
  const voice = process.env.PIPER_VOICE;
  if (!voice) {
    console.log(
      "PIPER_VOICE not set. Set PIPER_BIN + PIPER_VOICE to a Piper voice model\n" +
        "(https://github.com/rhasspy/piper — free, redistributable voices).",
    );
    return;
  }
  const piper = process.env.PIPER_BIN;
  if (!piper) throw new Error("PIPER_BIN not set (path to piper executable)");
  await run(piper, ["--help"]); // sanity-check the binary once up front

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

  // comprehension questions + options (LLM stage output, plan §6.5)
  const compPath = join(dir, "enriched.comprehension.json");
  if (await exists(compPath)) {
    const comps = JSON.parse(await readFile(compPath, "utf8")) as {
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
      const name = audioFileName(item.text, voice, speed);
      const out = join(audioDir, name);
      manifest[item.key] = manifest[item.key] ?? { normal: "" };
      manifest[item.key][speed] = `audio/${name}`;
      if (await exists(out)) {
        cached++;
        continue;
      }
      process.stdout.write(`tts [${speed}] "${item.text.slice(0, 40)}" … `);
      await synthesize(item.text, voice, speed, out);
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
