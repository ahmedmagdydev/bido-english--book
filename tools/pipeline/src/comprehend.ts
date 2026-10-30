import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile, readdir, access } from "node:fs/promises";
import { join } from "node:path";
import {
  ExerciseItemSchema,
  ReviewedPageSchema,
  type ExerciseItem,
} from "@pagebuddy/schema";
import { workDir } from "./paths.js";

// LLM-generated comprehension questions from approved reading passages
// (plan §6.5 last row: "True/false, comprehension — LLM-generated, must be
// approved"). Output lands in work/<section>/enriched.comprehension.json with
// approved:false — the parent must approve everything before it reaches a pack.
// Re-runs preserve the approved flag on items with unchanged ids.

const MODEL = process.env.COMPREHENSION_MODEL ?? "claude-sonnet-5-5";

const PROMPT = `You write reading-comprehension questions for an 8-year-old
learning English as a second language (grade 3, CEFR A1-A2).

You are given numbered passages made of sentences extracted from his school
book. For EACH passage write questions:

- 2 multiple-choice questions ("mcq"): one literal detail question and one
  simple inference/why question. Exactly 3 short options; the answer must be
  clearly supported by the passage text. Distractors must be plausible but
  clearly wrong — never tricky or ambiguous.
- 1 true/false statement ("tf"): a statement that is clearly true OR clearly
  false according to the passage. Mix true and false across the set.

Rules:
- Use vocabulary a grade-3 ESL child can read.
- Questions must be answerable from the passage ALONE — no outside knowledge.
- Keep options short (2-6 words).
- Never reference "the passage" or "the text" in the question.

Return ONLY valid JSON:
{ "questions": [ { "passage": number, "kind": "mcq" | "tf",
    "question": string,
    "options": [string, string, string] | null,
    "answer": string | boolean } ] }
For "tf": question = the statement, options = null, answer = true or false.
For "mcq": answer = the correct option text (must be one of the options).`;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

interface Passage {
  idx: number;
  text: string;
  sentences: string[];
  sourcePage: number;
}

// Group approved reading-page sentences into passages of 3-6 sentences.
async function loadPassages(section: string): Promise<Passage[]> {
  const dir = workDir(section);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".reviewed.json"));
  const passages: Passage[] = [];
  let pending: { text: string; page: number }[] = [];

  const flush = () => {
    if (pending.length < 3) return; // too short for questions
    const texts = pending.map((s) => s.text);
    passages.push({
      idx: passages.length,
      text: texts.join(" "),
      sentences: texts,
      sourcePage: pending[0].page,
    });
    pending = [];
  };

  for (const f of files.sort()) {
    const reviewed = ReviewedPageSchema.parse(
      JSON.parse(await readFile(join(dir, f), "utf8")),
    );
    if (reviewed.status !== "approved") continue;
    const ex = reviewed.extract;
    // only real reading/dialogue pages make comprehension passages
    if (ex.pageType !== "reading" && ex.pageType !== "dialogue" && ex.pageType !== "mixed") {
      continue;
    }
    const page = ex.pageNumber ?? 0;
    for (const s of ex.sentences) {
      const t = s.text.trim();
      if (t.split(/\s+/).length < 4) continue; // skip captions/fragments
      pending.push({ text: t, page });
      if (pending.length >= 6) flush();
    }
    flush(); // don't merge across pages — questions stay page-local
  }
  return passages;
}

interface LlmQuestion {
  passage: number;
  kind: "mcq" | "tf";
  question: string;
  options: string[] | null;
  answer: string | boolean;
}

export async function comprehendSection(section: string): Promise<void> {
  const passages = await loadPassages(section);
  if (!passages.length) {
    console.log(`no approved reading passages in ${workDir(section)}`);
    return;
  }
  console.log(`comprehend: ${passages.length} passages → asking ${MODEL}…`);

  const list = passages
    .map((p) => `[${p.idx}] ${p.text}`)
    .join("\n\n");
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: PROMPT + "\n\nPassages:\n" + list }],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as { questions: LlmQuestion[] };

  // preserve prior approvals on unchanged ids
  const outPath = join(workDir(section), "enriched.comprehension.json");
  const prior = new Map<string, boolean>();
  if (await exists(outPath)) {
    try {
      for (const e of JSON.parse(await readFile(outPath, "utf8")) as ExerciseItem[])
        prior.set(e.id, e.approved);
    } catch {
      /* corrupt prior file — regenerate */
    }
  }

  const out: ExerciseItem[] = [];
  let n = 0;
  let skipped = 0;
  for (const q of parsed.questions) {
    const p = passages[q.passage];
    if (!p) {
      skipped++;
      continue;
    }
    const payload: Record<string, unknown> = {
      kind: q.kind,
      passage: p.text,
      passageSentences: p.sentences,
      question: q.question,
      answer: q.answer,
      sourcePage: p.sourcePage,
    };
    if (q.kind === "mcq") {
      if (!q.options || q.options.length !== 3) {
        skipped++;
        continue;
      }
      if (typeof q.answer !== "string" || !q.options.includes(q.answer)) {
        skipped++;
        continue;
      }
      payload.options = q.options;
    } else if (typeof q.answer !== "boolean") {
      skipped++;
      continue;
    }
    const id = `${section}_comp_${String(++n).padStart(3, "0")}`;
    const item = {
      id,
      type: "comprehension",
      refs: [],
      payload,
      approved: prior.get(id) ?? false,
    };
    try {
      out.push(ExerciseItemSchema.parse(item));
    } catch {
      skipped++;
    }
  }

  await writeFile(outPath, JSON.stringify(out, null, 2));
  const kinds = out.reduce<Record<string, number>>((m, e) => {
    const k = String((e.payload as { kind?: string }).kind ?? "?");
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  console.log(
    `comprehend: ${out.length} questions → ${outPath} (${skipped} skipped)`,
  );
  console.log(kinds);
  console.log("NOTE: approved:false — review before packing (same as enrich).");
}
