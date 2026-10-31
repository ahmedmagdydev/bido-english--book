import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PageExtractSchema } from "@pagebuddy/schema";
const dir = "../../content/work/ar";
let ok = 0, fail = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".raw.json")).sort()) {
  try {
    const p = PageExtractSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8")));
    console.log(`${f}  OK  ${p.pageType}  vocab=${p.vocab.length} sent=${p.sentences.length} uncertain=${p.uncertain.length}`);
    ok++;
  } catch (e: any) {
    console.log(`${f}  FAIL  ${String(e.issues?.[0]?.message ?? e).slice(0,120)}`);
    fail++;
  }
}
console.log(`\n${ok} ok, ${fail} failed`);
