import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";
import {
  ExerciseItemSchema,
  LessonPackSchema,
  ReviewedPageSchema,
  detectLang,
  type ExerciseItem,
  type LessonPack,
  type SentenceItem,
  type VocabItem,
} from "@pagebuddy/schema";
import { packDir, photosDir, workDir } from "./paths.js";

// Stable id fragment for vocab words. Non-Latin words (Arabic etc.) fall
// back to a content hash — an empty slug would collapse every Arabic vocab
// item into one id.
const slug = (s: string) => {
  const latin = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (latin) return latin;
  return "u" + createHash("sha1").update(s).digest("hex").slice(0, 10);
};

// free-text pos from extraction → pack enum
function toPos(p: string | null): VocabItem["pos"] {
  if (!p) return "other";
  const t = p.toLowerCase();
  if (t.startsWith("noun")) return "noun";
  if (t.startsWith("verb")) return "verb";
  if (t.startsWith("adj")) return "adj";
  if (t.startsWith("adv")) return "adv";
  if (t.startsWith("prep")) return "prep";
  return "other";
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export interface PackOptions {
  sections: string[];
  packId: string;
  title: string;
  version: number;
  language?: "en" | "ar"; // default: auto-detected from pack content
}

// Assembles approved work-dir content into a validated LessonPack (plan §6.1
// stage 6). Audio/image refs come from conventions; missing FILES warn but
// don't fail — run `pipeline tts <section>` first for complete packs.
export async function buildPack(opts: PackOptions): Promise<void> {
  const vocab: VocabItem[] = [];
  const sentences: SentenceItem[] = [];
  const exercises: ExerciseItem[] = [];
  const pages: { page: number; image: string; lessonId?: string }[] = [];
  const warnings: string[] = [];
  const seenVocab = new Set<string>();
  let sentN = 0;
  let pageN = 0;

  const outDir = packDir(opts.packId);
  const imgDir = join(outDir, "images", "pages");
  const audioOut = join(outDir, "audio");
  await mkdir(imgDir, { recursive: true });
  await mkdir(audioOut, { recursive: true });

  for (const section of opts.sections) {
    const dir = workDir(section);
    const manifest = (await exists(join(dir, "audio.manifest.json")))
      ? (JSON.parse(
          await readFile(join(dir, "audio.manifest.json"), "utf8"),
        ) as Record<string, { normal: string; slow?: string }>)
      : {};

    const files = (await readdir(dir)).filter((f) =>
      f.endsWith(".reviewed.json"),
    );
    // approved page keys — stems ("p142") and printed folios ("142") — used
    // to drop enriched exercises whose sourcePage was excluded by the
    // include sheet (status flipped to "skipped")
    const okPages = new Set<string>();
    for (const f of files.sort()) {
      const stem = f.replace(".reviewed.json", "");
      const reviewed = ReviewedPageSchema.parse(
        JSON.parse(await readFile(join(dir, f), "utf8")),
      );
      if (reviewed.status !== "approved") continue;
      okPages.add(stem);
      if (reviewed.extract.pageNumber != null)
        okPages.add(String(reviewed.extract.pageNumber));
      const ex = reviewed.extract;
      const srcPage = ex.pageNumber ?? ++pageN;

      // compress the page photo into the pack (reader view)
      const photos = photosDir(section);
      const srcImg = join(photos, `${stem}.png`);
      const srcJpg = join(photos, `${stem}.jpg`);
      const pageImg = (await exists(srcImg)) ? srcImg : (await exists(srcJpg) ? srcJpg : null);
      if (pageImg) {
        const outName = `page-${String(srcPage).padStart(3, "0")}.jpg`;
        await sharp(pageImg)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 78 })
          .toFile(join(imgDir, outName));
        pages.push({ page: srcPage, image: `images/pages/${outName}` });
      }

      for (const v of ex.vocab) {
        const key = slug(v.word);
        if (!key || seenVocab.has(key)) continue;
        seenVocab.add(key);
        const audio = manifest[`vocab:${v.word}`];
        if (!audio) warnings.push(`no audio for vocab "${v.word}" — run tts`);
        vocab.push({
          id: `v_${key}`,
          word: v.word,
          pos: toPos(v.pos),
          example: v.example ?? undefined,
          tags: [],
          audio: audio ?? { normal: `audio/TODO_${key}.wav` },
          sourcePage: srcPage,
          provenance: "book",
        });
      }
      for (const s of ex.sentences) {
        const audio = manifest[`sent:${s.text}`];
        if (!audio) warnings.push(`no audio for sentence "${s.text.slice(0, 30)}…"`);
        sentences.push({
          id: `s_${String(++sentN).padStart(3, "0")}`,
          text: s.text,
          speaker: s.speaker ?? undefined,
          audio: audio ?? { normal: `audio/TODO_${sentN}.wav` },
          sourcePage: srcPage,
          provenance: "book",
        });
      }
    }

    // approved generated exercises only — enriched.*.json covers the
    // deterministic pass (exercises) and the LLM pass (comprehension)
    const enrichedFiles = (await readdir(dir)).filter(
      (f) => f.startsWith("enriched.") && f.endsWith(".json"),
    );
    for (const ef of enrichedFiles.sort()) {
      const all = JSON.parse(await readFile(join(dir, ef), "utf8")) as unknown[];
      for (const e of all) {
        const ex = ExerciseItemSchema.parse(e);
        if (!ex.approved) continue;
        // drop exercises sourced from a skipped/unselected page
        const sp = (ex.payload as { sourcePage?: unknown }).sourcePage;
        if (sp != null) {
          const s = String(sp).replace(/^p/i, "");
          if (!okPages.has(s) && !okPages.has(`p${s.padStart(3, "0")}`))
            continue;
        }
        // wire audio into comprehension payloads: passage lines reuse the
        // sent:* clips; question/options use cq:*/cqo:* clips when piper
        // generated them (player falls back to speechSynthesis otherwise)
        if (ex.type === "comprehension") {
          const p = ex.payload as {
            passageSentences?: string[];
            question?: string;
            options?: string[];
            audio?: Record<string, unknown>;
          };
          const audio: Record<string, unknown> = {};
          const passage = (p.passageSentences ?? [])
            .map((t) => manifest[`sent:${t}`])
            .filter(Boolean);
          if (passage.length) audio.passage = passage;
          if (p.question && manifest[`cq:${p.question}`])
            audio.question = manifest[`cq:${p.question}`];
          const optAudio: Record<string, unknown> = {};
          for (const o of p.options ?? []) {
            if (manifest[`cqo:${o}`]) optAudio[o] = manifest[`cqo:${o}`];
          }
          if (Object.keys(optAudio).length) audio.options = optAudio;
          if (Object.keys(audio).length) p.audio = audio;
        }
        exercises.push(ex);
      }
    }

    // copy audio into pack
    const sectionAudio = join(dir, "audio");
    if (await exists(sectionAudio)) {
      for (const f of await readdir(sectionAudio)) {
        if ([".wav", ".mp3", ".m4a"].includes(extname(f))) {
          await copyFile(join(sectionAudio, f), join(audioOut, f));
        }
      }
    }
  }

  // wire exercise refs to the ids they train
  const byWord = new Map(vocab.map((v) => [slug(v.word), v.id]));
  for (const ex of exercises) {
    const p = ex.payload as {
      prompt?: { text?: string };
      word?: string;
      text?: string;
    };
    const w = p.prompt?.text ?? p.word;
    if (w && byWord.has(slug(w))) ex.refs = [byWord.get(slug(w))!];
    if (!ex.refs.length) {
      const v = vocab.find((x) => p.text?.includes(x.word) || p.word === x.word);
      if (v) ex.refs = [v.id];
    }
  }

  const language =
    opts.language ??
    detectLang([...vocab.map((v) => v.word), ...sentences.map((s) => s.text)]);
  const pack: LessonPack = {
    packId: opts.packId,
    version: opts.version,
    title: opts.title,
    language,
    dir: language === "ar" ? "rtl" : "ltr",
    lessons: [
      {
        id: `${opts.packId}-all`,
        title: opts.title,
        vocabIds: vocab.map((v) => v.id),
        sentenceIds: sentences.map((s) => s.id),
        exerciseIds: exercises.map((e) => e.id),
      },
    ],
    vocab,
    sentences,
    exercises,
    pages,
  };
  const parsed = LessonPackSchema.parse(pack);
  const json = JSON.stringify(parsed, null, 2);
  const hash = createHash("sha256").update(json).digest("hex").slice(0, 16);

  await writeFile(join(outDir, "pack.json"), json);
  await writeFile(
    join(outDir, "meta.json"),
    JSON.stringify(
      { packId: opts.packId, contentHash: hash, builtAt: new Date().toISOString(), sections: opts.sections },
      null,
      2,
    ),
  );

  console.log(`pack: ${outDir}`);
  console.log(
    `  ${vocab.length} vocab, ${sentences.length} sentences, ` +
      `${exercises.length} approved exercises, ${pages.length} pages, hash ${hash}`,
  );
  if (warnings.length) {
    const uniq = [...new Set(warnings)];
    console.log(`  ${uniq.length} warnings (first 10):`);
    uniq.slice(0, 10).forEach((w) => console.log(`   - ${w}`));
  }
}
