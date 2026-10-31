import { z } from "zod";

export const ProvenanceSchema = z.enum(["book", "generated"]);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const PosSchema = z.enum(["noun", "verb", "adj", "adv", "prep", "other"]);
export type Pos = z.infer<typeof PosSchema>;

export const AudioRefSchema = z.object({
  normal: z.string(),
  slow: z.string().optional(),
});
export type AudioRef = z.infer<typeof AudioRefSchema>;

export const ImageRefSchema = z.object({
  src: z.string(),
  source: z.enum(["book", "open", "own"]),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

export const ArabicHintSchema = z.object({
  text: z.string(),
  audio: z.string().optional(),
});
export type ArabicHint = z.infer<typeof ArabicHintSchema>;

export const VocabItemSchema = z.object({
  id: z.string(),
  word: z.string(),
  pos: PosSchema.optional(),
  example: z.string().optional(),
  tags: z.array(z.string()),
  image: ImageRefSchema.optional(),
  audio: AudioRefSchema,
  arabicHint: ArabicHintSchema.optional(),
  sourcePage: z.number().int().optional(),
  provenance: ProvenanceSchema,
});
export type VocabItem = z.infer<typeof VocabItemSchema>;

export const SentenceItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  speaker: z.string().optional(),
  audio: AudioRefSchema,
  sourcePage: z.number().int().optional(),
  provenance: ProvenanceSchema,
});
export type SentenceItem = z.infer<typeof SentenceItemSchema>;

export const ExerciseTypeSchema = z.enum([
  "listenPick",
  "cloze",
  "sentenceBuilder",
  "spellingTiles",
  "matchPairs",
  "oddOneOut",
  "trueFalse",
  "minimalPair",
  "dictation",
  "trace",
  "comprehension",
]);
export type ExerciseType = z.infer<typeof ExerciseTypeSchema>;

export const ExerciseItemSchema = z.object({
  id: z.string(),
  type: ExerciseTypeSchema,
  refs: z.array(z.string()),
  payload: z.record(z.string(), z.unknown()),
  approved: z.boolean(),
});
export type ExerciseItem = z.infer<typeof ExerciseItemSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  pageStart: z.number().int().optional(),
  pageEnd: z.number().int().optional(),
  vocabIds: z.array(z.string()),
  sentenceIds: z.array(z.string()),
  exerciseIds: z.array(z.string()),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const PageRefSchema = z.object({
  page: z.number().int(),
  image: z.string(),
  lessonId: z.string().optional(),
});
export type PageRef = z.infer<typeof PageRefSchema>;

export const LessonPackSchema = z.object({
  packId: z.string(),
  version: z.number().int(),
  title: z.string(),
  language: z.enum(["en", "ar"]).default("en"),
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
  lessons: z.array(LessonSchema),
  vocab: z.array(VocabItemSchema),
  sentences: z.array(SentenceItemSchema),
  exercises: z.array(ExerciseItemSchema),
  pages: z.array(PageRefSchema).optional(),
});
export type LessonPack = z.infer<typeof LessonPackSchema>;
