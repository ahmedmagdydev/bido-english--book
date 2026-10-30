# Graph Report - bido-english--book  (2026-10-30)

## Corpus Check
- Corpus is ~31,900 words - fits in a single context window. You may not need a graph.

## Summary
- 416 nodes · 853 edges · 23 communities (16 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell & Pages
- Extraction Pipeline
- Exercise Components & Audio
- Player Dependencies
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
- Capacitor Config
- Swift Package
- pnpm Workspace
- CapApp-SPM Readme

## God Nodes (most connected - your core abstractions)
1. `playPackClip()` - 26 edges
2. `popConfetti()` - 19 edges
3. `LessonPack` - 16 edges
4. `SpeakButton()` - 14 edges
5. `useApp` - 14 edges
6. `sfx` - 13 edges
7. `ExerciseItem` - 13 edges
8. `compilerOptions` - 13 edges
9. `SessionPage()` - 12 edges
10. `workDir()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `AppState` --references--> `LessonPack`  [EXTRACTED]
  apps/player/src/store.ts → packages/schema/src/pack.ts
- `loadPack()` --references--> `LessonPackSchema`  [EXTRACTED]
  apps/player/src/pack.ts → packages/schema/src/pack.ts
- `PROGRESS.md Progress & Handoff` --references--> `PageBuddy PWA Entry (index.html)`  [INFERRED]
  PROGRESS.md → apps/player/index.html
- `ParentPage()` --references--> `ProgressExportSchema`  [EXTRACTED]
  apps/player/src/pages/ParentPage.tsx → packages/schema/src/progress.ts
- `recordAttempt()` --calls--> `newReview()`  [EXTRACTED]
  apps/player/src/progress.ts → packages/schema/src/leitner.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline-first Player Runtime** — apps_player_index_entry, apps_player_ios_app_capapp_spm_readme [INFERRED 0.85]

## Communities (23 total, 7 thin omitted)

### Community 0 - "App Shell & Pages"
Cohesion: 0.07
Nodes (53): App(), useHashRoute(), stopAll(), EndScreen(), Mascot(), db, SpikeRecord, activePack() (+45 more)

### Community 1 - "Extraction Pipeline"
Cohesion: 0.06
Nodes (51): ExerciseItemSchema, LessonPackSchema, ExerciseOnPageSchema, ExtractedSentenceSchema, ExtractedVocabSchema, GrammarPointSchema, PageExtract, PageExtractSchema (+43 more)

### Community 2 - "Exercise Components & Audio"
Cohesion: 0.14
Nodes (34): buffers, liveSources, playPackClip(), PlayResult, sfx, COLORS, popConfetti(), Cloze() (+26 more)

### Community 3 - "Player Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, canvas-confetti@^1.9.3, @capacitor/core@^8.6.0, @capacitor/ios@^8.6.0, dexie@^4.0.11, @fontsource/andika@5.3.0, framer-motion@^14.9.0, @pagebuddy/schema@workspace:* (+27 more)

### Community 4 - "iOS App Lifecycle"
Cohesion: 0.09
Nodes (4): AppDelegate, SceneDelegate, Capacitor, UIKit

### Community 5 - "Audio Engine & Device Spike"
Cohesion: 0.14
Nodes (20): decode(), getAudioContext(), playClip(), playClips(), preload(), tone(), unlockAudio(), DragTile() (+12 more)

### Community 6 - "Asset Generation Scripts"
Cohesion: 0.10
Nodes (11): JOBS, outDir, queue(), workflow(), icons, pub, spike, dst (+3 more)

### Community 7 - "Lesson Pack Schema"
Cohesion: 0.10
Nodes (19): ArabicHint, ArabicHintSchema, AudioRef, AudioRefSchema, ExerciseType, ExerciseTypeSchema, ImageRef, ImageRefSchema (+11 more)

### Community 8 - "Pipeline Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, @anthropic-ai/sdk@^0.65.0, commander@^14.0.1, dotenv@^17.2.2, @napi-rs/canvas@^0.1.78, @pagebuddy/schema@workspace:*, pdfjs-dist@^5.4.149, sharp@^0.34.3 (+11 more)

### Community 9 - "Session Builder"
Cohesion: 0.25
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

## Knowledge Gaps
- **3 isolated node(s):** `PackageDescription`, `PageBuddy PWA Entry (index.html)`, `CapApp-SPM Package README`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 204 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ExerciseItem` connect `Exercise Components & Audio` to `Session Builder`, `Extraction Pipeline`, `Lesson Pack Schema`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `PackageDescription`, `PageBuddy PWA Entry (index.html)`, `CapApp-SPM Package README` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07323943661971831 - nodes in this community are weakly interconnected._
- **Why does `LessonPack` connect `Exercise Components & Audio` to `App Shell & Pages`, `Session Builder`, `Extraction Pipeline`, `Lesson Pack Schema`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Extraction Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.06442307692307692 - nodes in this community are weakly interconnected._
- **Why does `playPackClip()` connect `Exercise Components & Audio` to `App Shell & Pages`, `Audio Engine & Device Spike`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Should `Exercise Components & Audio` be split into smaller, more focused modules?**
  _Cohesion score 0.13945578231292516 - nodes in this community are weakly interconnected._