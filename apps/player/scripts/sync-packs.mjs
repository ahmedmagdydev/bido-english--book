// Copies built lesson packs (content/packs/*) into public/packs/ so vite can
// serve them, and writes packs/index.json. Run after `pipeline pack`.
import { cpSync, mkdirSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../../content/packs");
const dst = join(here, "../public/packs");

if (!existsSync(src)) {
  console.log("no content/packs yet — nothing to sync");
  process.exit(0);
}
mkdirSync(dst, { recursive: true });

const packs = [];
for (const entry of readdirSync(src, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const packJson = join(src, entry.name, "pack.json");
  if (!existsSync(packJson)) continue;
  cpSync(join(src, entry.name), join(dst, entry.name), { recursive: true });
  packs.push(entry.name);
}
writeFileSync(join(dst, "index.json"), JSON.stringify({ packs }, null, 2));
console.log(`synced ${packs.length} pack(s) → public/packs: ${packs.join(", ")}`);
