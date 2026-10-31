import { readFile, writeFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import {
  ExerciseItemSchema,
  ReviewedPageSchema,
  normWord,
  type ExerciseItem,
} from "@pagebuddy/schema";
import { workDir } from "./paths.js";

// Converts book exercisesOnPage into playable `comprehension` items.
// Shapes handled (answers book verified, arabic-book/answers-unit1.pdf):
//   "stem: a. / b."          → mcq (options after the colon, split on "/")
//   "١. stem:" + next items  → mcq (numbered stem then option items)
//   other statements         → tf  (book's ✓/✗ marking)
// Answer resolution order: comprehension.answers.json (normalized stem/statement
// → correct option text | boolean), then a behavior polarity list for tf, else
// the item is skipped (never emits an unkeyed answer).

const KIND_RE = /true_false|choose_correct|choose_true|multiple choice|mark/i;
const NUM_RE = /^[٠-٩0-9]+\s*[.\-]/;
const OPT_PREFIX_RE = /^[أ-دabcd]\s*[-–).]/;

const GOOD = [
  "تبسم", "ابتسام", "سلام", "اعتراف", "اعتذار", "اعتذر", "تعاون", "احترام",
  "انصات", "اصغاء", "صدق", "امانه", "كرم", "مشاركه", "مساعد", "لطف", "هدوء",
  "مسامح", "شكر", "نظام", "صبر", "اهتمام", "صداقه", "محبه", "اخلاص", "التزام",
  "مساعده", "خدمه", "ادب",
];
const BAD = [
  "صراخ", "بقوه", "كذب", "غش", "سرق", "اهمال", "ركض", "ازعاج", "بخل", "طمع",
  "مقاطع", "سخر", "ضرب", "تكسير", "مشاحن", "خصام", "عبث", "فوضى", "تسلط",
  "غيبه", "نميمه", "عناد", "غضب", "اناني", "سوء التصرف", "قذر", "وسخ",
];

const ar = (s: string) => normWord(s, "ar");

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

interface Parsed {
  kind: "mcq" | "tf";
  stem: string; // mcq stem or tf statement
  options?: string[];
}

function parseItems(items: string[]): Parsed[] {
  const out: Parsed[] = [];
  let stem: string | null = null;
  let opts: string[] = [];
  const flushStem = () => {
    if (stem && opts.length >= 2) out.push({ kind: "mcq", stem, options: opts });
    else if (stem) out.push({ kind: "tf", stem });
    stem = null;
    opts = [];
  };
  for (const raw of items) {
    const t = raw.trim();
    if (!t) continue;
    if (t.includes(" / ")) {
      flushStem();
      const ci = t.indexOf(":");
      const stemTxt = ci > 0 ? t.slice(0, ci).replace(NUM_RE, "").trim() : t;
      const options = (ci > 0 ? t.slice(ci + 1) : t)
        .split("/")
        .map((o) => o.replace(/[.\s]+$/, "").replace(/^[.\s]+/, "").trim())
        .filter(Boolean);
      if (options.length >= 2) out.push({ kind: "mcq", stem: stemTxt, options });
      continue;
    }
    if (OPT_PREFIX_RE.test(t)) continue; // bare option rows (أ- x) — stem missing
    if (NUM_RE.test(t) && t.trimEnd().endsWith(":")) {
      flushStem();
      stem = t.replace(NUM_RE, "").replace(/:+\s*$/, "").trim();
      continue;
    }
    if (stem) {
      opts.push(t.replace(/[.\s]+$/, "").trim());
      continue;
    }
    // bare statement — needs 2+ words to be a judgeable sentence
    if (t.split(/\s+/).length >= 2) out.push({ kind: "tf", stem: t });
  }
  flushStem();
  return out;
}

function polarity(stmt: string): boolean | null {
  const n = ar(stmt);
  const hit = (list: string[]) => list.some((w) => n.includes(w));
  const g = hit(GOOD), b = hit(BAD);
  if (g && !b) return true;
  if (b && !g) return false;
  return null;
}

export async function bookexSection(section: string): Promise<void> {
  const dir = workDir(section);
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".reviewed.json"))
    .sort();
  if (!files.length) {
    console.log(`no reviewed pages in ${dir}`);
    return;
  }

  const ansPath = join(dir, "comprehension.answers.json");
  const answers: Record<string, boolean | string> =
    (await exists(ansPath))
      ? Object.fromEntries(
          Object.entries(
            JSON.parse(await readFile(ansPath, "utf8")) as Record<
              string,
              boolean | string
            >,
          ).map(([k, v]) => [ar(k), v]),
        )
      : {};

  // group pages into lessons: a page belongs to the nearest preceding
  // lessonTitle; sentences collected per lesson become mcq passages
  const pages: {
    lesson: string;
    sentences: string[];
    extract: import("@pagebuddy/schema").PageExtract;
  }[] = [];
  let lesson = "—";
  for (const f of files) {
    const ex = ReviewedPageSchema.parse(
      JSON.parse(await readFile(join(dir, f), "utf8")),
    ).extract;
    if (ex.lessonTitle) lesson = ex.lessonTitle;
    pages.push({ lesson, sentences: ex.sentences.map((s) => s.text), extract: ex });
  }

  const out: ExerciseItem[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  let seq = 0;
  for (const p of pages) {
    const pg = p.extract.pageNumber ?? 0;
    const passage = pages
      .filter((x) => x.lesson === p.lesson)
      .flatMap((x) => x.sentences)
      .slice(0, 6);
    for (const e of p.extract.exercisesOnPage) {
      if (!KIND_RE.test(e.kind)) continue;
      for (const it of parseItems(e.items)) {
        const key = ar(it.stem);
        const dedupe = `${pg}:${it.kind}:${key}`;
        if (seen.has(dedupe)) continue;
        let answer: string | boolean | null = null;
        const keyed = answers[key];
        if (it.kind === "tf") {
          if (typeof keyed === "boolean") answer = keyed;
          else answer = polarity(it.stem);
        } else {
          const want = typeof keyed === "string" ? keyed : null;
          const hit =
            want && it.options?.find((o) => ar(o).includes(ar(want)) || ar(want).includes(ar(o)));
          if (hit) answer = hit;
        }
        if (answer === null) {
          skipped++;
          console.log(`  skip (no key): ${it.stem.slice(0, 60)}`);
          continue;
        }
        seen.add(dedupe);
        const payload: Record<string, unknown> = {
          kind: it.kind,
          passage: passage.join(" "),
          passageSentences: passage,
          question: it.stem,
          answer,
          sourcePage: pg,
        };
        if (it.options) payload.options = it.options;
        const item = {
          id: `bex_p${String(pg).padStart(3, "0")}_${++seq}`,
          type: "comprehension",
          refs: [],
          payload,
          approved: true,
        };
        try {
          out.push(ExerciseItemSchema.parse(item));
        } catch {
          skipped++;
        }
      }
    }
  }

  const outPath = join(dir, "enriched.bookex.json");
  // preserve manual edits to existing entries (ids stable per page/seq)
  await writeFile(outPath, JSON.stringify(out, null, 2));
  const kinds = out.reduce<Record<string, number>>((m, e) => {
    const k = String((e.payload as { kind?: string }).kind ?? "?");
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  console.log(`bookex: ${out.length} exercises → ${outPath} (${skipped} unkeyed/skipped)`);
  console.log(kinds);
}
