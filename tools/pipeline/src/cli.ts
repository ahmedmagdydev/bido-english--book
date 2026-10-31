import { Command } from "commander";
import { config } from "dotenv";
import { isAbsolute, join, resolve } from "node:path";
import { REPO_ROOT, photosDir } from "./paths.js";
import { extractSection } from "./extract.js";
import { pdfToImages } from "./pdf.js";
import { enrichSection } from "./enrich.js";
import { comprehendSection } from "./comprehend.js";
import { bookexSection } from "./bookex.js";
import { ttsSection } from "./tts.js";
import { buildPack } from "./pack.js";

// Load .env from repo root and pipeline dir (local overrides win).
config({ path: join(REPO_ROOT, ".env") });
config({ path: join(REPO_ROOT, "tools/pipeline/.env") });

const program = new Command();
program
  .name("pipeline")
  .description("PageBuddy content pipeline: photos → extract → review → enrich → tts → pack");

program
  .command("pdf2img")
  .argument("<pdf>", "path to a scanned PDF")
  .argument("<section>", "content section name, e.g. scan or ch01")
  .option("--scale <n>", "render scale", (v) => parseFloat(v), 2.0)
  .action(async (pdf: string, section: string, o: { scale: number }) => {
    // resolve user paths against the directory they invoked from (pnpm INIT_CWD)
    const base = process.env.INIT_CWD ?? process.cwd();
    const pdfPath = isAbsolute(pdf) ? pdf : resolve(base, pdf);
    await pdfToImages(pdfPath, photosDir(section), o.scale);
  });

program
  .command("extract")
  .argument("<section>", "content section (reads content/photos/<section>)")
  .option("--photos <dir>", "override photos dir")
  .option("--limit <n>", "max pages", (v) => parseInt(v, 10))
  .action(async (section: string, o: { photos?: string; limit?: number }) => {
    await extractSection({
      section,
      photosDir: o.photos ?? photosDir(section),
      limit: o.limit,
    });
  });

program
  .command("enrich")
  .argument("<section>")
  .action(async (section: string) => {
    await enrichSection(section);
  });

program
  .command("comprehend")
  .argument("<section>")
  .action(async (section: string) => {
    await comprehendSection(section);
  });

program
  .command("bookex")
  .argument("<section>")
  .action(async (section: string) => {
    await bookexSection(section);
  });

program
  .command("tts")
  .argument("<section>")
  .option("--provider <p>", "tts provider: piper | edgetts")
  .action(async (section: string, o: { provider?: string }) => {
    if (o.provider) process.env.TTS_PROVIDER = o.provider;
    await ttsSection(section);
  });

program
  .command("pack")
  .requiredOption("--sections <list>", "comma-separated sections, e.g. scan,ch01")
  .requiredOption("--pack-id <id>", "e.g. english-g3-ch01")
  .option("--title <t>", "pack title", "English")
  .option("--lang <l>", "pack language: en | ar (default: auto-detect)")
  .option("--version <n>", "pack version", (v) => parseInt(v, 10), 1)
  .action(
    async (o: { sections: string; packId: string; title: string; version: number; lang?: string }) => {
      await buildPack({
        sections: o.sections.split(",").map((s) => s.trim()),
        packId: o.packId,
        title: o.title,
        version: o.version,
        language: o.lang === "ar" || o.lang === "en" ? o.lang : undefined,
      });
    },
  );

program.parseAsync().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
