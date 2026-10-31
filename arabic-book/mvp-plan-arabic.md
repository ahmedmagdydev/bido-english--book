# PageBuddy العربية — MVP Plan

> Companion to `pyhsical-book/english-learning-app-plan-v2.md`. All decisions
> D1–D7 carry over unchanged. This plan covers ONLY the Arabic deltas.
> Last updated: 2026-10-31

## 0. TL;DR

Same monorepo, same pipeline, **same single app**. An Arabic lesson becomes
one more pack in `packs/index.json` with `language:"ar"` + `dir:"rtl"`; the
player flips to RTL + Arabic chrome automatically. The Capacitor iOS app
already deployed on his iPad picks it up via `cap sync` — no tunnel, no
second app, no new architecture.

## 1. Inputs (verified 2026-10-31)

- **Book**: `arabic-book/1448-GE-PE-K03-SM1-lang-part1.pdf` — official Saudi
  MoE Grade-3 Arabic textbook, semester 1, **170 pages**, full tashkeel,
  crisp digital render (not photos). Unit seen: «ربوع من بلادي».
- **TTS**: Edge neural voices via `edge-tts` (verified, `ar-SA-ZariyahNeural`
  female Saudi — matches the MoE audience). Free, no key; needs internet at
  pack-build time only. Fallbacks: local voice-studio OmniVoice (needs a
  ~20 s Arabic reference clip to clone — silent without one), Piper
  `ar_JO-kareem` (male, offline).
- **Extraction**: agent-side (no API key) — page images read directly into
  `PageExtractSchema`, proven on 62 English pages. Arabic + tashkeel render
  cleanly.

## 2. Schema deltas (`packages/schema`)

- `LessonPackSchema`: add `language: z.enum(["en","ar"]).default("en")` and
  `dir: z.enum(["ltr","rtl"]).default("ltr")`. Everything else unchanged —
  vocab/sentences/exercises/pages/progress are language-agnostic.
- POS stays the English enum; Arabic grammar maps to `other` (لا تُستخدم
  تصنيفات إنجليزية). `arabicHint` field unused for ar packs.

## 3. Player deltas (`apps/player`)

- **Direction**: when `pack.dir==="rtl"`, set `dir="rtl"` + `lang="ar"` on
  the `.page` root (App-level context). Flexbox/grid flip automatically.
- **CSS audit**: physical props (`margin-left/right`, `left/right`,
  `border-left`, `text-align:left`, `.sentence-chip`) → logical props or
  `[dir="rtl"]` overrides. Estimated ~10 spots (sentence chips, reader,
  exercise labels, map zigzag, drag tiles unaffected).
- **Font**: Arabic system stack (`"Geeza Pro","SF Arabic","Segoe UI"`) is
  fine on iPadOS; optionally bundle `@fontsource/amiri` for nicer tashkeel.
  Keep Andika for Latin digits/punctuation.
- **Chrome strings**: ~15-string map keyed by `pack.language` — Play→العب,
  New word→كلمة جديدة, Hear it→اسمعها, Slow→ببطء, Great job→أحسنت, Read the
  story→اقرأ القصة, streak→أيام متتالية, etc. Component labels only; parent
  area stays English.
- **No changes needed**: audio engine, Dexie, Leitner, sessions, speak
  mode (record-compare is language-free), spike page, iOS shell.

## 4. Pipeline deltas (`tools/pipeline`)

- **Text segmentation** (the one real bug-class): `letters()` in
  `enrich.ts` + `session/builder.ts` uses `.split("")` → tashkeel becomes
  orphan tiles. Replace with grapheme segmentation (`Intl.Segmenter` or a
  small Arabic-aware splitter): letter + its harakat = one tile;
  tatweel `ـ` stripped; non-joining letters (ا د ذ ر ز و) are fine as
  tiles since tiles show isolated forms (matches how G3 books drill them).
- **`norm()`**: add Arabic normalization — strip tatweel, normalize
  أ/إ/آ→ا for *comparison keys only* (display text stays as printed).
- **`edgetts` TTS provider**: `npx edge-tts` or direct WS call; env
  `EDGE_VOICE` default `ar-SA-ZariyahNeural`; slow variant via
  `--rate=-25%`. Outputs mp3 (pack.ts already accepts `.mp3`). Serial
  calls, sha1-keyed cache identical to the Piper path. Select provider
  per pack: `pipeline tts <section> --provider edgetts`.
- **`enrich`**: all generators work once `letters()` is grapheme-aware.
  `minimalPartner()` (English suffix rules) is English-only — skip
  minimalPair generation for ar packs (or later: hand-seeded confusion
  pairs ب/ت/ث، ح/خ، س/ش).
- **CLI**: commands take `--lang ar` where they alter text handling
  (`extract` prompt, `pack` writes `language/dir` into pack.json).
- `comprehend.ts` deferred (needs API key; can hand-author like ch01).

## 5. Content plan

1. `pipeline pdf2img arabic-book/1448-GE-PE-K03-SM1-lang-part1.pdf ar01`
   → `content/photos/ar/` (JPEG q85).
2. **Pilot: pages 1–10** extracted agent-side → eyeball review (vocab,
   sentences, uncertain flags) → `enrich` → `tts --provider edgetts` →
   pack `arabic-g3-s1-pilot`. Play it — this is the go/no-go gate.
3. Remaining ~160 pages in ~5 batches of ~32 (parallel agents, same as
   English). Provisional approvals → parent review later.
4. Pack `arabic-g3-s1` (or per-unit packs `arabic-g3-u1`…) → `sync-packs`
   → appears in `#/map` picker automatically.

## 6. Extraction notes for the agents

- Transcribe **with tashkeel exactly as printed**; flag illegible harakat
  in `uncertain` rather than guessing.
- Vocab = word banks / highlighted words; `pos` from the English enum or
  `other`. Grammar sections (نحو) → `grammarPoints`; exercises →
  `exerciseBlocks`; story paragraphs → `sentences` with `speaker` when
  dialogue.
- Fill-in blanks/worksheet lines stay out of `sentences` (same rule as
  English book). Handwritten student marks → `uncertain`, never vocab.

## 7. MVP scope & gates

- **MVP = one unit (~30–40 pages) playable RTL end-to-end.** Not all 170
  pages, not speech grading, not comprehension generation.
- Done when: he finishes an Arabic session unprompted + parent approves
  the pack (same gate as English Phase 2).
- Deferred: Whisper-based pronunciation scoring (voice-studio STT is
  installed-ready — record clips could be graded at review time on PC),
  Arabic boss content, confusion-pair minimalPair, Arabic rewards art
  (existing art is language-neutral).

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Tashkeel as tile codepoints | Grapheme segmentation (§4) + pilot test |
| Extraction misreads diacritics | Crisp 150-dpi renders; uncertain-flag + parent review (proven flow) |
| edge-tts needs internet at build time | Acceptable (build-time only); voice-studio/Piper fallbacks |
| RTL layout surprises | Audit + screenshot pass on fresh port (scratchpad lesson) |
| Arabic UI strings wrong tone | Parent reviews the ~15 strings |
| Copyright (MoE book) | `arabic-book/*.pdf` + `content/` stay gitignored, same as English |
