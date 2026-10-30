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
