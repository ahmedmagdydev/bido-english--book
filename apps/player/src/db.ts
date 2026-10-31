import Dexie, { type EntityTable } from "dexie";
import type {
  Attempt,
  Daily,
  PackRecord,
  Review,
  Setting,
} from "@pagebuddy/schema";

interface SpikeRecord {
  id: string;
  ts: number;
}

export const db = new Dexie("pagebuddy") as Dexie & {
  packs: EntityTable<PackRecord, "packId">;
  review: EntityTable<Review, "itemId">;
  attempts: EntityTable<Attempt, "id">;
  daily: EntityTable<Daily, "date">;
  settings: EntityTable<Setting, "key">;
  spike: EntityTable<SpikeRecord, "id">;
};

db.version(1).stores({
  packs: "packId",
  review: "itemId, packId, nextDue",
  attempts: "++id, itemId, ts",
  daily: "date",
  settings: "key",
  spike: "id",
});

// v2: two "worlds" (en/ar) share the DB without sharing progress.
// - review PK → [packId+itemId]: sentence ids like "s_001" repeat across
//   packs and must not share Leitner state.
// - attempts gain packId+lang so stats/labels stay attributable.
// - daily PK → [date+lang]: stars/minutes/streak are per-language.
db.version(2)
  .stores({
    packs: "packId",
    review: "[packId+itemId], packId, nextDue",
    attempts: "++id, itemId, ts, packId",
    daily: "[date+lang], date",
    settings: "key",
    spike: "id",
  })
  .upgrade(async (tx) => {
    // all pre-v2 data was English — default the new fields to en
    await tx
      .table("attempts")
      .toCollection()
      .modify((a) => {
        a.packId ??= "";
        a.lang ??= "en";
      });
    await tx
      .table("daily")
      .toCollection()
      .modify((d) => {
        d.lang ??= "en";
      });
  });
