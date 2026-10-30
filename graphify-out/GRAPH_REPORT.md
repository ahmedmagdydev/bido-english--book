# Graph Report - bido-english--book  (2026-10-31)

## Corpus Check
- 69 files · ~34,586 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 4, .plist 2, .storyboard 2)

## Summary
- 463 nodes · 977 edges · 29 communities (22 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04a0ebef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell & Pages
- Extraction Pipeline
- Exercise Components & Audio
- player/package.json
- iOS App Lifecycle
- Audio Engine & Device Spike
- Asset Generation Scripts
- Lesson Pack Schema
- Pipeline Dependencies
- Session Builder
- TS Base Config
- Workspace Scripts
- Schema Package
- Project Documentation
- Player TS Config
- Pipeline TS Config
- Schema TS Config
- @capacitor/cli
- Swift Package
- pnpm Workspace
- CapApp-SPM Readme
- vite.config.ts
- db.ts
- dependencies
- page-extract.ts
- scripts
- canvas-confetti
- zustand@^5.0.8

## God Nodes (most connected - your core abstractions)
1. `playPackClip()` - 28 edges
2. `react` - 21 edges
3. `popConfetti()` - 21 edges
4. `framer-motion` - 20 edges
5. `workDir()` - 15 edges
6. `sfx` - 14 edges
7. `useApp` - 14 edges
8. `SessionPage()` - 13 edges
9. `compilerOptions` - 13 edges
10. `App()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `ParentPage()` --references--> `ProgressExportSchema`  [EXTRACTED]
  apps/player/src/pages/ParentPage.tsx → packages/schema/src/progress.ts
- `loadPack()` --references--> `LessonPackSchema`  [EXTRACTED]
  apps/player/src/pack.ts → packages/schema/src/pack.ts
- `comprehendSection()` --references--> `ExerciseItemSchema`  [EXTRACTED]
  tools/pipeline/src/comprehend.ts → packages/schema/src/pack.ts
- `buildPack()` --references--> `ExerciseItemSchema`  [EXTRACTED]
  tools/pipeline/src/pack.ts → packages/schema/src/pack.ts
- `buildPack()` --references--> `LessonPackSchema`  [EXTRACTED]
  tools/pipeline/src/pack.ts → packages/schema/src/pack.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-first Player Runtime** — apps_player_index_entry, apps_player_ios_app_capapp_spm_readme [INFERRED 0.85]

## Communities (29 total, 7 thin omitted)

### Community 0 - "App Shell & Pages"
Cohesion: 0.09
Nodes (37): App(), useHashRoute(), unlockAudio(), Mascot(), db, activePack(), cache, listPacks() (+29 more)

### Community 1 - "Extraction Pipeline"
Cohesion: 0.07
Nodes (45): PageExtract, PageExtractSchema, ReviewedPageSchema, program, anthropic(), comprehendSection(), exists(), LlmQuestion (+37 more)

### Community 2 - "Exercise Components & Audio"
Cohesion: 0.13
Nodes (39): buffers, liveSources, playClips(), playPackClip(), PlayResult, sfx, speak(), stopAll() (+31 more)

### Community 3 - "player/package.json"
Cohesion: 0.19
Nodes (13): devDependencies, @types/canvas-confetti@^1.9.0, @types/react@^19.1.12, @types/react-dom@^19.1.9, typescript@~5.9.2, name, private, type (+5 more)

### Community 4 - "iOS App Lifecycle"
Cohesion: 0.09
Nodes (4): AppDelegate, SceneDelegate, Capacitor, UIKit

### Community 5 - "Audio Engine & Device Spike"
Cohesion: 0.15
Nodes (18): decode(), getAudioContext(), playClip(), preload(), tone(), DragTile(), empty, fmtBytes() (+10 more)

### Community 6 - "Asset Generation Scripts"
Cohesion: 0.10
Nodes (13): sharp@^0.34.3, JOBS, outDir, queue(), workflow(), icons, pub, spike (+5 more)

### Community 7 - "Lesson Pack Schema"
Cohesion: 0.08
Nodes (23): ArabicHint, ArabicHintSchema, AudioRef, AudioRefSchema, ExerciseItem, ExerciseItemSchema, ExerciseType, ExerciseTypeSchema (+15 more)

### Community 8 - "Pipeline Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, @anthropic-ai/sdk@^0.65.0, commander@^14.0.1, dotenv@^17.2.2, @napi-rs/canvas@^0.1.78, @pagebuddy/schema@workspace:*, pdfjs-dist@^5.4.149, sharp@^0.34.3 (+11 more)

### Community 9 - "Session Builder"
Cohesion: 0.23
Nodes (17): buildBossSession(), buildSession(), minimalPartner(), norm(), otherWords(), pickExercise(), preferredTypes(), SessionStep (+9 more)

### Community 10 - "TS Base Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleResolution (+5 more)

### Community 11 - "Workspace Scripts"
Cohesion: 0.17
Nodes (11): engines, node, name, private, scripts, build, pipeline, player (+3 more)

### Community 12 - "Schema Package"
Cohesion: 0.17
Nodes (11): dependencies, zod@^4.1.5, devDependencies, typescript@~5.9.2, exports, name, private, scripts (+3 more)

### Community 13 - "Project Documentation"
Cohesion: 0.60
Nodes (5): PageBuddy PWA Entry (index.html), PageBuddy Agent Skill File, PageBuddy Plan v2 (source of truth), PROGRESS.md Progress & Handoff, Agent Scratchpad (sessions & lessons)

### Community 14 - "Player TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 15 - "Pipeline TS Config"
Cohesion: 0.40
Nodes (4): compilerOptions, types, extends, include

### Community 17 - "@capacitor/cli"
Cohesion: 0.50
Nodes (3): config, @capacitor/cli@^8.6.0, @capacitor/cli

### Community 22 - "vite.config.ts"
Cohesion: 0.29
Nodes (6): vite@^7.1.3, vite-plugin-pwa@^1.0.3, @vitejs/plugin-react@^5.0.2, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 23 - "db.ts"
Cohesion: 0.13
Nodes (14): SpikeRecord, INTERVAL_DAYS, Attempt, AttemptSchema, Daily, DailySchema, PackRecord, PackRecordSchema (+6 more)

### Community 24 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @capacitor/core@^8.6.0, @capacitor/ios@^8.6.0, dexie@^4.0.11, @fontsource/andika@5.3.0, framer-motion@^14.9.0, @pagebuddy/schema@workspace:*, react@^19.1.1 (+7 more)

### Community 25 - "page-extract.ts"
Cohesion: 0.18
Nodes (10): ExerciseOnPageSchema, ExtractedSentenceSchema, ExtractedVocabSchema, GrammarPointSchema, PageStatus, PageStatusSchema, PageTypeSchema, pictureBox (+2 more)

### Community 26 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, gen-art, gen-assets, ios:open, ios:sync, preview (+2 more)

## Knowledge Gaps
- **3 isolated node(s):** `PackageDescription`, `PageBuddy PWA Entry (index.html)`, `CapApp-SPM Package README`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 197 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Exercise Components & Audio` to `dependencies`, `App Shell & Pages`, `player/package.json`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `PageBuddy PWA Entry (index.html)`, `CapApp-SPM Package README` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.09350649350649351 - nodes in this community are weakly interconnected._
- **Why does `framer-motion` connect `Exercise Components & Audio` to `dependencies`, `App Shell & Pages`, `player/package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Extraction Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.06512890094979647 - nodes in this community are weakly interconnected._
- **Why does `sharp` connect `Asset Generation Scripts` to `Extraction Pipeline`, `player/package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Exercise Components & Audio` be split into smaller, more focused modules?**
  _Cohesion score 0.12704174228675136 - nodes in this community are weakly interconnected._