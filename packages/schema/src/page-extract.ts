import { z } from "zod";

// Matches the extraction prompt contract in plan Appendix B exactly.
export const PageTypeSchema = z.enum([
  "vocabulary",
  "dialogue",
  "reading",
  "grammar",
  "exercise",
  "song",
  "mixed",
]);

const pictureBox = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .nullable();

export const ExtractedVocabSchema = z.object({
  word: z.string(),
  pos: z.string().nullable(),
  example: z.string().nullable(),
  hasPicture: z.boolean(),
  pictureBox,
});

export const ExtractedSentenceSchema = z.object({
  text: z.string(),
  speaker: z.string().nullable(),
});

export const GrammarPointSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  examples: z.array(z.string()),
});

export const ExerciseOnPageSchema = z.object({
  instruction: z.string(),
  kind: z.string(),
  items: z.array(z.string()),
});

export const UncertainItemSchema = z.object({
  text: z.string(),
  reason: z.string(),
});

export const PageExtractSchema = z.object({
  pageNumber: z.number().int().nullable(),
  lessonTitle: z.string().nullable(),
  pageType: PageTypeSchema,
  vocab: z.array(ExtractedVocabSchema),
  sentences: z.array(ExtractedSentenceSchema),
  grammarPoints: z.array(GrammarPointSchema),
  exercisesOnPage: z.array(ExerciseOnPageSchema),
  uncertain: z.array(UncertainItemSchema),
});
export type PageExtract = z.infer<typeof PageExtractSchema>;

// Review layer: the review tool wraps the raw extract with status metadata.
export const PageStatusSchema = z.enum(["raw", "needs_review", "approved"]);
export type PageStatus = z.infer<typeof PageStatusSchema>;

export const ReviewedPageSchema = z.object({
  status: PageStatusSchema,
  extract: PageExtractSchema,
  // Illustration crops chosen in the review tool (fractions of image size).
  crops: z
    .array(
      z.object({
        id: z.string(),
        box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
        forWord: z.string().optional(),
      }),
    )
    .default([]),
  notes: z.string().optional(),
});
export type ReviewedPage = z.infer<typeof ReviewedPageSchema>;
