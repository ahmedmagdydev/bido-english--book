---
type: community
cohesion: 0.10
members: 20
---

# Lesson Pack Schema

**Cohesion:** 0.10 - loosely connected
**Members:** 20 nodes

## Members
- [[ArabicHint]] - code - packages/schema/src/pack.ts
- [[ArabicHintSchema]] - code - packages/schema/src/pack.ts
- [[AudioRef]] - code - packages/schema/src/pack.ts
- [[AudioRefSchema]] - code - packages/schema/src/pack.ts
- [[ExerciseType]] - code - packages/schema/src/pack.ts
- [[ExerciseTypeSchema]] - code - packages/schema/src/pack.ts
- [[ImageRef]] - code - packages/schema/src/pack.ts
- [[ImageRefSchema]] - code - packages/schema/src/pack.ts
- [[Lesson]] - code - packages/schema/src/pack.ts
- [[LessonSchema]] - code - packages/schema/src/pack.ts
- [[PageRef]] - code - packages/schema/src/pack.ts
- [[PageRefSchema]] - code - packages/schema/src/pack.ts
- [[Pos]] - code - packages/schema/src/pack.ts
- [[PosSchema]] - code - packages/schema/src/pack.ts
- [[Provenance]] - code - packages/schema/src/pack.ts
- [[ProvenanceSchema]] - code - packages/schema/src/pack.ts
- [[SentenceItemSchema]] - code - packages/schema/src/pack.ts
- [[VocabItem]] - code - packages/schema/src/pack.ts
- [[VocabItemSchema]] - code - packages/schema/src/pack.ts
- [[schemasrcpack.ts]] - code - packages/schema/src/pack.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Lesson_Pack_Schema
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Exercise Components & Audio]]
- 3 edges to [[_COMMUNITY_Extraction Pipeline]]
- 2 edges to [[_COMMUNITY_Session Builder]]
- 1 edge to [[_COMMUNITY_App Shell & Pages]]

## Top bridge nodes
- [[schemasrcpack.ts]] - degree 25, connects to 3 communities
- [[VocabItem]] - degree 4, connects to 3 communities
- [[ExerciseType]] - degree 3, connects to 2 communities