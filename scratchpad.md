# Scratchpad

## Current task (2026-10-30, Mac)

Continue PageBuddy per PROGRESS.md continuation note: **get the app running on
the iPad without the Cloudflare tunnel, from the Mac**. Note recommends
Capacitor (cleanest path to real installed app); PWA stays source of truth.

### State reconciled (Mac checkout)

- [x] Repo present at ~/Desktop/projects/bido-english--book
- [x] content/packs/english-g3-ch01 + english-g3-scan transferred (with audio)
- [x] apps/player/public/packs already synced (both packs + index.json)
- [x] node v22.19.0, pnpm 10.13.1, Xcode 27.1
- [ ] .env missing (only needed for TTS/extract — not blocking player)
- [ ] tools/tts/piper missing (Windows exe; only needed to regenerate TTS)
- [x] RESTORED pyhsical-book/english-learning-app-plan-v2.md — was deleted in
      working tree during the transfer (git restore)

### Plan

- [x] pnpm install fresh on macOS — darwin-arm64 native bins already resolved
- [x] pnpm --filter player build — verified (158 precache entries, sw.js)
- [x] Added @capacitor/core @capacitor/cli @capacitor/ios 8.6 to apps/player
- [x] capacitor.config.ts (webDir: dist, appId com.pagebuddy.player)
- [x] npx cap add ios && cap sync ios — SPM based, no CocoaPods needed
- [x] SW registration safe: vite-plugin-pwa's injected register is guarded
      by 'serviceWorker' in navigator → no-op under capacitor:// scheme
- [x] xcodebuild Debug → iPad 10th-gen simulator BUILD SUCCEEDED; installed +
      launched com.pagebuddy.player; screenshot shows Home w/ real ch01 pack
- [x] Added scripts: `pnpm --filter player ios:sync` / `ios:open`
- [x] Updated PROGRESS.md (header, phases, done, next actions, env, decisions)

### User actions needed (cannot automate)

- Plug iPad into Mac, enable Developer Mode (Settings > Privacy & Security,
  device reboots)
- `pnpm --filter player ios:open` → Xcode: App target → Signing &
  Capabilities → Team = Personal Team (free Apple ID) → select iPad → Run.
  Free cert lasts 7 days.
- Then run Phase 0 spike inside the app at #/spike (10 tests, Appendix D)

### Notes

- ios/.gitignore (generated) already excludes App/App/public (174MB bundle)
  and capacitor.config.json — safe to commit the rest of ios/
- Untracked package-lock.json at root = stale npm artifact, ignore/delete
- For device re-deploys after player code changes: `pnpm ios:sync` first

## Session 2 (2026-10-30 eve) — exercise variety + animations

User feedback: "only one test; want more interactive tests and learning ways;
animations more interactive."

- [x] Root cause found: `pickExercise` tried preferredTypes in fixed order →
      always listenPick first for box≤2 → every step was the same type.
      ALSO: pack matchPairs/oddOneOut/etc had NO components → "skip" card.
- [x] Fixed builder: shuffled preferred list w/ last-2-types penalty +
      synth generators (trueFalse/oddOneOut/minimalPair/dictation/matchPairs/
      picturePick) + 2-step bonus from unreferenced pack pool (345 exercises!)
- [x] New components: SpellingTiles(+dictation), MatchPairs(🔊→word),
      TrueFalse(same/different), OddOneOut(NOT-heard), MinimalPair
- [x] Feedback layer: sfx (WebAudio tones, no assets) + playClips +
      popConfetti per correct + spring/stagger/pop/wobble animations +
      EndScreen star chimes
- [x] Verified: typecheck+build OK; buildSession prints varied type mixes;
      esbuild SSR smoke rendered all 12 component cases OK; cap sync +
      xcodebuild reinstall on iPad sim — app relaunched fine

## Lessons

- Plan doc had been deleted during Windows→Mac copy — always `git status`
  against the tree when a repo moves machines.
- PROGRESS.md "files win" rule worked: packs/audio DID transfer even though
  .env and piper did not.
- Exercises reach a session step only via `refs` wiring OR synth fallback —
  345/414 ch01 exercises have refs:[] (book-level cloze/builder) so they feed
  the bonus-round pool, not per-item steps.
- No Simulator.app in this Xcode 27.1 install — sim runs headless; verify via
  `simctl io booted screenshot` or open the Xcode project (DeviceHub/Xcode
  may surface the display). esbuild SSR smoke = cheap headless UI check.
- simctl can't tap; test interactions via vite preview on localhost (secure
  context, same dist build as the Capacitor bundle).

## 2026-10-30 late — "continue the remaining tasks"

- [x] Audio WAV→m4a: `afconvert` 800 clips (ch01 106→22 MB, scan 27→6.6 MB),
      WAV originals → `audio_src/`; manifest refs rewritten; pack.ts accepts
      .wav|.mp3|.m4a; sync-packs now rmSync's dest dir first (was merging,
      leaving stale .wav). public/packs 175→37 MB; 812 refs all resolve.
- [x] Extraction review pass: 72 uncertain flags triaged — 31 handwriting
      (correctly excluded), edge-clip inferences verified vs photos
      (west/the/did, many/eat/they, for/while, accept, could/herself,
      Je m'appelle/Watashi wa), page-number crops benign. ONE real fix:
      p017 "Mr. Carter. asked." → "Mr. Carter asked." — fixed reviewed.json
      + manifest key + repack (hash c6661c1eb360f871).
- [x] Parent area `#/parent`: arithmetic gate → 4-stat dashboard + 7-day
      minutes bars + top-10 trickiest words (attempts ≥2, acc asc, joined
      to pack labels) + export/import (ProgressExportSchema + attempts).
- [x] Speak mode `#/speak`: record-compare — 🔊/🐢 model → 🔴 MediaRecorder
      (audio/mp4 preferred) → 👂 replay → self-rate → speakCompare attempts.
      Graceful fallback card if MediaRecorder missing.
- [x] navigator.storage.persist() → result in settings.storagePersisted
      (shown in parent dashboard). Andika via @fontsource/andika.
- [x] typecheck+build (168 precache, 6.4 MB), cap sync, xcodebuild OK,
      reinstall+relaunch on iPad sim — Home renders Andika + new links.

## Lessons (additions)

- `xcodebuild -destination name="iPad (10th generation)"` FAILS when the sim
  is on iOS 17.5 — `OS:latest` resolves to 18.5. Use `id=953032F3-…` instead.
- Fixing extracted sentence text BREAKS its TTS lookup — manifest keys are
  `sent:<exact text>`; rename the key alongside the text fix before repack.
- `navigator.storage.persist()` needs `.catch(() => {})` — unhandled promise
  rejection on non-supporting browsers if called bare.
- Uncertain-flag triage is fast: ~half were "handwritten X" → skip photo;
  only edge-clip/print-doubt flags needed the photo (47 flags → ~15 reads).
- MediaRecorder mime on iOS: prefer 'audio/mp4', fall back webm — sniff with
  MediaRecorder.isTypeSupported at module level, '' = use default.

## 2026-10-30 — physical iPad deploy + spike run

- Device deploy went headless (Xcode UI kept saying "needs to be unlocked"
  even while unlocked — it was stale; devicectl showed paired+DevMode enabled):
  `xcodebuild -destination 'id=<udid>' -allowProvisioningUpdates build` →
  auto-signs w/ the Xcode-stored Apple ID → `devicectl device install app`.
  First launch needs on-device Trust: Settings→General→VPN & Device Mgmt.
- Spike run in the app (iPad 9th, iPadOS 26.4.1): T4 mic PASS (audio/mp4!),
  T8/9/10 pass, T5 service-not-allowed (expected), T6 IDB works but
  persist() ungranted (normal in WKWebView), T7 n/a (no SW on capacitor://).
- REAL BUG FOUND: `fetch()` on capacitor:// can return status **0** for
  perfectly valid bundled files. Every `.ok` check was a landmine — fixed
  audio.ts (check byteLength) + pack.ts (try json, let zod validate).

## Lessons (additions)

- iPad Safari/WKWebView reports UA "Macintosh; Intel Mac OS X" — don't use
  the UA to tell device contexts; the spike page's display-mode check is
  more reliable (but also reports "safari-tab" inside Capacitor).
- Xcode "needs to be unlocked" dialog can be stale/wrong — trust
  `devicectl device info details` (Pairing State / Developer Mode Status)
  and just run xcodebuild headless.
- Never check `.ok` on bundled-asset fetches when a custom scheme is in
  play — status 0 is legal; empty body is the failure.

## 2026-10-30 — Phase 0 done + Phase 4 journey layer

- [x] App verified on physical iPad (pack loads + audio plays post-fix).
- [x] His feedback: cloze "Hear it" spoils the answer → redesigned: no
      upfront sentence audio, per-option word 🔊, hint button, sentence
      auto-plays after wrong pick (kind-failure). SentenceBuilder stays
      as-is — there the audio IS the question.
- [x] `#/map` journey path (pack picker + mascot at current node),
      `#/rewards` sticker shelf (9 data-derived milestones), `#/boss`
      weakness-ranked round (lapses→box→stale, +1 tier, bossClears in
      settings), streak freeze (1 single-day gap per chain).
- [x] typecheck+build OK → cap sync → xcodebuild → devicectl install.

## Lessons (additions)

- Kid feedback exposes REAL design flaws adults miss: "hear the answer
  before guessing" = exercise is trivia not learning. Pattern for all
  answer-bearing audio: never play it before the answer is submitted;
  it belongs in the kind-failure feedback after a wrong pick.
- Full device deploy is 3 commands, no Xcode UI needed:
  `pnpm --filter player ios:sync` → xcodebuild (id=UDID,
  -allowProvisioningUpdates) → `devicectl device install app`.

## 2026-10-30 (2) — UI review pass

- [x] Fixed: global `button { color:#fff }` vs light-bg buttons →
      invisible text on map bubbles, speak "record", self-rate 😃/🔁.
      Added ink-color overrides to those classes (kept white-on-accent
      default — option buttons depend on it).
- [x] Home nav links were raw underlined `<a>` → `.nav-card` touch rows.
- [x] `← home` links → pill style via `a[href="#/"]` selector (covers all
      5 pages, no JSX edits).
- [x] Map mascot anchored inside `.map-bubble` (was floating at
      row-center, detached from the bubble).
- [x] Session exercise cards min-height 60dvh (was top-clustered with
      dead space below).
- [x] Verified via sim screenshots on a FRESH PORT — stale SW holds
      :4173 (autoUpdate only helps going forward; the old prompt-type SW
      still controls until all tabs close).

## Lessons (additions)

- Global `button { color:#fff }` + light-background buttons = invisible
  text. Any custom button bg needs an explicit `color:` — grep new
  button classes against the global rule.
- Screenshot verification needs a fresh origin (new port) or SW-clear —
  same-origin screenshots show the OLD bundle and waste a debugging
  cycle. `python3 -m http.server <newport> -d dist` is the quick fix.
- xcodebuild output lands in DerivedData, not ios/App/build —
  `-showBuildSettings | grep BUILT_PRODUCTS_DIR` for the real .app path.

## 2026-10-30 (3) — Candy-kid redesign (ref: Arabic phonics app shots)

User shared 3 screenshots of a kids' learning app (Arabic UI, English
letters/words) as STYLE REFERENCE — not to copy. Extracted design intent:
- chunky 3D pressable cards/buttons (colored border + darker bottom edge)
- candy palette on soft sky bg (coral/sun/mint/sky/grape/pink)
- lesson path = big colored circles w/ icon + star count, zigzag
- colored vocab-chip banner (word + emoji pills)
- stat pills on top (stars / streak / progress)
- pet/companion card: egg hatches at star milestones, locked reward pips
- session chrome: progress bar + mascot riding fill tip + round X quit

Plan:
[ ] CSS: candy tokens + .chunk card/btn (3px border + 0 6px 0 darker)
[ ] HomePage → hub: stat pills | mascot+Play | vocab chip banner
    (tappable, plays word audio) | mode grid (speak/read/map/stickers/
    boss w/ icon+title+★) | Buddy pet card (egg→🐣→fox by total stars)
[ ] MapPage → candy circles zigzag w/ emoji + stars + locked grey
[ ] SessionPage chrome: mascot rides progress fill + X quit pill;
    exercise card gets candy border
[ ] typecheck+build+shots (fresh port!)+sync+install iPad+docs

### Redesign done (verified via fresh-port screenshots)

- [x] Candy tokens + chunky primitives (.chunk borders + 0 6px 0 press)
- [x] Home → hub: stat pills / hero+Play / coral vocab-chip banner
      (chips tap → playPackClip word audio) / 5 mode cards / pet card
      (🥚→🐣→fox at 10/30⭐, milestone pips 10/30/60/120)
- [x] Map → candy circles zigzag, icon-only circle + caption below
      (fixed: long titles clipped inside circle; mascot now stands on
      ring — transform conflicts with framer → use calc offset)
- [x] Session chrome: mascot rides progress fill, ✕ quit pill,
      .exercise-card coral border + bottom shadow
- [x] Deployed to iPad (xcodebuild+devicectl)

## Lessons (additions)

- SW update isn't instant even on autoUpdate: new SW precaches ~6 MB
  before activating — screenshot checks need a FRESH PORT each build,
  not just a reload on the same port.
- framer-motion `animate={{y}}` overrides CSS transform — never combine
  translateX(-50%) centering with motion.y on the same element; use
  left:calc(50% - Npx) instead.
- Icon-only circle + caption BELOW (like ref app) handles long titles
  better than squeezing text inside the circle.

## 2026-10-30 (4) — speak page bug + purpose upgrade

- [x] BUG: every recording after the 1st was silent. Cause: clipUrl-
      dep cleanup stopped mic STREAM tracks on every clip change;
      streamRef stayed truthy-but-dead → MediaRecorder recorded silence.
      Fix: stream-stop = unmount-only effect; blob revoke = separate
      clipUrl-dep effect; re-acquire stream if !stream.active.
- [x] Added live mic level meter (AnalyserNode → rAF → level-fill width)
      — kid SEES his voice while recording (also a silent-capture tell).
- [x] Added ⚖ compare button — playClips([model, mine], 0.6) A/B in one
      tap (fetch() handles blob: URLs fine).
- [x] Deployed to iPad.
- User asked "why record if app can't grade" → answered: D4 says no ASR
  on iPad (T5 confirmed service-not-allowed); record-compare IS the
  exercise (shadowing); meter+compare make it feel real now.

## Lessons (additions)

- React effect cleanup on a CHANGING dep is the classic "kills shared
  resource" trap — the resource-stop belonged to unmount ([]), not to
  the state that happened to change in the same effect.
- MediaRecorder on a dead-but-referenced MediaStream produces silent
  blobs, not errors — always check stream.active before reuse.

## 2026-10-30 (5) — cloze spoiler round 2

- [x] His report: "guess the word still pronounces the word" — two
      spoiler paths were left: (a) wrong pick auto-played the FULL
      sentence (with answer) — a free reveal behind one wrong tap;
      (b) 💡 hint button played the sentence on demand. Both removed.
      Now: NOTHING answer-bearing plays before a correct pick; correct
      pick still plays the sentence (reinforcement). Option-word 🔊
      stays (all options equal → no reveal).
- [x] Deployed to iPad.

## Lessons (additions)

- "Kind failure plays the answer audio" is itself a spoiler in guess-
  type exercises — a wrong tap shouldn't hand over the answer either.
  Rule sharpened: NO answer-bearing audio before the final answer is
  locked; after correct = reinforcement is fine.

## 2026-10-30 (6) — interactive reader + karaoke + read-all

- [x] audio.ts: liveSources registry + stopAll(); PlayResult gains
      {duration, done:Promise} — done resolves onended (also fires on
      manual stop → cleanup paths still run).
- [x] ReadPage v2: paragraphs as tappable story text (exclusive play —
      tap another = first stops; tap playing = pause toggle); playing
      para highlighted + pulsing ⏸; "▶ read it all" auto mode steps
      through paragraphs w/ scrollIntoView; any tap = cancels auto;
      page change + unmount stop everything.
- [x] Approximate karaoke: word highlight timed by clip duration split
      ∝ word length (weight = len+0.5). .word-live sun highlight.
      Upgrade path: real alignment via Piper/forced-align at build time.
- [x] reader-img max-height 44dvh so story card is above the fold.
- [x] Deployed to iPad.

## Lessons (additions)

- Book page images are TALL — interactive content must be above the
  fold or kids never find it; cap image height, don't rely on scroll.
- Approximate karaoke (duration ∝ word length) is a convincing cheap
  stand-in for real alignment — good enough for a kid UX.

## 2026-10-30 (7) — comprehension questions (plan §6.5 last row)

- [x] ExerciseType + `comprehension`; payload {kind:mcq|tf, passage,
      passageSentences, question, options?, answer, audio?}
- [x] tools/pipeline/src/comprehend.ts — LLM stage → enriched.comprehension.json
      (preserves prior approvals by id; NOT run — no ANTHROPIC_API_KEY on Mac;
      ch01's 24 questions authored by hand in identical format + audited)
- [x] pack.ts reads all enriched.*.json + wires audio: passage→sent:* clips,
      question/options→cq:*/cqo:* (piper absent → speak() fallback)
- [x] tts.ts emits cq:/cqo: items for future piper runs
- [x] audio.ts: speak(text) speechSynthesis helper + stopAll() cancels it
- [x] Comprehension.tsx + SessionPage registry; loosePool sort puts
      comprehension first → 1 story question/session (verified 5/5)
- [x] ParentPage "💬 Ask him tonight" card (2 random pack Qs + answers)
- [x] pack v3 = 438 exercises, deployed to iPad

## Lessons (additions)

- No piper/API keys on the Mac yet — .env.example still has Windows D:\
  paths. Design generated content to degrade to speechSynthesis so it
  works without piper; wire real clips when a future tts run adds them.
- passageSentences must match sent:* manifest keys byte-for-byte —
  build generated payloads programmatically from reviewed.json, never
  hand-copy unicode text.
- Comprehension ≠ cloze spoiler rules: the answer IS in the passage —
  replaying the story on a wrong pick is the scaffold, not a leak.

## 2026-10-30 (8) — SpellingTiles rework + global audio exclusivity

- [x] SpellingTiles: answer-string model — unique letter bank (each
      letter shows ONCE, re-tappable for doubles), ⌫ backspace, tap a
      placed letter to remove it too. Double-letter words ("letter")
      now spellable without duplicate tiles.
- [x] Global one-voice rule: playClip() and playClips() call stopAll()
      first; playClips sources now register in liveSources so they CAN
      be stopped; stopAll() disconnects never-started scheduled sources
      (stop() throws on them) and cancels speechSynthesis; speak() calls
      stopAll too. SessionPage: stopAll() on every step advance + quit.
- [x] Deployed to iPad.

## Lessons (additions)

- "Same tile twice erases it" — index-instance banks fight repeat
  letters; model the answer as a STRING and bank as unique letters.
- Web Audio: sources scheduled with start(t+future) can't be stop()ed
  before they start — disconnect() them instead (stays silent forever).
- Central exclusivity (stop inside playClip) beats per-component
  cleanup — every future component gets non-overlap for free.
