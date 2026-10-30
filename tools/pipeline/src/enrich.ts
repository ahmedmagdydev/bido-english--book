import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  ReviewedPageSchema,
  type ExerciseItem,
  type PageExtract,
} from "@pagebuddy/schema";
import { workDir } from "./paths.js";

// Deterministic exercise generation from approved page extracts (plan §6.5).
// Output lands in work/<section>/enriched.exercises.json with approved:false —
// the parent must approve everything before it reaches a pack.

const WORD_RE = /[A-Za-z']+/g;

interface VocabLite {
  word: string;
  pos: string | null;
  page: string;
}
interface SentenceLite {
  text: string;
  speaker: string | null;
  page: string;
}

async function loadApproved(section: string) {
  const dir = workDir(section);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".reviewed.json"));
  const vocab: VocabLite[] = [];
  const sentences: SentenceLite[] = [];
  for (const f of files.sort()) {
    const raw = JSON.parse(await readFile(join(dir, f), "utf8"));
    const reviewed = ReviewedPageSchema.parse(raw);
    if (reviewed.status !== "approved") continue;
    const ex: PageExtract = reviewed.extract;
    const stem = f.replace(".reviewed.json", "");
    for (const v of ex.vocab) vocab.push({ word: v.word, pos: v.pos, page: stem });
    for (const s of ex.sentences)
      sentences.push({ text: s.text, speaker: s.speaker, page: stem });
  }
  return { vocab, sentences, pageCount: files.length };
}

const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");

function pickDistractors(
  target: string,
  pool: string[],
  count: number,
): string[] {
  const t = norm(target);
  const candidates = pool
    .map(norm)
    .filter((w) => w && w !== t)
    .filter((w, i, a) => a.indexOf(w) === i);
  // prefer similar-length words, then shuffle deterministically-ish
  candidates.sort(
    (a, b) => Math.abs(a.length - t.length) - Math.abs(b.length - t.length),
  );
  const picked: string[] = [];
  for (const c of candidates) {
    if (picked.length >= count) break;
    picked.push(c);
  }
  return picked;
}

function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function enrichSection(section: string): Promise<void> {
  const { vocab, sentences, pageCount } = await loadApproved(section);
  if (!vocab.length && !sentences.length) {
    console.log(`no approved content in ${workDir(section)} (${pageCount} reviewed files)`);
    return;
  }

  const vocabWords = vocab.map((v) => v.word);
  const out: ExerciseItem[] = [];
  let n = 0;
  const id = (p: string) => `${section}_${p}_${String(++n).padStart(3, "0")}`;

  // listenPick: hear word → pick correct option (§6.5)
  for (const v of vocab) {
    const distractors = pickDistractors(v.word, vocabWords, 3);
    if (distractors.length < 2) continue;
    out.push({
      id: id("listenpick"),
      type: "listenPick",
      refs: [],
      payload: {
        prompt: { kind: "word", text: v.word },
        options: shuffled([v.word, ...distractors], n),
        answer: v.word,
        sourcePage: v.page,
      },
      approved: false,
    });
  }

  // spellingTiles: letters + distractor letters (§6.5)
  for (const v of vocab) {
    const letters = norm(v.word).split("");
    if (letters.length < 2 || letters.length > 12) continue;
    const extras = "etaoinshrdlu"
      .split("")
      .filter((l) => !letters.includes(l))
      .slice(0, 3);
    out.push({
      id: id("spell"),
      type: "spellingTiles",
      refs: [],
      payload: {
        word: v.word,
        tiles: shuffled([...letters, ...extras], n),
        sourcePage: v.page,
      },
      approved: false,
    });
  }

  // cloze + sentenceBuilder from book sentences (§6.5)
  for (const s of sentences) {
    const words = s.text.match(WORD_RE) ?? [];
    if (words.length >= 3) {
      const candidates = words
        .slice(1)
        .filter((w) => w.length >= 4)
        .map(norm);
      const blank = candidates.sort((a, b) => b.length - a.length)[0];
      if (blank) {
        const distractors = pickDistractors(blank, vocabWords, 2);
        if (distractors.length >= 2) {
          out.push({
            id: id("cloze"),
            type: "cloze",
            refs: [],
            payload: {
              text: s.text,
              blank,
              options: shuffled([blank, ...distractors], n),
              sourcePage: s.page,
            },
            approved: false,
          });
        }
      }
    }
    if (words.length >= 4 && words.length <= 8) {
      out.push({
        id: id("builder"),
        type: "sentenceBuilder",
        refs: [],
        payload: {
          text: s.text,
          tokens: shuffled(s.text.split(/\s+/), n),
          sourcePage: s.page,
        },
        approved: false,
      });
    }
  }

  // matchPairs rounds: 5 pairs per round (§6.5)
  for (let i = 0; i + 5 <= vocab.length; i += 5) {
    const round = vocab.slice(i, i + 5);
    out.push({
      id: id("match"),
      type: "matchPairs",
      refs: [],
      payload: {
        pairs: round.map((v) => ({ word: v.word, hint: v.page })),
      },
      approved: false,
    });
  }

  const outPath = join(workDir(section), "enriched.exercises.json");
  await writeFile(outPath, JSON.stringify(out, null, 2));
  const counts = out.reduce<Record<string, number>>((m, e) => {
    m[e.type] = (m[e.type] ?? 0) + 1;
    return m;
  }, {});
  console.log(`enrich: ${out.length} exercises → ${outPath}`);
  console.log(counts);
  console.log("NOTE: all generated exercises have approved:false — review before packing.");
}
