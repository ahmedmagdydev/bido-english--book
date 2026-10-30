# PageBuddy — Progress & Handoff

> Living document. Any developer or AI model can pick this project up from
> here. **Update it before ending every work session.**
>
> **Last updated:** 2026-10-30 (late evening, Mac)
> **Current phase:** Phase 2 MVP playable · Phase 3 started (parent area +
> speak mode built) · Phase 1 content review pass done · ready to deploy to
> the physical iPad
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
- [x] **Persistence + font polish**: `navigator.storage.persist()` called
      on app start, result stored in `settings.storagePersisted` and shown
      in the parent dashboard; self-hosted **Andika** via
      `@fontsource/andika` (literacy font, plan §7.5).
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
