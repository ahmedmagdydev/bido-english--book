// Language-aware text utilities shared by the pipeline (enrich/pack) and the
// player (session builder). Arabic support: tashkeel rides on its letter as
// one grapheme; comparison keys strip harakat + tatweel and fold alef forms.

export type PackLang = "en" | "ar";

const AR_CHAR = /[؀-ۿ]/;
// letter ranges: ء-غ (0621-063A), ف-ي (0641-064A), ٮ-ۓ (066E-06D3)
const AR_LETTER = "ء-غف-يٮ-ۓ";
const HARAKAT = "ً-ٰٟ"; // 064B-065F + 0670
export const isArabic = (s: string) => AR_CHAR.test(s);
export function detectLang(texts: string[]): PackLang {
  return texts.some(isArabic) ? "ar" : "en";
}

const seg =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function graphemes(s: string): string[] {
  if (seg) return [...seg.segment(s)].map((x) => x.segment);
  return [...s];
}

// Normalized form for matching/dedup/answers — NOT for display.
export function normWord(w: string, lang: PackLang): string {
  if (lang === "ar") {
    return w
      .normalize("NFC")
      .replace(/ـ/g, "")
      .replace(new RegExp(`[${HARAKAT}]`, "g"), "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(new RegExp(`[^${AR_LETTER}]`, "g"), "");
  }
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

// Tile-level letters: Arabic keeps letter+harakat as one grapheme tile
// (that's how G3 books drill spelling); English stays per-character.
export function lettersOf(word: string, lang: PackLang): string[] {
  if (lang === "ar") return graphemes(word).filter((g) => AR_CHAR.test(g));
  return normWord(word, "en").replace(/'/g, "").split("");
}

// Letter pools for spelling-tile distractors.
export const DISTRACTOR_LETTERS: Record<PackLang, string> = {
  en: "etaoinshrdlu",
  ar: "بتثجحخدذرزسشصضطظعغفقكلمنهوياأ",
};

// Words in a sentence, language-aware. Arabic = letter runs with internal
// harakat kept (display form); tatweel is excluded.
export function wordList(text: string, lang: PackLang): string[] {
  if (lang === "ar") {
    const re = new RegExp(`[${AR_LETTER}](?:[${HARAKAT}]*[${AR_LETTER}])*`, "g");
    return text.match(re) ?? [];
  }
  return text.match(/[A-Za-z']+/g) ?? [];
}
