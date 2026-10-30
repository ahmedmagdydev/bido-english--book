# PageBuddy — Progress & Handoff

> Living document. Any developer or AI model can pick this project up from
> here. **Update it before ending every work session.**
>
> **Last updated:** 2026-10-30
> **Current phase:** Phase 2 MVP playable · Phase 0 ready to run on iPad
>
> **Continuation note:** work continues on a **Mac** next — goal is running
> the app on the iPad without the Cloudflare tunnel. Options per plan D1:
> (a) `vite preview`/`pnpm dev` over local network still needs HTTPS for
> SW/mic → (b) Capacitor wrapper (`@capacitor/core` + `ios` platform, Xcode
> deploy to iPad — free signing lasts 7 days, Developer Mode needed) or
> (c) a tiny static HTTPS host with a self-signed cert trusted on the iPad.
> Capacitor is the cleanest path to a real installed app; keep the PWA as
> the source of truth either way.

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
| 0 | Device spike on the real iPad | 🟡 Spike page built (`#/spike`), needs on-device run | Written works/doesn't-work list (plan App. D) settling speech-recognition + Capacitor questions |
| 1 | Pipeline for Chapter 1 | 🟢 Pack `english-g3-ch01` built & valid (all approvals provisional — real review pending); review tool not started | Ch1 = validated pack, zero known extraction errors |
| 2 | MVP player | 🟢 **Playable against real pack**: pack loader (zod-validated), Leitner session builder (due+new items, box→exercise ladder, kind-failure re-queue at half credit), flashcards, listen-pick, cloze, sentence-builder, stars+streak+goal ring, confetti end screen, tap-to-hear reader. Dexie progress + attempts recorded. Spike page retained at `#/spike` | He completes a 10-min session unprompted and asks for more |
| 3 | Depth (all exercise types, record-compare, parent dashboard) | ⬜ Not started | Dashboard lists his 10 hardest words accurately |
| 4 | Scale to remaining chapters | ⬜ Not started | Whole book playable; pipeline is one command per chapter |
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
      ⚠️ 113 MB is heavy (uncompressed WAV) — transcode to m4a/mp3 later
      (needs ffmpeg) or accept WAV for MVP.
- [x] **Player MVP playable** (Phase 2 core): routes `#/` home (goal ring,
      streak, Play), `#/session` (Leitner session: flashcard exposure →
      exercises → star/confetti end), `#/read` (page carousel + tap-sentence/
      word-to-hear), `#/spike` kept. Packs served from `public/packs/` via
      `pnpm sync-packs`; runtime CacheFirst SW caching for pack assets.
      Remaining Phase-2 gaps: matchPairs/spellingTiles/oddOneOut/minimalPair
      components (sessions currently play 3 types), boss rounds, stickers,
      chapter map, parent area (Phase 3 anyway).
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

1. **Phase 0 on the iPad**: open the tunnel URL `…trycloudflare.com/#/spike`
   in Safari → run 10 tests → Share → Add to Home Screen → run again →
   export both result JSONs into §6 below. Debug via Mac: iPad
   Settings→Safari→Advanced→Web Inspector, cable to Mac, Develop menu.
2. **Review the 32 extracted pages** — approvals so far are provisional
   (smoke test). Review tool is the proper way; or eyeball
   `content/work/scan/*.raw.json` `uncertain` lists (~26 items).
   Then re-run `enrich` + `pack`.
3. **Play-test with him** — run the Phase 0 spike first (iPad + tunnel URL),
   then let him try `#/session`. Watch per §15 rules (10 min, no coaching).
4. **Audition the Amy voice** — play clips in `content/packs/*/audio/`;
   to swap voices see §5 note. Optionally transcode WAV→m4a (113 MB pack
   is heavy for the iPad).
5. Remaining exercise components (matchPairs, spellingTiles, oddOneOut,
   minimalPair) + review tool (`tools/review`, §6.4).

## 5. Environment & tooling

| Thing | State |
|-------|-------|
| Dev machine | Windows PC (this repo at `D:\projects\bido-english--book`) |
| Mac | ✅ Available (with Xcode); iPad can have Developer Mode + Web Inspector on — use for PWA debugging via cable + optional Capacitor later |
| Node/pnpm | ✅ node v22.23.2, pnpm 10.15.1 — `pnpm install` done, all typechecks pass |
| `ANTHROPIC_API_KEY` | ⬜ Not set — **workaround in use:** agent-side extraction (Devin/subagents read page images and write `*.raw.json` directly, same PageExtractSchema). Set the key later to automate via `pipeline extract`. |
| TTS provider | ✅ Piper LOCAL, voice `en_US-amy-medium` (female US). To change: drop another voice .onnx + .onnx.json from rhasspy/piper-voices into `tools/tts/piper/`, update `PIPER_VOICE` in `.env`, delete `content/work/*/audio/` to regenerate |
| iPad testing | ✅ `cloudflared` installed (winget). Run: `"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173` — quick-tunnel URL is ephemeral (new each run). Vite allows `.trycloudflare.com` hosts. |
| Image generation | Local ComfyUI, see §7 |

## 6. Phase 0 spike results

*Fill in after running plan Appendix D on the iPad. Columns: test # |
Safari tab | Home Screen app | notes.*

| # | Safari tab | Home Screen | Notes |
|---|-----------|-------------|-------|
| 1–10 | — | — | Not run yet |

**Decision:** PWA path confirmed? ⬜ Speech scoring viable early? ⬜

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

## 9. Open questions / blockers

- Chapter 1 pack `english-g3-ch01` built (566 audio clips, 414 exercises) —
  all approvals are PROVISIONAL; 46 uncertain items need a parent pass.
- Pack size 113 MB (uncompressed WAV) — consider ffmpeg→m4a (~10× smaller)
  before the iPad downloads packs.
- `ANTHROPIC_API_KEY` not set — **not blocking** (agent extraction worked).
  Set it eventually for unattended extraction of the remaining pages.
- TTS voice: Amy (female US) installed; **audition quality with the
  child/parent** — swap via other Piper voices or a cloud provider later.
- Review tool (`tools/review`) not built yet — needed to approve extracted
  content before packing.
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
