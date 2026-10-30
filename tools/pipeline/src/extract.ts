import Anthropic from "@anthropic-ai/sdk";
import { writeFile, readdir, mkdir, access } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { PageExtractSchema, type PageExtract } from "@pagebuddy/schema";
import { rawPath, reviewedPath, workDir } from "./paths.js";

// Plan Appendix B — verbatim contract with PageExtractSchema.
const EXTRACTION_PROMPT = `You are helping build a learning app for an 8-year-old learning English from a school book.
You are given a photo of ONE book page. Extract its content faithfully.
Do not invent, correct, or "improve" text. If you cannot read something confidently,
put it in "uncertain" instead of guessing.

Return ONLY valid JSON matching this schema:
{
  "pageNumber": number | null,
  "lessonTitle": string | null,
  "pageType": "vocabulary" | "dialogue" | "reading" | "grammar" | "exercise" | "song" | "mixed",
  "vocab": [{ "word": string, "pos": string | null, "example": string | null,
              "hasPicture": boolean, "pictureBox": [x, y, w, h] | null }],
  "sentences": [{ "text": string, "speaker": string | null }],
  "grammarPoints": [{ "title": string, "explanation": string, "examples": string[] }],
  "exercisesOnPage": [{ "instruction": string, "kind": string, "items": string[] }],
  "uncertain": [{ "text": string, "reason": string }]
}
Coordinates in "pictureBox" are fractions of image width/height (0 to 1).`;

const MODEL = process.env.EXTRACTION_MODEL ?? "claude-sonnet-5-5";
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

async function extractImage(imagePath: string): Promise<PageExtract> {
  // Normalize any source image (phone photo or rendered PDF page) to what the
  // vision API wants: ≤1600px JPEG keeps us well under the 5 MB image limit.
  const data = (
    await sharp(imagePath)
      .rotate() // honor EXIF orientation from phone photos
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()
  ).toString("base64");
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data,
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return PageExtractSchema.parse(JSON.parse(text));
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

export interface ExtractOptions {
  section: string;
  photosDir: string;
  limit?: number;
}

export async function extractSection(opts: ExtractOptions): Promise<void> {
  const files = (await readdir(opts.photosDir))
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort()
    .slice(0, opts.limit ?? Infinity);

  if (!files.length) {
    console.log(`no images in ${opts.photosDir}`);
    return;
  }
  await mkdir(workDir(opts.section), { recursive: true });

  let done = 0;
  let skipped = 0;
  for (const f of files) {
    const stem = basename(f, extname(f));
    // never overwrite a page already reviewed (plan §6.3)
    if ((await exists(reviewedPath(opts.section, stem))) || (await exists(rawPath(opts.section, stem)))) {
      skipped++;
      continue;
    }
    const img = join(opts.photosDir, f);
    process.stdout.write(`extracting ${f} … `);
    const page = await withRetry(() => extractImage(img));
    await writeFile(
      rawPath(opts.section, stem),
      JSON.stringify(page, null, 2),
    );
    console.log(`ok (${page.vocab.length} vocab, ${page.sentences.length} sentences, ${page.uncertain.length} uncertain)`);
    done++;
  }
  console.log(`done: ${done} extracted, ${skipped} skipped (already exist)`);
}
