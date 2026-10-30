---
name: pagebuddy
description: >
  PageBuddy — an interactive English-learning PWA for the user's son (age 8,
  Grade 3, iPad 9th gen), built from his school book "English" by Ahmed Magdy.
  Use whenever working on this repo's PWA player, the content pipeline
  (book photos -> extracted JSON -> lesson packs -> TTS audio), the review
  tool, or when resuming/continuing PageBuddy work. Triggers include
  "PageBuddy", "the English app", "lesson pack", "pipeline", "extraction",
  "review tool", "Phase 0 spike", "flashcards", "Leitner", and any request
  to continue from PROGRESS.md.
---

# PageBuddy — Project Context & Working Rules

## What this is

A private, offline-first PWA that turns pages of a school English book into
short game-like lessons for an 8-year-old on an iPad 9th gen (A13, iPadOS 26).
All AI runs at **build time on the dev's Windows PC** — never on the iPad.
Content ships as **lesson packs** (JSON + images + audio) separate from the
player engine.

## Authoritative documents — read before doing real work

1. **The full plan** (612 lines, the source of truth for every decision,
   schema, prompt template, spike checklist):
   `pyhsical-book/english-learning-app-plan-v2.md`
2. **Progress / handoff state** (current phase, done items, next actions,
   blockers — MUST be read on session start and updated before ending):
   `PROGRESS.md` (repo root)
3. Book scans live in `pyhsical-book/` (e.g. `Scan_20261030_163113.pdf`).

Always reconcile PROGRESS.md against the actual filesystem — the files win
if they disagree.

## Non-negotiable decisions (D1–D7 from the plan)

- **D1 PWA first**: React + Vite + TypeScript, `vite-plugin-pwa`. No native
  SwiftUI. Capacitor is only a fallback wrapper if a web limitation blocks
  a must-have.
- **D2 Pre-generated audio** for every word/sentence (normal + slow speed).
  Do not rely on iPad speech synthesis voices.
- **D3 AI only in the build-time pipeline** (Claude vision for extraction,
  LLM for comprehension questions). No API keys on the device. Generated
  content is marked `source: "generated"` and requires parent approval.
- **D4 No speech recognition in MVP** — unreliable in Safari/Home-Screen
  mode. Speaking = minimal-pair listening + record-and-compare first.
- **D5 Lesson packs** separate from the player; player knows nothing about
  this specific book.
- **D6 Local-only data**: Dexie/IndexedDB + Cache Storage; progress
  export/import as JSON. No accounts, ads, tracking.
- **D7 Monorepo** (pnpm workspaces) with one shared zod schema validating
  both pipeline output and player input.

## Child-UX rules (violating these is a bug)

- Sessions 8–12 min, targets ≥60×60 px, English + icons + audio only
  (Arabic hints optional, off by default, audio + RTL when enabled).
- Kind failure: show correct answer, play audio, re-queue item for a
  half-credit second chance. No timers, buzzers, red crosses.
- Every activity wrapped in game mechanics (stars, streak with 1 freeze/week,
  chapter path, boss round). Exercise difficulty follows Leitner box
  (intervals `[0,1,3,7,14,30]` days, gentle demotion -2 on miss).
- Session builder: all due reviews + 3–5 new items, end on an easy win.

## iPad PWA traps (plan §7.5 — these bite web devs)

- First audio MUST play inside a user tap (audio unlock); reuse context.
- `touch-action: manipulation`, no text selection/long-press callouts on
  game elements, block pinch-zoom, handle safe areas (`viewport-fit=cover`).
- No HTML5 drag-and-drop — use pointer events or @dnd-kit.
- Use on-screen letter tiles instead of the keyboard where possible.
- `navigator.storage.persist()` on first run; Home Screen install is
  required for durable storage (7-day cap risk in regular tabs).
- 3 GB RAM: lazy-load packs/audio, images ~100–200 KB, no heavy WebGL/ML.

## Development workflow notes

- Dev on Windows (`vite dev`), test on real iPad over **HTTPS** — use a
  tunnel (Cloudflare Tunnel) or host previews; plain LAN dev servers are not
  secure contexts so service workers/mic won't work.
- Playwright WebKit on Windows approximates Safari (not identical).
- `eruda` on-page console for early iPad debugging (Web Inspector needs Mac).
- Pipeline stages: capture -> extract (Claude vision, schema in plan
  Appendix B) -> review -> enrich -> tts (hash-cached) -> pack (zod-validated).
- Target CLI (plan Appendix A): `pnpm pipeline extract|enrich|tts|pack ch01`,
  `pnpm review`, `pnpm --filter player dev`.
- Keep `content/` (book photos, packs) OUT of any public repo — copyright.

## Roadmap & phase gates (do not skip gates)

- **Phase 0** Device spike (1 evening): throwaway test page on the real iPad,
  Safari tab + Home Screen install, 10-item checklist in plan Appendix D.
  Done when: written works/doesn't-work list settling D4 + Capacitor question.
- **Phase 1** Pipeline for Chapter 1: monorepo, schema, photos, extraction,
  review tool. Done when: Chapter 1 = validated pack, zero known errors.
- **Phase 2** MVP player: PWA shell, pack loader, Dexie, audio unlock,
  reader, flashcards+Leitner, 3 games (listen-pick, cloze, sentence builder),
  stars/streak/goal ring. Done when: he finishes a 10-min session unprompted.
- **Phase 3** Depth: remaining exercise types, record-compare, parent
  dashboard/PIN/export. Done when: dashboard lists his 10 hardest words.
- **Phase 4** Scale: remaining chapters, comprehension Qs, polish.
- **Phase 5** Optional: speech scoring, pack picker, sharing (ONLY after the
  copyright gate in plan §12 — ask author/publisher or share engine only).

## Local image generation (ComfyUI)

When the project needs artwork — vocabulary illustrations
(`imageSource: "own"` in the pack schema), mascot, stickers, reward art —
use the local ComfyUI install instead of book crops or external services:

- Install: `D:\projects\youtube-channel\ComfyUI` (git checkout + `.venv`)
- Start: `start-comfyui.bat` → `main.py --lowvram --use-sage-attention --port 8188`
  (tuned for RTX 3060 6 GB; keep `--lowvram`)
- API/web UI: `http://127.0.0.1:8188` (POST `/prompt` queues a workflow)
- Usable models present: FLUX.1 schnell (`unet/flux1-schnell-Q4_K_S.gguf`,
  fast 4-step gen — best default for illustrations), FLUX.1 Kontext
  (`unet/flux1-kontext-dev-Q4_K_S.gguf`, image editing), LTX-Video + Wan2.2
  (video models — single frames possible but prefer FLUX), text encoders
  `clip_l` + `t5xxl_fp8_e4m3fn`, VAE `ae.safetensors`,
  upscaler `upscale_models/RealESRGAN_x4plus.pth`
- Style LoRAs suited to kid-book art: `loras/Flat vector shapes_*.safetensors`
  (flat vector illustration — try first for vocab pictures) and
  `loras/d00dlet00n_Flux_v2_renderartist.safetensors` (doodle/toon)
- Output lands in `D:\projects\youtube-channel\ComfyUI\output\`; compress to
  ~100–200 KB per image (plan §7.5 memory budget) before packing.
- For a *private* pack, cropped book illustrations are still the best match
  for class (plan §6.6); generated art is for gaps, mascot, and any
  shareable version.

## Working conventions

- **Update `PROGRESS.md` before ending any work session**: mark completed
  items, record decisions/blockers, refresh "Next actions". It is the
  handoff contract for other devs/models.
- Respect "done when" criteria; one chapter at a time; fight scope creep.
- Parent reviews ALL AI-extracted/generated content before the child sees it.
- Never commit secrets/API keys; `ANTHROPIC_API_KEY` stays in local env.
- First-week checklist is in plan §14 — follow it if starting fresh.
