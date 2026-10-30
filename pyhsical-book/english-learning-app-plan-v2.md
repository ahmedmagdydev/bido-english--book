# PageBuddy v2: Interactive English App for My Son's iPad
### Rebuilt plan: PWA-first, content pipeline on Windows, tailored to iPad 9th gen

*Plan version 2.0, October 2026. Replaces v1.*

---

## 0. Project Snapshot

| Item | Answer | What it means for the plan |
|------|--------|----------------------------|
| Learner | 8 years old, Grade 3 | Short sessions (8 to 12 min), big touch targets, audio-first, game feel |
| Book | "English" by Ahmed Magdy | Content is a specific school book; **copyright matters if shared** |
| First language | Arabic, but **reads English better than Arabic** | Child UI is **English + icons + audio only**. Arabic is an optional parent-controlled hint, never required |
| Scope | ~120 pages; **start with Chapter 1** | Pilot one chapter end-to-end before scaling |
| Device | iPad 9th gen (A13 chip), iPadOS 26.4.1 | Supported by iPadOS 26, but **no Apple Intelligence** and no newest on-device speech engine (details in section 2) |
| Dev machine | Windows PC first, Apple Silicon Mac later | Pipeline and app can be built **entirely on Windows**; the Mac is only needed for optional native steps and Safari debugging |
| Skills | Front-end dev, Angular and React, 10 years | **PWA is the natural fit.** No need to learn Swift |
| Distribution | Personal now, maybe friends later | A web app shares by URL, with no App Store and no 7-day signing expiry |
| Apple Pencil | None | Handwriting features dropped |

### What changed from v1

1. **Native SwiftUI is no longer the primary path.** A PWA (installable web app) built with your existing skills is now the recommended start. A thin native wrapper (Capacitor) stays as an *upgrade path* if a web limitation bites.
2. **All AI runs at build time on your PC**, not on the iPad. His iPad cannot run Apple's on-device language model, and a child's app should not carry API keys anyway.
3. **Audio is pre-generated** (high-quality TTS files created by the pipeline) instead of relying on the iPad's built-in voices.
4. **Speech recognition is deferred.** Browser speech recognition on iPad is unreliable, so the MVP uses ASR-free speaking activities (record and compare, listen-and-pick pronunciation) and treats recognition as a later experiment.
5. **Content is separated from the app** (lesson packs), which makes the "friends" scenario and the copyright question much easier.
6. **New: a Phase 0 "device spike"**, a 1-evening test page that proves what works on his actual iPad *before* you build anything big.
7. Handwriting, Foundation Models, and the conversation-buddy features are removed or postponed.

---

## 1. Vision and Principles

Photograph the book, turn each page into structured digital content, and play it back as short, game-like activities that **speak to him, quiz him, and remember what he finds hard**.

1. **Book first.** Everything comes from his book, so it matches class and tests.
2. **Audio first.** Every word and sentence is tappable and spoken.
3. **Short and rewarding.** 8 to 12 minute sessions, instant kind feedback, no punishment.
4. **Parent in the loop.** AI makes mistakes; you review content before he sees it.
5. **Private by design.** No accounts, no ads, no tracking, progress stays on the iPad.
6. **Reusable engine.** The player knows nothing about this one book. It plays "lesson packs".

---

## 2. Learner and Device Profile (and Design Implications)

### 2.1 The learner

- **Age 8 / Grade 3:** can read short sentences, spelling and basic grammar are the typical learning edge (confirm against Chapter 1: usually vocabulary lists, short dialogues, simple reading passages, and grammar points like *to be*, plurals, prepositions, simple present).
- **Reads English better than Arabic:** do **not** build a bilingual UI. Instructions are short English text plus an icon plus a spoken prompt. If you add Arabic meaning hints later, they must be (a) off by default, (b) available as **audio** as well as text, and (c) rendered RTL with a proper Arabic font.
- **Likely motivated by games, not drills:** every activity needs a game wrapper (stars, characters, progress path).

### 2.2 The iPad (9th gen, A13, iPadOS 26.4.1)

| Fact | Consequence |
|------|-------------|
| iPadOS 26 supports the 9th-gen iPad (A12 or later is the requirement) | The PWA path is fully viable; modern Safari features are available. The iPad is also listed as compatible with iPadOS 27, so plan to re-test after major updates |
| Apple Intelligence needs an A17 Pro / M1 or newer | **Foundation Models (on-device LLM) is not available.** All AI is done on your PC at build time |
| The new `SpeechTranscriber` engine has hardware requirements this iPad reportedly does not meet (Apple points older hardware to `DictationTranscriber`) | If you ever go native, use `SFSpeechRecognizer` / `DictationTranscriber`, not the new engine |
| Safari speech **synthesis** works, but needs a tap first and voices vary by device | Use pre-generated audio files as the primary sound source |
| Safari speech **recognition** is unreliable, and historically does not work in Home Screen web apps | Don't depend on it for the MVP (section 8) |
| 10.2" screen, about 810 x 1080 CSS px viewport, 3 GB RAM | Light bundle, no heavy WebGL/ML in the browser, large buttons |
| No Apple Pencil | Finger-only input |

---

## 3. Key Decisions

| # | Decision | Rationale | Revisit when |
|---|----------|-----------|--------------|
| D1 | **PWA first** (React + Vite + TypeScript, installable on Home Screen) | Uses your 10 years of skills; develop on Windows; no signing expiry; share by link | A web limitation blocks a must-have feature after the spike |
| D2 | **Pre-generated audio** for every word and sentence (normal + slow) | Consistent quality and accent, works offline, no dependence on iPad voices | Never, except for dynamic text |
| D3 | **AI only in the build-time pipeline** | iPad can't run on-device LLMs; keeps keys off the device; lets you review before he sees anything | Only if you later build a private backend |
| D4 | **No speech recognition in MVP** | Unreliable in Safari/PWA; avoids frustrating a child with false "wrong" results | Spike shows it works, or you adopt a Capacitor wrapper |
| D5 | **Lesson packs** (JSON + images + audio) separate from the player | Reusable for other chapters/books; content stays private while the engine can be public | Never |
| D6 | **Local-only data** (IndexedDB), with export/import of progress | Child privacy and simplicity | If you want multi-device sync |
| D7 | **Monorepo with shared schema** | One zod schema validates pipeline output and player input | n/a |

---

## 4. System Overview

```
                        YOUR WINDOWS PC (build time)
 +----------------------------------------------------------------------+
 | Book photos --> extract (Claude vision) --> review UI (you fix/approve)|
 |        --> generate exercises (code + LLM for comprehension Qs)       |
 |        --> generate audio (TTS) --> build lesson pack (.json/img/mp3)  |
 +----------------------------------------------------------------------+
                                   |
                         deploy (static files)
                                   v
                  Private static hosting (HTTPS) / AirDrop of a pack
                                   |
                                   v
 +----------------------------------------------------------------------+
 |                 HIS iPAD (run time, works offline)                    |
 |  PWA player: reader, flashcards, games, rewards, spaced repetition,   |
 |  IndexedDB progress, parent area (PIN-gated)                          |
 +----------------------------------------------------------------------+
```

---

## 5. Technology Stack

### 5.1 Player app (PWA)

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **React + Vite + TypeScript** | Angular works equally well; examples use React. Pick whichever you are fastest in |
| PWA | `vite-plugin-pwa` (Workbox) | Precache app shell and the active pack's assets for offline use |
| State | Zustand (or Signals if Angular) | Small and simple |
| Storage | **Dexie** (IndexedDB wrapper) + Cache Storage for audio/images | Request `navigator.storage.persist()` on first run |
| Audio | **Howler.js** or raw Web Audio | Handles the iOS "first tap unlocks audio" rule; supports sprites; decode short clips into memory for instant playback |
| Drag and drop | `@dnd-kit` with pointer/touch sensors, or hand-rolled pointer events | **Avoid HTML5 native drag-and-drop** (poor on iOS touch) |
| Animation | CSS + Framer Motion; `canvas-confetti` for celebrations | Respect `prefers-reduced-motion` |
| Styling | Tailwind or CSS modules | Design tokens: large radii, high contrast, 60+ px targets |
| Fonts | Self-hosted **Andika** or **Lexend** (literacy-friendly), optional Atkinson Hyperlegible | Self-host so they work offline |
| Mascot / art | Inline SVG or Lottie | Keep it light for 3 GB RAM |
| Tests | Vitest + **Playwright with WebKit** | Playwright's WebKit engine runs on Windows and approximates Safari (not identical to iPadOS) |

### 5.2 Content pipeline (runs on Windows)

| Concern | Choice | Notes |
|---------|--------|-------|
| Runtime | Node 20+ + TypeScript (`tsx`) | Same language as the app |
| Page understanding | **Claude vision API** (`@anthropic-ai/sdk`), e.g. model `claude-sonnet-5-5`, or a stronger model for difficult pages | One page image in, structured JSON out. Handles layout, tables, pictures, and stylised fonts better than classic OCR |
| Validation | `zod` | Same schema as the player |
| Image work | `sharp` | Resize, crop illustrations, compress |
| Audio | A neural TTS service (cloud) invoked by script | Choose one whose **terms allow redistribution** of generated audio if you may share later. Encode to mono MP3/AAC at modest bitrate |
| Review UI | Small local React app (Vite) | Page image on the left, editable data on the right, draw-a-rectangle crop tool |
| Fallback OCR | Tesseract (optional) | Only if you want an offline cross-check |

### 5.3 Native wrapper (only if needed later)

**Capacitor** wraps the same web build in a native shell and lets you add native plugins (for example on-device speech recognition). It needs the Mac and Xcode, and brings back the free-signing limits (below) unless you pay for the developer program.

---

## 6. Content Pipeline: Book Photos to Lesson Packs

### 6.1 Stages

1. **Capture** (phone, document-scan mode): one page per photo, flat, evenly lit.
2. **Extract** (Claude vision): per page, return JSON of title, page type, vocabulary, sentences, dialogue, grammar points, exercise instructions, picture regions, and an `uncertain` list.
3. **Review** (you, in the local review tool): fix typos, remove junk, crop illustrations, mark approved.
4. **Enrich** (code + LLM):
   - Deterministic exercise generation from approved vocab/sentences.
   - LLM-generated reading-comprehension questions and extra example sentences, **marked `source: "generated"`** and requiring your approval.
5. **Audio** (TTS): for each word and sentence generate normal and slow clips. Cache by hash of `(text + voice + speed)` so re-runs only generate what changed.
6. **Pack** (build): validate against the schema, compress images, write `pack.json` plus `images/` and `audio/`, and a content hash for cache-busting.

### 6.2 Photography checklist

- [ ] Daylight or side lighting; no shadows or glare on glossy paper
- [ ] Phone parallel to the page, or use the phone's document scanner (auto-crops and flattens)
- [ ] One page per photo, full page with a small margin, in focus
- [ ] Flatten the spine; fix curved text near the gutter
- [ ] Name files in reading order: `ch01_p010.jpg`, `ch01_p011.jpg`...
- [ ] **Also photograph** the table of contents and any glossary/word list; they are the cleanest vocabulary source
- [ ] Keep originals backed up and untouched

### 6.3 Extraction script sketch (TypeScript)

```ts
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { PageExtractSchema } from "@pagebuddy/schema";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function extractPage(imagePath: string) {
  const data = (await readFile(imagePath)).toString("base64");
  const res = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
        { type: "text", text: EXTRACTION_PROMPT } // see Appendix B
      ]
    }]
  });
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
  return PageExtractSchema.parse(JSON.parse(text)); // throws on malformed output
}
```

Practical notes: process pages in small batches with retries; save each result to `content/work/ch01/p010.json`; never overwrite a page you already reviewed (keep `raw.json` and `reviewed.json` separate).

### 6.4 Review tool requirements (build this early, it saves hours)

- Side-by-side: page photo and editable extracted data
- `uncertain` items highlighted first, with a one-key approve
- Rectangle crop tool to cut illustrations for vocabulary pictures
- Status per page: *raw / needs review / approved*
- Writes JSON back to disk (a tiny local Node endpoint, or the browser File System Access API in Chrome on Windows)
- "Compare against glossary" check for spelling mistakes

### 6.5 Exercise generation rules (mostly plain code, no AI)

| Exercise | Generated from | Rule |
|----------|----------------|------|
| Listen and pick picture/word | Vocab | Distractors from the same chapter, preferably same part of speech or similar spelling |
| Cloze | Book sentences | Blank one content word; choices = answer + 2 same-POS distractors; ladder up to letter tiles, then typing |
| Sentence builder | Book sentences with 4 to 8 words | Shuffle tokens; keep punctuation and capitalisation hints |
| Spelling tiles | Vocab words | Letters plus 2 to 3 distractor letters; audio plus picture prompt |
| Match pairs | Vocab with pictures | 4 to 6 pairs per round |
| Odd one out | Vocab with tags (animals, family...) | Needs `tags`, which the LLM can suggest and you approve |
| Minimal-pair listening | Vocab pairs like *ship / sheep* | ASR-free pronunciation training (see section 8) |
| True/false, comprehension | Reading passages | LLM-generated, **must be approved** |

### 6.6 Illustrations and pictures

- For **private use**, cropping illustrations from his book is the best match for what he sees in class.
- For a **public version**, replace book illustrations with openly licensed art (for example emoji sets such as OpenMoji or Twemoji; check each licence's attribution rules) or your own drawings. Keep an `imageSource` field in the pack so you can filter by licence later.

### 6.7 Cost and effort note

At about 120 pages, vision extraction and TTS are normally cheap at this scale. Run a **5-page test**, read the real usage numbers in your API and TTS dashboards, and extrapolate before running the full book. Check provider free tiers and terms.

---

## 7. Player App Design

### 7.1 Screens

1. **Home / Today:** big Play button, daily goal ring, streak, mascot.
2. **Chapter map:** path of lessons with locked / in-progress / mastered states.
3. **Lesson hub:** Read, Words, Practice, Speak, Boss Challenge.
4. **Reader:** page image or clean text; tap a word to hear it, tap a sentence to hear it with word highlighting.
5. **Flashcards:** picture, audio, example sentence; "I know it / Again".
6. **Exercise player:** one component hosting all activity types, with progress bar, hints, and gentle feedback.
7. **Speak mode:** repeat-after-me with record/playback (and recognition later).
8. **Rewards:** stars, stickers, mascot items.
9. **Parent area (PIN gate):** dashboard, settings, pack import, progress export/import.

### 7.2 Learning engine

- **Leitner spaced repetition** (Appendix C) stored per item in IndexedDB.
- **Session builder:** about 10 to 12 items = all *due* reviews + 3 to 5 *new* items. End on an easy win.
- **Exercise difficulty follows mastery:**

| Leitner box | Typical exercise types |
|-------------|------------------------|
| New | Exposure card (see + hear + example), then listen-and-pick |
| 1 to 2 | Listen-and-pick, match pairs, cloze with choices |
| 3 to 4 | Sentence builder, spelling tiles, cloze with letter tiles |
| 5 to 6 | Dictation by typing, mixed boss rounds, delayed review |

- **Kind failure handling:** wrong answer shows the correct answer, plays the audio, and re-queues the item a few turns later in the same session (a "second chance" that counts for half credit).
- **Parent tagging:** mark a lesson "test next week" to boost its items in the session builder.

### 7.3 Exercise catalogue (final list for this device)

Listen and pick (picture/word), match pairs, cloze, sentence builder, spelling tiles, odd one out, true/false, minimal-pair listening, dictation (typing), read-aloud (self-assessed at first), dialogue role-play (the app plays Role A, he reads Role B, then self-checks).

### 7.4 Motivation design

Daily goal ring, streak with one "freeze" per week, chapter path with a moving character, stickers earned for effort (trying again, finishing a session), and a boss round at the end of each lesson. No countdown timers, no harsh buzzers, no red crosses. Use a soft "oops, try again" animation.

### 7.5 iPad and touch specifics (these bite web developers)

- **Audio unlock:** the first sound must be triggered inside a user tap. Make the Home "Play" button the unlock. Reuse the same audio context or elements afterwards.
- **No hover states.** Pressed state only; targets at least 60 x 60 px.
- **Disable accidental behaviours:** `touch-action: manipulation`, prevent text selection and long-press callouts on game elements, stop rubber-band scrolling in game screens, block pinch-zoom.
- **Safe areas:** use `env(safe-area-inset-*)` and the `viewport-fit=cover` meta tag.
- **Landscape and portrait** both supported; test rotation mid-exercise.
- **Memory:** lazy-load packs and audio per lesson; keep images compressed (about 100 to 200 KB each); avoid giant canvases.
- **Keyboard:** typing exercises should use on-screen letter tiles where possible so the iPad keyboard doesn't cover the screen.
- **Home Screen install:** add a manifest with `display: standalone`, proper icons, and a splash colour.
- **Parent tip:** iPad **Guided Access** (Settings > Accessibility) can lock the iPad into the app during practice time.

### 7.6 Parent area

PIN or arithmetic gate. Dashboard: minutes per day, accuracy, the 10 hardest words, streak, and "words to practise at dinner". Settings: daily goal, session length, optional Arabic hint toggle (off by default), reset progress, import pack, **export/import progress as a JSON file** (Web Share API or file download).

---

## 8. Speaking Strategy (Tiered, Because Web Speech Recognition Is Unreliable on iPad)

| Tier | Feature | Needs | When |
|------|---------|-------|------|
| 0 | Listen to words and sentences (pre-generated audio, normal and slow) | Nothing special | MVP |
| 1 | **Minimal-pair listening** ("Which one did you hear: ship or sheep?") and "Which sounds right?" tasks | Pre-generated audio | MVP / Phase 3 |
| 2 | **Record and compare:** he records himself via `getUserMedia` + `MediaRecorder`, hears the model clip then his own, and self-rates with a face (or a parent taps thumbs-up) | Microphone permission; test the permission prompt behaviour in standalone mode | Phase 3 |
| 3 | **Automatic scoring** via browser speech recognition | Spike result decides; browser recognition on iOS has been unreliable and has not worked in Home Screen web apps | Only if the spike shows it works well |
| 4 | **Native on-device recognition** via Capacitor plugin (`SFSpeechRecognizer`) | Mac + Xcode; paid developer account recommended for stable installs | Phase 5, only if Tiers 1 to 2 feel insufficient |

Notes: browser recognition on iOS also sends audio to Apple's servers and requires an internet connection, which is another reason to keep it optional. If you ever score speech, compare at the **word level**, be lenient, never say "wrong" (say "try again"), and always offer "skip" (Appendix D).

---

## 9. Data Model and Storage

### 9.1 Lesson pack (shared schema)

```ts
// packages/schema/src/pack.ts (zod schemas mirror these types)
export interface LessonPack {
  packId: string;            // "english-g3-ch01"
  version: number;
  title: string;
  lessons: Lesson[];
  vocab: VocabItem[];
  sentences: SentenceItem[];
  exercises: ExerciseItem[];
  pages: PageRef[];          // optional, for the reader
}

export interface VocabItem {
  id: string;                // "v_mother"
  word: string;
  pos?: "noun" | "verb" | "adj" | "adv" | "prep" | "other";
  example?: string;
  tags: string[];            // ["family"]
  image?: { src: string; source: "book" | "open" | "own" };
  audio: { normal: string; slow?: string };
  arabicHint?: { text: string; audio?: string };   // optional, off by default
  sourcePage?: number;
  provenance: "book" | "generated";
}

export interface SentenceItem {
  id: string; text: string; speaker?: string;
  audio: { normal: string; slow?: string };
  sourcePage?: number; provenance: "book" | "generated";
}

export interface ExerciseItem {
  id: string;
  type: "listenPick" | "cloze" | "sentenceBuilder" | "spellingTiles"
      | "matchPairs" | "oddOneOut" | "trueFalse" | "minimalPair";
  refs: string[];            // vocab/sentence ids this exercise trains
  payload: Record<string, unknown>; // type-specific, validated per type
  approved: boolean;
}
```

### 9.2 Local database (Dexie / IndexedDB)

```
packs        (packId, version, importedAt)
review       (itemId, packId, box, nextDue, streak, lapses, lastSeen)
attempts     (id, itemId, exerciseType, correct, ms, ts)
daily        (date, minutes, itemsPracticed, accuracy, stars)
settings     (key, value)        // dailyGoal, sessionLimit, pinHash, arabicHint...
```

Audio and images live in Cache Storage (precached by the service worker per pack). Progress lives in IndexedDB.

### 9.3 Storage durability

- Install to Home Screen and call `navigator.storage.persist()`.
- WebKit's tracking-prevention rules apply a 7-day storage-deletion cap to regular browser tabs, and Home Screen web apps are treated differently, but **verify this in the spike** rather than trusting it.
- Provide **Export progress** in the parent area from day one; it is your safety net.

---

## 10. Development Workflow (Windows to iPad, Mac later)

1. **Develop on Windows** with `vite dev`; test in Chrome/Edge device emulation and in Playwright WebKit.
2. **Test on the real iPad over HTTPS.** Service workers and microphone access need a secure context, and the iPad can't treat a plain LAN dev server as secure. Use a **tunnel** (for example Cloudflare Tunnel) or **branch preview deployments** on your static host.
3. **Debugging on the iPad:** Safari's Web Inspector needs a Mac and a cable, so use your Mac when needed; on Windows use an on-page console such as `eruda` during early testing.
4. **Mac later:** only for Safari Web Inspector, the optional Capacitor wrapper, and Xcode if you ever go native.

### Suggested monorepo (pnpm workspaces)

```
pagebuddy/
  apps/
    player/                 # React PWA
  packages/
    schema/                 # zod schemas + TS types shared by all
  tools/
    pipeline/               # CLI: extract, enrich, tts, pack
    review/                 # local review UI
  content/
    photos/ch01/            # originals (git-ignored)
    work/ch01/              # raw.json, reviewed.json per page
    packs/english-g3-ch01/  # built output
  docs/
```

Keep `content/` out of any public repo.

---

## 11. Hosting, Install, Offline, Updates

- **Hosting:** any static host with HTTPS (for example Cloudflare Pages or Netlify).
- **While private:** keep the site unlisted and non-indexed (`noindex`), and consider putting the content behind a simple access gate (for example Cloudflare Access with a one-time email code; check the current free-tier limits). Alternative: host only the **app shell** publicly and **import the lesson pack from a file** (AirDrop or the Files app into an `<input type="file">`, unzipped in the browser). This keeps the book content off the internet entirely.
- **Install:** Safari > Share > **Add to Home Screen**. Confirm it launches standalone.
- **Offline:** precache the app shell plus the current lesson's audio and images; show an "Offline ready" badge in the parent area.
- **Updates:** use a "new version available, tap to update" prompt (parent area) rather than silent reloads in the middle of a game.
- **Backups:** progress export file (JSON) stored in iCloud Drive or emailed to yourself monthly.

---

## 12. Going Public Later (Friends and Classmates)

### 12.1 Copyright gate (do this first)

The book's text, illustrations, and exercises are the author's and publisher's work. Sharing digitised content publicly can infringe their rights, even free and with good intentions. Options:

1. **Ask permission.** Contact the author (Ahmed Magdy) and/or the publisher. Explain it is a free, non-commercial learning tool, and ask for written permission to distribute the pack. An individual author may say yes, and may even want to help.
2. **Share the engine only.** Publish the player and pack format, and let others import their own packs.
3. **Share original content only.** Build separate packs from your own sentences and openly licensed art.
4. **Keep it private.** A perfectly good outcome.

(This is general information, not legal advice.)

### 12.2 Other checklist items for sharing

- [ ] Replace or license all illustrations (section 6.6)
- [ ] Confirm the TTS provider's terms allow redistributing generated audio
- [ ] Add a short privacy page: no accounts, no tracking, all data stays on the device
- [ ] Keep analytics off (or strictly privacy-preserving and parent-opt-in)
- [ ] Test on other iPads and on Android tablets (Safari-specific behaviour differs)
- [ ] Support multiple packs and a pack picker
- [ ] Consider the App Store only if you truly need it (paid developer account, Capacitor, kids-app rules); a link and Add to Home Screen is far simpler

### 12.3 Free signing limits (only relevant if you ever go native)

A free Apple ID lets you install a self-built app on your own iPad via Xcode, but the app stops working after **7 days** until rebuilt and reinstalled. You can also register up to 10 App IDs and install up to 3 apps per device. The paid developer program (about USD 99/year) removes these limits and enables longer-lived installs and TestFlight. The PWA path avoids this problem entirely.

---

## 13. Roadmap

*(Estimates for evenings and weekends with your experience; adjust freely.)*

### Phase 0: Device spike (1 evening)
Build one throwaway page and test it on **his iPad**, in both a Safari tab and the Home Screen install. Checklist in Appendix D.
- **Done when:** you have a written "works / doesn't work" list that settles D4 and the Capacitor question.

### Phase 1: Pipeline for Chapter 1 (1 weekend)
- Monorepo scaffold, shared schema
- Photograph Chapter 1
- Extraction script, then the review tool (basic)
- Review and approve Chapter 1 content
- **Done when:** Chapter 1 exists as a validated pack with vocab, sentences, and zero known extraction errors.

### Phase 2: MVP player (2 to 3 weekends)
- PWA shell, pack loader, Dexie progress store
- Audio generation and playback with first-tap unlock
- Reader with tap-to-hear
- Flashcards with Leitner scheduling
- Three games: listen-and-pick, cloze, sentence builder
- Stars, streak, daily goal ring
- **Done when:** he completes a 10-minute session unprompted and asks for another.

### Phase 3: Depth (2 weekends)
- Spelling tiles, match pairs, odd one out, minimal pairs
- Record-and-compare speaking
- Parent dashboard, PIN gate, export/import progress
- Session builder tuned from real attempt data
- **Done when:** the dashboard accurately lists the 10 words he struggles with.

### Phase 4: Scale (ongoing)
- Digitise the remaining chapters through the same pipeline
- Comprehension questions (LLM generated, approved by you)
- Chapter map, stickers, mascot polish
- Optional Arabic audio hints
- **Done when:** the whole book is playable and the pipeline is a one-command routine per chapter.

### Phase 5: Optional upgrades
- Evaluate automatic speech scoring (browser or Capacitor)
- Pack picker and "bring your own pack" import
- Sharing with friends (only after the copyright gate, section 12)

---

## 14. Chapter 1 Pilot: The First Week

1. **Day 1:** Answer one thing for yourself: which Chapter 1 pages are the richest in vocabulary? Photograph the whole chapter plus the contents/glossary pages.
2. **Day 1 evening:** Run the **Phase 0 spike** on the iPad.
3. **Day 2 to 3:** Set up the monorepo, schema, and extraction script; run on 5 pages; inspect output and API usage.
4. **Day 3 to 4:** Review tool v0 (or review in JSON/VS Code for the first pass).
5. **Day 5:** Pick a TTS provider, generate audio for Chapter 1, and listen to every clip for pronunciation problems.
6. **Weekend:** Start the player: pack loader, reader, flashcards, first game.
7. **First play-test** with your son at the end of the week. Say nothing, watch.

---

## 15. Testing With Your Son and Success Metrics

**Play-test rules:** 10 minutes, no coaching, watch where he hesitates, laughs, or quits, then ask him to rate each game with an emoji. Test with the real iPad in normal room noise.

| Metric | Target |
|--------|--------|
| Voluntary use | Opens the app on 4+ days a week without reminders |
| Session length | 8 to 12 minutes, ending happily |
| Retention | 80%+ correct on words after a 2-week gap |
| School impact | Better results on tests for digitised chapters |
| Confidence | Reads or speaks English aloud more willingly |
| Data quality | Fewer than 1 in 200 extracted items needs correction after review |

---

## 16. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Extraction errors teach wrong spellings | High | Mandatory review tool, `uncertain` list, glossary cross-check |
| Safari PWA quirks (audio unlock, standalone mode, permissions) | High | Phase 0 spike; Playwright WebKit tests; real-iPad testing each phase |
| Speech scoring fails on iPad | High | Not in MVP; ASR-free speaking tiers; Capacitor as later option |
| Storage cleared unexpectedly | Low to medium | Install to Home Screen, `persist()`, export progress regularly |
| TTS mispronounces a word | Medium | Listen to all clips; per-word override or re-record in your own voice |
| Copyright complaint if shared | Medium if shared, low if private | Section 12; private by default; ask the author or publisher |
| Child's attention drops (feels like homework) | Medium | Game wrapper, variety, short sessions, let him pick the next game |
| iPadOS update breaks something | Low | Re-run the spike checklist after major updates |
| Scope creep | High | Phase gates and "done when" criteria; one chapter at a time |
| Too much screen time | Medium | Daily goal "completes", session limit, Guided Access, offline follow-up tasks |

---

## Appendix A: Pipeline CLI Commands (target design)

```
pnpm pipeline extract ch01        # photos -> work/ch01/*/raw.json
pnpm review                       # open the review UI
pnpm pipeline enrich ch01         # exercises, tags, generated questions (unapproved)
pnpm pipeline tts ch01            # audio for approved items (cached by hash)
pnpm pipeline pack ch01           # validate + write packs/english-g3-ch01/
pnpm --filter player dev          # run the player
```

## Appendix B: Extraction Prompt Template

```text
You are helping build a learning app for an 8-year-old learning English from a school book.
You are given a photo of ONE book page. Extract its content faithfully.
Do not invent, correct, or "improve" text. If you cannot read something confidently,
put it in "uncertain" instead of guessing.

Return ONLY valid JSON matching this schema:
{
  "pageNumber": number | null,
  "lessonTitle": string | null,
  "pageType": "vocabulary" | "dialogue" | "reading" | "grammar" | "exercise" | "song" | "mixed",
  "vocab": [{ "word": string, "pos": string | null, "example": string | null,
              "hasPicture": boolean, "pictureBox": [x, y, w, h] | null }],
  "sentences": [{ "text": string, "speaker": string | null }],
  "grammarPoints": [{ "title": string, "explanation": string, "examples": string[] }],
  "exercisesOnPage": [{ "instruction": string, "kind": string, "items": string[] }],
  "uncertain": [{ "text": string, "reason": string }]
}
Coordinates in "pictureBox" are fractions of image width/height (0 to 1).
```

Treat `pictureBox` as a hint only; the review tool's crop is authoritative.

## Appendix C: Leitner Scheduler (TypeScript)

```ts
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]; // index = box - 1 (box 1..6)

export function updateReview(r: Review, correct: boolean, now = Date.now()): Review {
  const box = correct ? Math.min(r.box + 1, 6) : Math.max(r.box - 2, 1); // gentle demotion
  const days = INTERVAL_DAYS[box - 1];
  return {
    ...r,
    box,
    streak: correct ? r.streak + 1 : 0,
    lapses: correct ? r.lapses : r.lapses + 1,
    lastSeen: now,
    nextDue: now + days * 24 * 60 * 60 * 1000,
  };
}
// Mastered = box 6 with streak >= 2. Mastered items appear only in boss rounds.
```

## Appendix D: Phase 0 Device Spike Checklist (run on his iPad)

Test each item in a **Safari tab** and again as an installed **Home Screen app**.

| # | Test | Pass criteria |
|---|------|---------------|
| 1 | Add to Home Screen, launch standalone | Full screen, correct icon, safe areas look right |
| 2 | Play an MP3/M4A on first tap, then 5 more clips in a row | No silent clips; latency feels instant when pre-decoded |
| 3 | Log `speechSynthesis.getVoices()` | Note English voices; confirm you do NOT need them (D2) |
| 4 | `getUserMedia` + `MediaRecorder`: record 3 s, play back | Works; note the MIME type (likely `audio/mp4`) and whether permission re-prompts on each launch |
| 5 | `webkitSpeechRecognition` on a short phrase (online, then offline) | Record whether it works in tab, standalone, and offline (expected: unreliable) |
| 6 | Write to IndexedDB, force-quit, reopen next day | Data still there; record `navigator.storage.persist()` result and `estimate()` quota |
| 7 | Service worker offline launch (airplane mode) | App loads and plays cached audio |
| 8 | Drag 6 tiles with pointer events | Smooth, no page scroll or text-selection glitches |
| 9 | Rotate during a drag and during audio | Layout recovers; no stuck state |
| 10 | Load 30 images + 100 audio clips | No memory crashes; acceptable first-load time |

**Decision rule:** if items 2, 4, 6, and 7 pass, the PWA path is confirmed. If 5 passes in Home Screen mode, speech scoring can enter the roadmap earlier. If 2, 6, or 7 fail in standalone mode, plan on the Capacitor wrapper (and consider the paid developer account).

## Appendix E: Speech Scoring Idea (for later)

1. Normalise target and recognised text (lowercase, strip punctuation).
2. Align word sequences with edit distance.
3. Mark each target word *heard* or *missed*.
4. Pass at 70 to 80% of words (lower for new material).
5. Highlight missed words softly, play the model audio, offer one retry.
6. Always offer "Skip for now"; never block progress on speech scoring.

## Appendix F: Parent Bonus Outputs

From the same data you can generate printable or dinner-table material: a weekly "10 words to practise" list, conversation prompts using this week's sentence patterns, a word search from the chapter vocabulary, and a bedtime read-aloud from the chapter's reading passages.

---

*End of plan v2. Natural next deliverables: the Phase 0 spike page, the monorepo scaffold with the shared schema, and the extraction script.*
