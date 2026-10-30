import { z } from "zod";

// Local progress DB row shapes (plan §9.2). The Dexie tables store these.

export const ReviewSchema = z.object({
  itemId: z.string(),
  packId: z.string(),
  box: z.number().int().min(1).max(6),
  nextDue: z.number(),
  streak: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  lastSeen: z.number(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const AttemptSchema = z.object({
  id: z.string().optional(),
  itemId: z.string(),
  exerciseType: z.string(),
  correct: z.boolean(),
  ms: z.number(),
  ts: z.number(),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const DailySchema = z.object({
  date: z.string(), // YYYY-MM-DD local
  minutes: z.number(),
  itemsPracticed: z.number().int(),
  accuracy: z.number(),
  stars: z.number().int(),
});
export type Daily = z.infer<typeof DailySchema>;

export const PackRecordSchema = z.object({
  packId: z.string(),
  version: z.number().int(),
  importedAt: z.number(),
});
export type PackRecord = z.infer<typeof PackRecordSchema>;

export const SettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});
export type Setting = z.infer<typeof SettingSchema>;

// Progress export file shape (parent area, plan §7.6 / §11 backups).
export const ProgressExportSchema = z.object({
  app: z.literal("pagebuddy"),
  formatVersion: z.literal(1),
  exportedAt: z.number(),
  packs: z.array(PackRecordSchema),
  review: z.array(ReviewSchema),
  daily: z.array(DailySchema),
  settings: z.record(z.string(), z.unknown()),
});
export type ProgressExport = z.infer<typeof ProgressExportSchema>;
