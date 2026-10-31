# PageBuddy — Progress & Handoff

> Living document. Any developer or AI model can pick this project up from
> here. **Update it before ending every work session.**
>
> **Last updated:** 2026-10-31 (Windows)
> **Current phase:** Phase 2 MVP playable · Phase 3 started (parent area +
> speak mode built) · deployed to physical iPad · **Arabic track: Unit-1 pack
> complete (`arabic-g3-u1`, 40pp + book-exercise comprehension + full art)**
>
> **Continuation note:** **Capacitor path is DONE on the Mac** — repo now at
> `~/Desktop/projects/bido-english--book` with all packs/audio intact.
> `@capacitor/core+ios+cli` 8.6 added to `apps/player`, `capacitor.config.ts`
> (appId `com.pagebuddy.player`, webDir `dist`), `npx cap add ios` generated
> the Xcode project, simulator build **verified** (app launches, Home page
> renders the real ch01 pack + art — screenshot confirmed). Remaining step is
> physical: plug iPad into Mac → Xcode → Personal Team signing → Developer
> Mode → Run. `apps/player/ios/.gitignore` already excludes bundled web
> assets; root `.gitignore` still covers `content/`. PWA remains the source
> of truth — the iOS app just wraps `dist/`.

---

## 1. What this project is (30-second summary)

**PageBuddy** is a private, offline-first PWA that turns the pages of an
8-year-old's school book ("English" by Ahmed Magdy, ~120 pages) into short,
game-like lessons on his iPad 9th gen (A13, iPadOS 26). Book photos go
through a build-time pipeline on a Windows PC (Claude vision extraction →
human review → exercise generation → TTS audio) producing **lesson packs**
(JSON + images + audio) that a reusable React PWA player runs with Leitner
spaced repetition. All AI runs at build time; the iPad runs nothing but the
player. No accounts, no tracking, all progress in IndexedDB on-device.

**Read first (in this order):**
1. This file — current state.
2. `pyhsical-book/english-learning-app-plan-v2.md` — the full 612-line plan
   (decisions D1–D7, schemas, prompts, checklists). It is the source of truth.
3. `.devin/skills/pagebuddy/SKILL.md` — condensed working rules for AI agents.

## 2. Phase status

| Phase | Scope | Status | "Done when" (gate) |
|-------|-------|--------|---------------------|
| 0 | Device spike on the real iPad | 🟢 **Done** — ran inside the Capacitor app on iPad 9th gen (see §6): mic/audio/drag/rotate/memory pass, T2 found+fixed the capacitor status-0 fetch bug, speech recog unavailable (irrelevant — D3) | Written works/doesn't-work list (plan App. D) ✓ |
| 1 | Pipeline for Chapter 1 | 🟢 Pack `english-g3-ch01` built & valid; **agent review pass done** — all 46 ch01 + 26 scan uncertain flags triaged against photos, 1 real error fixed (p017 stray period). Approvals still marked provisional pending parent's eyes; review tool not started | Ch1 = validated pack, zero known extraction errors |
| 2 | MVP player | 🟢 **Playable against real pack**: pack loader (zod-validated), Leitner session builder (due+new items, box→exercise ladder, kind-failure re-queue at half credit), flashcards, 9 exercise types, stars+streak+goal ring, confetti end screen, tap-to-hear reader. Dexie progress + attempts recorded. `navigator.storage.persist()` wired (result shown in parent area). Andika font self-hosted via @fontsource | He completes a 10-min session unprompted and asks for more |
| 3 | Depth (all exercise types, record-compare, parent dashboard) | 🟡 Started: all 9 exercise types playable; `#/parent` built (arithmetic gate, dashboard w/ hardest words + week chart + accuracy + streak, export/import); `#/speak` record-compare built (model → record → replay → self-rate) — mic verified on hardware (spike T4) | Dashboard lists his 10 hardest words accurately |
| 4 | Scale to remaining chapters | 🟡 Started — journey layer built (`#/map` pack path doubles as pack picker, `#/rewards` sticker shelf, `#/boss` weakness-ranked boss round, streak freeze 1/week). Remaining: digitize more chapters (needs more book pages photographed) | Whole book playable; pipeline is one command per chapter |
| 5 | Optional: speech scoring, pack picker, sharing | ⬜ Not started | (After copyright gate, plan §12) |

## 3. Done so far

- [x] Plan v2 written and reviewed: `pyhsical-book/english-learning-app-plan-v2.md`
- [x] Book scan captured: `pyhsical-book/Scan_20261030_163113.pdf`
      covers **glossary + kick-off + introduction** — does NOT include
      Chapter 1 lesson pages (and TOC coverage unconfirmed)
- [x] Project skill + this progress file created (`.devin/skills/pagebuddy/`)
- [x] **Monorepo scaffolded** (pnpm workspaces): `apps/player`,
      `packages/schema`, `tools/pipeline`, `content/` git-ignored
- [x] **`packages/schema`** complete: pack/page-extract/progress zod schemas
      + Leitner scheduler — typechecks
- [x] **`apps/player` v0**: React+Vite+TS+vite-plugin-pwa, manifest + icons,
      safe-area CSS, Dexie tables (§9.2 shape), audio-unlock WebAudio helper,
      Home page with Play button. Production build verified (149 precache
      entries, sw.js generated)
- [x] **Phase 0 spike page** at `#/spike`: all 10 Appendix-D tests with
      pass/fail/notes, per-context localStorage persistence, JSON export.
      Test assets generated (6 beeps, 30 imgs, 100 clips) via
      `pnpm --filter player gen-assets`
- [x] **`tools/pipeline` CLI** (`pnpm pipeline <cmd>`):
      `pdf2img` ✅ *verified on the real scan — 32 pages → content/photos/scan/*.jpg*;
      `extract` (Claude vision, Appendix-B prompt, sharp-normalizes to
      ≤1600px jpeg, retries, never overwrites reviewed files) — *code done,
      awaiting ANTHROPIC_API_KEY*;
      `enrich` (deterministic listenPick/cloze/sentenceBuilder/spellingTiles/
      matchPairs per §6.5); `tts` (Piper provider + sha1 cache, needs
      PIPER_BIN/PIPER_VOICE); `pack` (validated LessonPack + compressed page
      images + audio copy + content hash)
- [x] **Agent-side extraction DONE** (no API key needed): all 32 scan pages
      extracted → `content/work/scan/pNNN.raw.json`, **all pass strict
      PageExtractSchema validation**. Totals: ~55 vocab (incl. 34
      high-frequency words on p008, 7 anchor-text words on p012, 5 academic
      on p007), ~270 sentences, ~18 exercise blocks, ~26 uncertain items
      flagged for review. Book identified: *Our Literacy World* G3 (KSA ed.),
      Unit 1 "Adventures Await" kickoff + anchor text
      "Goodbye, Paris. Hello, Tokyo!"
- [x] **E2E pipeline smoke test PASSED**: 8 pages provisionally approved
      (p007/8/12/14/16/18/30/31 — provisional, review tool will do the real
      pass) → `enrich` generated 185 exercises → 40 approved for demo →
      `pack` produced a valid pack at
      `content/packs/english-g3-scan/` (47 vocab, 65 sentences,
      40 exercises, 8 compressed page images, hash 8f00ada2d32b0c35).
      Audio refs are TODO placeholders pending TTS.
- [x] **Piper TTS installed & WORKING**: `tools/tts/piper/` (git-ignored,
      re-downloadable) — `piper.exe` (rhasspy release 2023.11.14-2) +
      voice **en_US-amy-medium** (warm US female, kid-appropriate).
      `.env` has PIPER_BIN/PIPER_VOICE. `pipeline tts scan` generated
      **234 real clips** (normal+slow); repacked — pack hash now
      d1fedd341fecae99 with 234 audio files.
- [x] **Chapter 1 PACK BUILT** (first real pack): `lesson1.pdf` → 30 pages →
      all extracted (all schema-valid, 18 vocab, 282 sentences, 46 uncertain
      flags — mostly student handwriting + photo-cropped edges) → all pages
      provisionally approved → `enrich` made 414 exercises (all provisionally
      approved) → `tts` made 566 clips → `pack english-g3-ch01` validated:
      12 vocab / 282 sentences / 414 exercises / 30 page images, 113 MB.
      Book content note: it's a US reading textbook — Lesson 1 is
      historical fiction "First Day of School" (Gold Rush twins), NOT the
      to-be/plurals ESL content the plan guessed. Pipeline doesn't care.
      Audio since transcoded to m4a (see below) — pack ~33 MB.
- [x] **Player MVP playable** (Phase 2 core): routes `#/` home (goal ring,
      streak, Play), `#/session` (Leitner session: flashcard exposure →
      exercises → star/confetti end), `#/read` (page carousel + tap-sentence/
      word-to-hear), `#/spike` kept. Packs served from `public/packs/` via
      `pnpm sync-packs`; runtime CacheFirst SW caching for pack assets.
      Remaining Phase-2 gaps: boss rounds, stickers, chapter map, parent area
      (Phase 3 anyway).
- [x] **Exercise variety + interactive feedback** (2026-10-30 eve): sessions
      were effectively one-type — `pickExercise` always matched listenPick
      first for box≤2 items. Builder now rotates across **9 playable types**
      (listenPick incl. picture-option variant, cloze, sentenceBuilder,
      spellingTiles, dictation, matchPairs, trueFalse "same/different",
      oddOneOut "which word did you NOT hear", minimalPair e.g. pan/panned),
      never repeats the last two types, synthesizes missing types from vocab,
      and adds a 2-exercise bonus round from the pack's 345 unreferenced
      exercises (prefer distinct types). New components: SpellingTiles
      (shared by dictation), MatchPairs (🔊→word), TrueFalse, OddOneOut,
      MinimalPair. SessionPage uses a type→component map. Feedback:
      synthesized WebAudio SFX (`sfx` in audio.ts — tap/correct/tryAgain/
      flip/star, no assets), `playClips` sequencer, mini-confetti burst on
      every correct answer (`celebrate.ts`), spring/stagger entrances,
      tile pop-in, answer-strip wobble, star chimes on EndScreen. SSR smoke
      test rendered all 12 cases OK; buildSession output verified
      multi-type against the real ch01 pack.
- [x] **Mac migration + Capacitor iOS app** (2026-10-30): repo moved to Mac
      (`~/Desktop/projects/bido-english--book`) — packs/audio/node_modules all
      transferred intact (pnpm resolved darwin-arm64 native bins on install).
      ⚠️ `english-learning-app-plan-v2.md` had been deleted in the move —
      restored via `git restore`. `.env` + `tools/tts/piper` did NOT transfer
      (only needed for pipeline work, not the player). Added
      `@capacitor/{core,ios,cli}` 8.6 + `capacitor.config.ts` (appId
      `com.pagebuddy.player`, webDir `dist`) + `npx cap add ios` (SPM-based,
      no CocoaPods). Scripts: `pnpm --filter player ios:sync` (build+sync),
      `ios:open` (Xcode). **Verified:** `xcodebuild` Debug→iPad (10th gen)
      simulator succeeded; installed + launched `com.pagebuddy.player` —
      Home renders real ch01 pack (title/mascot/Play/goal ring). Bundle is
      ~37 MB web assets after the m4a transcode. NOTE: `xcodebuild` needs
      `-destination 'platform=iOS Simulator,id=953032F3-…'` — the bare name
      failed because that sim is iOS 17.5 (not "latest").
- [x] **Audio transcoded WAV→AAC/M4A** (2026-10-30 late): `afconvert` all
      800 clips — ch01 566 (106 MB→22 MB), scan 234 (27 MB→6.6 MB); WAV
      originals kept in `content/work/*/audio_src/`. `audio.manifest.json`
      refs rewritten to `.m4a`; `tools/pipeline/src/pack.ts` now accepts
      `.wav|.mp3|.m4a`; `sync-packs.mjs` cleans destination pack dirs before
      copying (stale files can no longer linger). Player `public/packs` now
      ~37 MB (was ~175 MB). All 812 pack audio refs verified on disk.
- [x] **Extraction review pass** (2026-10-30 late): triaged all 46 ch01 +
      26 scan `uncertain` flags — ~31 were student handwriting (correctly
      excluded); every edge-clip inference verified correct against the
      page photos (west/the/did, many/eat/they, for/while, accept, could/
      herself, Je m'appelle/Watashi wa…); benign flags (cropped page
      numbers, sticky note, store signs) confirmed harmless. One real fix:
      `Mr. Carter. asked.` → `Mr. Carter asked.` (audio manifest key +
      reviewed.json + repack, hash c6661c1eb360f871).
- [x] **Parent area v0** at `#/parent` (2026-10-30 late): arithmetic gate
      (6–10 + 5–10, regenerates on miss), dashboard — 4-stat row
      (streak/minutes/stars/accuracy), 7-day minutes bar chart, top-10
      trickiest words by per-item accuracy (≥2 attempts, joined to pack
      labels), storage-persistence status, and progress
      export/import (`ProgressExportSchema` + `attempts` array; export
      downloads a dated JSON, import validates with zod + bulkPuts).
- [x] **Speak mode (record-compare)** at `#/speak` (2026-10-30 late):
      Tier-2 plan §7.7 flow — due-then-new list of vocab + short sentences
      (≤9 words), per item: 🔊 model / 🐢 slow → 🔴 record
      (getUserMedia+MediaRecorder, `audio/mp4` mime preferred for iOS) →
      👂 hear me → self-rate 😃/🔁 (recorded as `speakCompare` attempts →
      Leitner). Graceful card when MediaRecorder unsupported. NOT yet
      verified on a real mic — sim has no audio input.
- [x] **Cloze spoiler fix** (2026-10-30, his feedback): "Hear it" played the
      full sentence WITH the missing word — too easy. Now: no answer audio
      upfront, per-option 🔊 plays the candidate WORD's clip (vocab audio
      only), optional "💡 hint: hear the sentence" button, and the sentence
      auto-plays AFTER a wrong pick (kind-failure = hear the answer then,
      not before).
- [x] **Journey + rewards layer** (2026-10-30): `#/map` chapter path —
      node per pack with new/in-progress/mastered states (box≥4 share),
      mascot floats at current node, tapping a node sets it active
      (doubles as pack picker). `#/rewards` sticker shelf — 9 milestones
      (first session, streaks, stars, items, retries, speak, boss clear)
      using the ComfyUI sticker art. `#/boss` round — weakness-ranked
      (lapses→low box→stale) items at +1 difficulty tier, 15 steps, no
      flashcards; clears counted in settings. Streak freeze: `streak()`
      tolerates one single-day gap per chain (plan §7.4 "one freeze").
- [x] **Capacitor fetch fix** (2026-10-30): `fetch` on `capacitor://`
      returns status **0** for valid files — `playClip`/`pack.ts` checked
      `.ok` → audio reported ERROR:0 on device. Now validates
      `byteLength`/zod-parse instead. Spike T2 then passed on hardware.
- [x] **ARABIC TRACK — pilot pack playable end-to-end** (2026-10-31):
      plan `arabic-book/mvp-plan-arabic.md`. Book = Saudi MoE G3 Arabic
      lang. part 1 (1448 ed., 170 pp) → `pdf2img` done
      (`content/photos/ar/p001–p170.jpg`). Pages 1–12 skipped per user
      (front matter). **Schema**: `PackLang`, `detectLang`, Arabic-aware
      `normWord`/`wordList`/`lettersOf` (tashkeel stripped for compare,
      letter+harakat grapheme tiles), pack `language`/`dir` fields.
      **Pipeline**: `enrich.ts` language-aware (literal cloze replace —
      `\b` doesn't work on Arabic — Arabic distractors, grapheme tiles);
      `pack.ts` hash-slug fallback for non-Latin ids + auto `detectLang`;
      `tts.ts` `edgetts` provider (`edge-tts` Py exe on PATH, voice
      `ar-SA-ZariyahNeural`, slow = `--rate=-25%`, mp3 out); CLI flags
      `tts --provider`, `pack --lang`. **Player**: `dir`/`lang` set on
      `documentElement` at pack load; `strings.ts` EN+AR kid chrome;
      `Cloze`/`Flashcard`/`EndScreen`/`HomePage`/`builder.ts` take lang;
      Arabic font stack + RTL CSS in index.css. **Pilot E2E PASSED**:
      extract p013–p022 (10 pp, all schema-valid) → provisional approve →
      enrich 52 exercises (verified grapheme tiles كَ رِ ي مٌ + ب/ت/ث
      distractors) → tts edgetts 62 clips → **pack `arabic-g3-s1-pilot`**
      (16 vocab, 11 sent, 52 ex, language:ar dir:rtl, 1.6 MB mp3) →
      synced → serves 200 → typecheck + prod build clean (168 precache,
      6.4 MB). Unit 1 = «التعامل مع الآخرين»; reading lesson «عادل في
      الطائرة» starts p022 — pilot vocab came mostly from p015's
      12-adjective bank + p021's song glossary. Second batch p023–p034
      extracted same session (needs validate → approve → chain re-run).
      Voice-studio OmniVoice parked (needs ref clip; Edge voice is good).
      NOT yet RTL-verified visually on device/iPad — next session's first
      check.
- [x] **TWO-WORLD SPLIT — en/ar feel like separate apps** (2026-10-31):
      (a) DB v2 migration — `review` PK `[packId+itemId]` (was: `s_001`
      collided across packs!), `attempts` +`packId`/`lang`, `daily` PK
      `[date+lang]`; all pre-v2 rows default `lang:"en"`. (b) `progress.ts`
      — `recordAttempt/finishSession/todayStats/streak/langDailies` take
      lang. (c) `packs/index.json` now carries `meta:[{id,title,language,
      dir}]` (sync-packs.mjs) → `listPackMeta`, `settings.activeLang`,
      `store.switchLang`. (d) `LangGate` `#/lang` — two big world cards
      (English coral / العربية mint, RTL card), shown on first run when
      >1 language; Home `🌐` chip switches anytime. (e) Home/Map/Rewards/
      Parent/Session/Speak all scoped to active lang (stars, streak, pet,
      stickers incl. per-lang `bossClears:lang`); Parent export stays
      global. (f) `App` HomeOrGate — ⚠️ was a blank-page bug: gate awaited
      a Dexie call that blocks during upgrade when another tab is open;
      now 1.2s timeout + splash fallback.
- [x] **SpellingTiles Arabic fix** (2026-10-31): component was English-
      hardcoded (`/[^a-z']/g` → `need=0`, dead tiles). Now grapheme-unit
      answer array via `lettersOf`, `normWord` compare, `t()` strings.
- [x] **TraceWrite exercise** (new type `trace`, 2026-10-31): finger-
      tracing writing practice — canvas dotted-outline guide word +
      ink layer + hidden glyph mask measures coverage (≥55% + ≥1 stroke
      → solve). Language-agnostic (Arabic shaping/harakat free), RTL ok.
      Wired: schema enum, `synthTrace` in builder (box≤2 rotation),
      SessionPage map, strings (تتبَّع الكلمة / امشِ على النقاط / امسح),
      `.trace-*` CSS. Note: tolerant — no wrong answers, no off-line
      penalty (kind UX); scribble-coverage isn't graded.
- [x] **Arabic vocab art + app icon** (ComfyUI, 2026-10-31): 10 flat-
      vector images for the illustratable pilot words (كريم، متعاون،
      صادق، رحيم، مهذب، أمين، المضيف، يطالع، ضجيجًا، لإقلاع) →
      `public/art/ar-*.png` + copied into ar pack `images/art/` and
      patched onto `v.image` (Flashcard + picturePick render them).
      Negative/abstract words intentionally unillustrated. `icon-art.png`
      (fox face) → icon-192/512/maskable/apple-touch-icon. gen-art.mjs
      gained `--force` + skip-existing.
- [x] **Arabic extraction batch 2+3 running**: p013–p034 done & packed
      (pilot now 22pp / 22 vocab / 24 sent / 79 ex / 100 Edge clips —
      first TTS run stalled once mid-batch, kill+resume via cache worked).
      Unit 1 = «التعامل مع الآخرين» ends ~p052 (التقويم التجميعي p048–52);
      **Unit 2 «رُبُوعُ مِنْ بِلَادِي»** starts p053, its Lesson 1
      «من معالم بلادي» ~p058. Agents still running for p035–p082.
- [x] **Unit-1 Arabic pack COMPLETE → `arabic-g3-u1`** (2026-10-31 eve):
      pilot renamed/superseded (old `arabic-g3-s1-pilot` deleted). Approved
      all p013–p052 → enrich 111 ex + **bookex 17 comprehension items** →
      tts edgetts **708 clips** → pack: 40 pages / 26 vocab / 47 sent /
      128 ex (17 comprehension, rest deterministic) / all audio resolves /
      23 vocab illustrated. Unit map (extraction confirmed): u1 ends p052,
      u2 «ربوع من بلادي» p053–p092 (L1 الرياض p058+, L2 مصايفنا p072+,
      نموذج اختبار٢ p083+, تقويم٢ p087+), **u3 «أخلاق المسلم» starts p093**
      (not p107 as guessed; L1 التعاون p102+). u4 وسائل الاتصالات later.
- [x] **`bookex` pipeline stage — book's own exercises become playable**
      (2026-10-31 eve): `tools/pipeline/src/bookex.ts` + CLI `bookex
      <section>` → `enriched.bookex.json` (pack.ts already packs every
      `enriched.*.json`). Parses `exercisesOnPage` {instruction,kind,items}
      into `comprehension` exercises: `"stem: a. / b."` → mcq, numbered
      stem+option-items → mcq, bare statements → tf (book's ✓/✗ format =
      TrueFalse). Answers from `work/<section>/comprehension.answers.json`
      (normalized key → option|bool) + GOOD/BAD polarity wordlists for
      unkeyed tf; unanswerable items skipped (never a guessed grade).
      **Answer book obtained**: `arabic-book/answers-unit1.pdf` (52pp
      companion, muealimuk mirror — kottby is Cloudflare-gated) rendered
      to `content/photos/answers-u1/`; keys verified against printed
      checkmarks (caught that «خجل طارق» is ✗ — he'd have been guessed
      true). 16 items emitted for u1 (9 mcq + 7→8 tf), all approved.
      `tts.ts` now voices `cq:`/`cqo:` from ALL `enriched.*.json` (was
      only `enriched.comprehension.json`) + per-clip retry once →
      skip-with-warning (edge-tts NoAudioReceived no longer kills runs;
      manifest only records successful files).
- [x] **Art batch 2 — 28 more ComfyUI images** (2026-10-31 eve): English
      vocab (panned, bolted, washed away, headed, strike), 9 Arabic
      bad-trait vignettes the book teaches as what-NOT-to-be (مبذر طماع
      كذاب غشاش ظالم بخيل مشرفة هدي نمام), 3 more u1 words (معلم ابتدائي
      يعرفوا), `mascot-ar.png` (fox in keffiyeh — Arabic-world variant).
      **`patch-pack-art.mjs`** — repeatable word→art map per pack; repacks
      wipe `v.image` so ALWAYS re-run after `pack`, then `sync-packs`.
      32 vocab images wired total (23 ar + 9 en).
- [x] **Extraction status**: COMPLETE — all p013–p170 on disk and
      schema-valid (see entry below). `ar` work dir now holds unit-1
      reviewed files only (≤p052); later units live in `ar-u2/ar-u3/ar-u4`.
- [x] **Extraction COMPLETE p013–p170** (2026-10-31): all 158 book pages
      on disk in `content/work/ar/*.raw.json`, all PageExtractSchema-valid.
      Unit dirs created: `ar-u2` (p053–092, 40pp), `ar-u3` (p093–132, 40pp),
      `ar-u4` (p133–170, 38pp) — each has `*.reviewed.json` copies +
      `comprehension.answers.json` (answer-book-verified keys); photos
      shared via `content/photos/ar-uN` junctions → `photos/ar`.
      Answer books u2/u3/u4 downloaded to `arabic-book/answers-unitN.pdf`,
      rendered to `content/photos/answers-uN/` for key verification.
- [x] **Units 2–4 enriched + bookex'd**: u2: 73 enrich + 32 bookex
      (answer keys verified against `answers-unit2.pdf` — المصمك،
      التبوك/القصيم/جدة، المصايف fruits/parks, sponge passage);
      u3: 98 enrich + 12 bookex (عمار فوق السحاب test all "ج");
      u4: 204 enrich + 19 bookex (الهاتف المحمول، شجرة الموز story Qs).
      bookex parser fixed twice: nested parens `بِـ(الْ)` option groups,
      quoted-speech `:` inside stems (lastIndexOf colon before ` / `),
      `أ-`-style inline options, trailing `/` artifacts.
- [x] **Include-sheet page selection** (parent picks which pages the
      teacher assigned): `arabic-book/pages-include.xlsx` — one row per
      page (p013–p170), cols: page, folio, unit, lesson, type, preview,
      `included` (all FALSE by default — parent marks TRUE).
      **`tools/pipeline/apply-include.py`** reads it and flips
      `*.reviewed.json` status: TRUE→`approved`, FALSE→`skipped`
      (new `PageStatusSchema` enum value — pack/bookex/enrich all treat
      non-approved as excluded). pack.ts additionally drops enriched
      exercises whose `payload.sourcePage` (stem or folio) belongs to a
      skipped page — verified: p142 skipped → 2 exercises + 1 page drop.
      **Workflow**: parent edits xlsx → `python tools/pipeline/apply-include.py`
      → re-run `enrich`/`bookex`/`tts`/`pack`/`patch-pack-art`/`sync-packs`
      for affected units. Non-destructive: raw/reviewed files never deleted.
- [x] **tts.ts hardening**: 90s execFile timeout on edge-tts calls
      (hung child killed → retry path runs; found when a stalled call
      froze u2 TTS for 20 min).
- [x] **Art batch 3 queued** (11 images): u2 شاهقة/القاحلة/الغناء
      landscapes, u3 شجاع/حياء virtues, u4 هاتف/مستشفى/قمر/فضاء/طقس/
      رسالة-إلكترونية nouns; patch-pack-art.mjs extended for packs
      arabic-g3-u2/u3/u4.
- [x] **Generated art + animations** (2026-10-30): local ComfyUI generated
      9 flat-vector images (`apps/player/scripts/gen-art.mjs` →
      `apps/player/public/art/`): fox mascot (read + wave variants),
      star/chest/rocket reward stickers, and 4 vocab illustrations.
      Vocab art patched into ch01 pack (`images/art/`, `source:"own"`) for
      nugget / pan / steer / "Rise and shine" — provisional mapping, should
      eventually come from the review tool. Mascot + sticker art wired into
      Home / EndScreen; framer-motion added (step slide transitions,
      flashcard spring-in, staggered star pop, mascot idle float, play-btn
      pulse, tactile option/tile press). `MotionConfig reducedMotion="user"`
      + CSS `prefers-reduced-motion` guard. Art precached (`art/*.png`,
      ~1.7 MB). To add more art: extend `JOBS` in gen-art.mjs and re-run
      `pnpm --filter player gen-art` (needs ComfyUI on :8188).

## 4. Next actions (in order)

0. **Arabic track — SELECTION APPLIED, packs rebuilt** (2026-10-31):
   parent marked 36 pages TRUE → apply-include flipped statuses →
   **`arabic-g3-u1`** rebuilt: 19pp (folios 21–29,32–40,42), 14 vocab,
   36 sent, 81 ex, 126 audio refs ✓; **`arabic-g3-u2`** NEW: 17pp
   (folios 53?,61–66,68,70–78), 9 vocab, 32 sent, 81 ex, 134 refs ✓.
   u3/u4 fully skipped (no TRUE marks) — their TTS (330/512 clips) +
   enrich/bookex stay cached for future selections. Verified: 0 missing
   audio/page refs; sync-packs → 4 packs live; prod build clean (208
   precache, ~15 MB). To re-select: edit xlsx → apply-include →
   pack+patch+sync. Remaining:
   (b) **RTL visual check** — eyeball session/reader/tile mirroring/
   TraceWrite canvas (dev :5174 or tunnel);
   (c) cloze `blank` orphan-harakat check; (d) parent review pass —
   approvals provisional; (e) stale-SW blank page → Ctrl+Shift+R;
   (f) matchPairs word↔meaning for u2 column-matching;
   (g) iPad deploy needs Mac (Xcode) or tunnel+PWA.
1. ~~Deploy to the physical iPad~~ ✅ Done 2026-10-30 — headless pipeline:
   `pnpm --filter player ios:sync` → `xcodebuild -scheme App
   -destination 'id=00008030-001E6DAE0A30C02E' -allowProvisioningUpdates
   build` → `xcrun devicectl device install app --device <UDID>
   <DerivedData>/…/App.app` (find real path via `-showBuildSettings |
   grep BUILT_PRODUCTS_DIR`). Free cert = 7 days, re-run to refresh.
   Spike tests run in-app; T2 exposed + fixed a real status-0 fetch bug.
2. **Play-test with him** — `#/session` variety + `#/speak` (started:
   his feedback already fixed the cloze spoiler). Watch per §15 rules
   (10 min, no coaching) → closes the Phase-2 gate.
3. **Audition the Amy voice** — play clips in `content/packs/*/audio/`
   (`.m4a`); to swap voices see §5 note.
4. **Parent spot-check** of extracted content — the agent pass cleared all
   72 uncertain flags (1 fix applied), but plan §13 wants parent eyes on AI
   content before it counts as approved.
5. **Photograph more book pages** → digitize next chapters (Phase 4/5's
   real scaling work; `#/map` already acts as the pack picker).
6. Optional: review tool (`tools/review`, §6.4) for future chapters.
7. UI pass done 2026-10-30: fixed white-text-on-light-buttons (global
   `button{color:#fff}`), home nav → touch rows, `← home` pills, mascot
   anchored on map bubble, session cards fill viewport. Verified via sim
   screenshots — NOTE: screenshot on a fresh port, stale SW serves the
   old bundle on :4173.
8. **Candy-kid redesign done 2026-10-30** (style ref: kids' phonics app
   shots from user): chunky 3D cards/buttons, candy palette, Home → hub
   (stat pills, coral vocab-chip banner with tappable word audio, mode
   card grid, 🥚→🐣→fox pet card by total stars), Map → colored circle
   nodes zigzag with captions below, Session chrome → mascot rides the
   progress bar + ✕ quit pill, exercise cards get coral chunk border.
   Deployed to iPad via headless pipeline.

## 5. Environment & tooling

| Thing | State |
|-------|-------|
| Dev machine | **Mac now primary** — repo at `~/Desktop/projects/bido-english--book`, node v22.19.0, pnpm 10.13.1, Xcode 27.1 (Capacitor 8.6, iPad sim verified). Windows copy at `D:\projects\bido-english--book` still has Piper TTS + ComfyUI + `.env` — pipeline stays there unless ported |
| Mac | ✅ Active dev machine (Xcode 27.1, iPad 10th-gen simulator works). iPad needs Developer Mode + Personal Team signing for device deploy |
| Node/pnpm | ✅ Mac: node v22.19.0, pnpm 10.13.1 — `pnpm install` + `pnpm --filter player build` verified |
| `ANTHROPIC_API_KEY` | ⬜ Not set — **workaround in use:** agent-side extraction (Devin/subagents read page images and write `*.raw.json` directly, same PageExtractSchema). Set the key later to automate via `pipeline extract`. |
| TTS provider | ✅ Piper LOCAL, voice `en_US-amy-medium` (female US). To change: drop another voice .onnx + .onnx.json from rhasspy/piper-voices into `tools/tts/piper/`, update `PIPER_VOICE` in `.env`, delete `content/work/*/audio/` to regenerate |
| iPad testing | **Capacitor app (primary):** `pnpm --filter player ios:sync` then Xcode Run. Windows fallback: `cloudflared` quick tunnel → `http://localhost:5173` (ephemeral URL; Vite allows `.trycloudflare.com` hosts). Safari Web Inspector still useful via cable (Develop menu) |
| Image generation | Local ComfyUI, see §7 |

## 6. Phase 0 spike results

Run **inside the Capacitor app** on the physical iPad 9th gen (iPadOS
26.4.1), 2026-10-30. Context UA shows "Macintosh" because WKWebView on
iPadOS reports the desktop-site UA — verified it was the app.

| # | Result | Notes |
|---|--------|-------|
| 1 Install/launch | ✅ | Capacitor app installed via devicectl |
| 2 Audio taps | ⚠️→fixed | `fetch` to `capacitor://` returned status 0 for valid files — `playClip`/pack loader checked `.ok`. Fixed: validate `byteLength`/zod-parse instead of `.ok`; retest pending |
| 3 Voices | ✅ | 68 voices, 25 English, Samantha default (informational — D2 uses pre-gen audio anyway) |
| 4 Mic record+play | ✅ | `getUserMedia`+`MediaRecorder` → `audio/mp4` clip — speak mode viable |
| 5 Speech recog | ❌ | `service-not-allowed` — expected; D3 says no ASR in MVP anyway |
| 6 IDB persistence | ⚠️ | IndexedDB read/write + survives relaunch; `persist()` not granted in WKWebView (normal — data persists in practice) |
| 7 SW offline | n/a | No serviceWorker on `capacitor://` by design — the app bundle IS the offline mechanism (airplane-mode relaunch still worth a manual sanity check) |
| 8 Drag tiles | ✅ | |
| 9 Rotate mid-drag/audio | ✅ | |
| 10 Memory load | ✅ | 30 imgs + 100 clips, 311 ms decode, 3.5 MB — no stutter |

**Decision:** Capacitor confirmed as deploy vehicle (PWA stays source of
truth). Speech scoring: stays deferred (T5 fails + D3). Remaining re-check:
T2 on the fixed build.

## 7. Local ComfyUI (for vocab art, mascot, stickers)

- Path `D:\projects\youtube-channel\ComfyUI`; start via `start-comfyui.bat`
  (RTX 3060 6 GB → `--lowvram --use-sage-attention`, port 8188).
- Image gen: `unet/flux1-schnell-Q4_K_S.gguf` (4-step). Style LoRAs:
  `loras/Flat vector shapes_*.safetensors` (kid-book flat illustration —
  try first), `loras/d00dlet00n_Flux_v2_renderartist.safetensors` (doodle).
- Edit: `unet/flux1-kontext-dev-Q4_K_S.gguf`. Upscale: `RealESRGAN_x4plus`.
- Output → `ComfyUI\output\`; compress to ~100–200 KB before packing.
- Tag generated art `imageSource: "own"` in the pack schema.
- Private packs may use cropped book illustrations instead (better match
  to class); generated art covers gaps/mascot/shareable versions.

## 8. Decisions log

| Date | Decision | Why / revisit |
|------|----------|----------------|
| 2026-10 | D1–D7 adopted (PWA-first, pre-gen audio, build-time AI only, no ASR in MVP, lesson packs, local-only data, monorepo+shared zod schema) | Plan §3; revisit per triggers listed there |
| 2026-10-30 | ComfyUI designated for image generation | Local, free, `imageSource:"own"`; see §7 |
| 2026-10-30 | **Capacitor adopted for iPad deploy** (option b from the continuation note) — wraps `dist/`, appId `com.pagebuddy.player`, Capacitor 8.6/SPM | Cleanest path vs. HTTPS+self-signed or ephemeral tunnels; PWA stays source of truth, `cap sync` re-bundles after each build |

## 9. Open questions / blockers

- Chapter 1 pack `english-g3-ch01` — content verified against photos
  (agent pass, 1 fix applied); approvals still PROVISIONAL in spirit —
  parent spot-check remains on the list.
- Pack size solved: ~37 MB in the player bundle after m4a transcode.
- `#/speak` + spike test #4 share the same open question: MediaRecorder/
  getUserMedia on iPadOS WKWebView is untested — physical iPad run will
  answer both at once.
- `ANTHROPIC_API_KEY` not set — **not blocking** (agent extraction worked).
  Set it eventually for unattended extraction of the remaining pages.
- TTS voice: Amy (female US) installed; **audition quality with the
  child/parent** — swap via other Piper voices or a cloud provider later.
- Review tool (`tools/review`) not built yet — manual review worked for
  ch01; build it when starting the next chapter.
- Howler.js vs raw Web Audio: player currently uses raw WebAudio
  (`src/audio.ts`); revisit if spike shows issues.

## 10. Rules for whoever continues

1. Update this file at the end of every session: tick boxes, fill spike
   results, log decisions, refresh "Next actions".
2. Never commit `content/` (book photos, extracted JSON, packs) to a public
   repo — the book is copyrighted (plan §12).
3. All AI-extracted/generated content needs parent approval before the child
   sees it (`provenance` field; `approved` on exercises).
4. Follow the child-UX + iPad-PWA rules in the skill file — they exist
   because they've bitten before.
5. Don't skip phase gates; one chapter at a time.

## 2026-10-30 (2) — comprehension questions + parent talk prompts

- New exercise type `comprehension` (plan §6.5 last row — was the only
  unimplemented generation rule). 24 questions for ch01 (16 mcq + 8
  true/false), agent-audited against the extracted passages, all
  `approved:true` pending parent spot-check — same standard as the 414
  existing exercises. Source file: `content/work/ch01/enriched.comprehension.json`.
- Pipeline: `pnpm pipeline comprehend <section>` (new LLM stage, needs
  ANTHROPIC_API_KEY — not set on the Mac yet; ch01's questions were
  authored by hand in the same format). `tts` now emits cq:/cqo: clips
  when piper is configured (not installed on the Mac — player falls back
  to speechSynthesis for question/option audio; passage lines reuse the
  existing sent:* Amy clips).
- Player: `Comprehension.tsx` — passage + "hear the story" + question +
  per-option 🔊; wrong pick replays the story (answer lives in the
  text — replay is the scaffold, not a spoiler). `speak()` helper added
  to audio.ts (speechSynthesis fallback, cancelled by stopAll()).
- Session builder: comprehension floats to the front of the loose pool →
  exactly 1 story question per session (verified: 5/5 built sessions).
- Parent area: "💬 Ask him tonight" card — 2 random pack questions with
  answers for dinner-table book talk.
- Pack english-g3-ch01 v3: 438 exercises. Deployed to iPad.

### Audio + spelling fixes (2026-10-30 eve)

- Global one-voice rule in audio.ts: playClip/playClips stop whatever is
  playing first (no more overlapping sounds across questions); stopAll
  covers scheduled playClips sources + speechSynthesis.
- SpellingTiles reworked: unique letter bank (re-tappable for double
  letters), ⌫ backspace, tap placed letter to remove.
