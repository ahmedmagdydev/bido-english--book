import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  ReviewedPageSchema,
  detectLang,
  DISTRACTOR_LETTERS,
  lettersOf,
  normWord,
  wordList,
  type ExerciseItem,
  type PackLang,
  type PageExtract,
} from "@pagebuddy/schema";
import { workDir } from "./paths.js";

// Deterministic exercise generation from approved page extracts (plan §6.5).
// Output lands in work/<section>/enriched.exercises.json with approved:false —
// the parent must approve everything before it reaches a pack.
// Language (en/ar) is detected from the extracted text — no flag needed.

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

const norm = (w: string, lang: PackLang = "en") => normWord(w, lang);

// Dedupes by normalized form but returns DISPLAY words (keeps tashkeel for
// Arabic options instead of bare stripped forms).
function pickDistractors(
  target: string,
  pool: string[],
  count: number,
  lang: PackLang = "en",
): string[] {
  const t = norm(target, lang);
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const w of pool) {
    const n = norm(w, lang);
    if (!n || n === t || seen.has(n)) continue;
    seen.add(n);
    candidates.push(w);
  }
  // prefer similar-length words, then shuffle deterministically-ish
  candidates.sort(
    (a, b) =>
      Math.abs(norm(a, lang).length - t.length) -
      Math.abs(norm(b, lang).length - t.length),
  );
  return candidates.slice(0, count);
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

  const lang = detectLang([
    ...vocab.map((v) => v.word),
    ...sentences.map((s) => s.text),
  ]);
  const vocabWords = vocab.map((v) => v.word);
  const out: ExerciseItem[] = [];
  let n = 0;
  const id = (p: string) => `${section}_${p}_${String(++n).padStart(3, "0")}`;

  // listenPick: hear word → pick correct option (§6.5)
  for (const v of vocab) {
    const distractors = pickDistractors(v.word, vocabWords, 3, lang);
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

  // spellingTiles: grapheme tiles + distractor letters (§6.5). Arabic tiles
  // keep letter+harakat together; distractors are bare Arabic letters whose
  // normalized form isn't already in the word.
  for (const v of vocab) {
    const letters = lettersOf(v.word, lang);
    if (letters.length < 2 || letters.length > 12) continue;
    const wn = norm(v.word, lang);
    const extras = DISTRACTOR_LETTERS[lang]
      .split("")
      .filter((l) => !letters.includes(l) && !wn.includes(l))
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
    const words = wordList(s.text, lang);
    if (words.length >= 3) {
      // keep display forms (tashkeel intact for ar); pick the longest
      // normalized candidate — Arabic words run shorter so the bar drops.
      const candidates = words
        .slice(1)
        .filter((w) => norm(w, lang).length >= (lang === "ar" ? 3 : 4));
      const blank = candidates.sort(
        (a, b) => norm(b, lang).length - norm(a, lang).length,
      )[0];
      if (blank) {
        const distractors = pickDistractors(blank, vocabWords, 2, lang);
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
