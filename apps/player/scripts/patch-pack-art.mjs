// Patches generated vocab art into packs: copies public/art/<file> into
// content/packs/<id>/images/art/ and sets vocab[].image. Run after `pack` rebuilds
// (repacking wipes image fields), then `sync-packs`.
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const artDir = join(root, "apps/player/public/art");

// word (exact pack vocab string) -> art file in public/art/
const MAP = {
  "english-g3-ch01": {
    nugget: "vocab-nugget.png",
    pan: "vocab-pan.png",
    steer: "vocab-steer.png",
    "Rise and shine": "vocab-sunrise.png",
    bolted: "vocab-bolted.png",
    panned: "vocab-panned.png",
    "washed away": "vocab-washedaway.png",
    headed: "vocab-headed.png",
    strike: "vocab-strike.png",
  },
  "arabic-g3-u1": {
    "كَرِيمٌ": "ar-karim.png",
    "مُتَعَاوِنٌ": "ar-taawun.png",
    "صَادِقٌ": "ar-sadiq.png",
    "رَحِيمٌ": "ar-rahim.png",
    "مُهَذَّبٌ": "ar-muhadhdhab.png",
    "أَمِينٌ": "ar-amin.png",
    "لِإِقْلَاعِ": "ar-iqlaaq.png",
    "الْمُضِيفَ": "ar-mudhif.png",
    "ضَجِيجًا": "ar-dajij.png",
    "يُطَالِعُ": "ar-yutali.png",
    "مُبَذِّرٌ": "ar-mubadhdhir.png",
    "طَمَّاعٌ": "ar-tammaa.png",
    "كَذَّابٌ": "ar-kadhdhab.png",
    "غَشَّاشٌ": "ar-ghashshash.png",
    "ظَالِمٌ": "ar-dhalim.png",
    "بَخِيلٌ": "ar-bakhil.png",
    "مُشَرِّفَةً": "ar-musharrifa.png",
    "هَدْيٌ": "ar-hady.png",
    "نَمَّامًا": "ar-nammam.png",
    "مُغْتَابًا": "ar-nammam.png",
    "الْمُعَلِّمُ": "ar-muallim.png",
    "الْاِبْتِدَائِيُّ": "ar-ibtidai.png",
    "يُعَرِّفُوا": "ar-yuarrifu.png",
  },
};

let patched = 0, missing = [];
for (const [packId, words] of Object.entries(MAP)) {
  const packPath = join(root, "content/packs", packId, "pack.json");
  if (!existsSync(packPath)) { console.log(`${packId}: no pack.json — skipped`); continue; }
  const pack = JSON.parse(readFileSync(packPath, "utf8"));
  const imgDir = join(root, "content/packs", packId, "images/art");
  for (const v of pack.vocab ?? []) {
    const file = words[v.word];
    if (!file) continue;
    const src = join(artDir, file);
    if (!existsSync(src)) { missing.push(`${packId}: ${v.word} → ${file} (not generated yet)`); continue; }
    mkdirSync(imgDir, { recursive: true });
    copyFileSync(src, join(imgDir, file));
    v.image = { src: `images/art/${file}`, source: "own" };
    patched++;
  }
  writeFileSync(packPath, JSON.stringify(pack, null, 1));
}
console.log(`patched ${patched} vocab images`);
if (missing.length) console.log("missing art:\n" + missing.join("\n"));
