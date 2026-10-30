import { LessonPackSchema, type LessonPack } from "@pagebuddy/schema";
import { db } from "./db";

const cache = new Map<string, LessonPack>();
let activePackId: string | null = null;

export async function listPacks(): Promise<string[]> {
  try {
    const res = await fetch("packs/index.json");
    // capacitor:// may report status 0 for valid files — parse instead of
    // trusting .ok; zod validation downstream catches real badness
    const idx = (await res.json()) as { packs: string[] };
    return idx.packs;
  } catch {
    return [];
  }
}

export async function loadPack(packId: string): Promise<LessonPack> {
  const hit = cache.get(packId);
  if (hit) return hit;
  const res = await fetch(`packs/${packId}/pack.json`);
  const pack = LessonPackSchema.parse(await res.json());
  cache.set(packId, pack);
  await db.packs.put({ packId, version: pack.version, importedAt: Date.now() });
  return pack;
}

export async function activePack(): Promise<LessonPack> {
  if (activePackId) return loadPack(activePackId);
  const setting = await db.settings.get("activePack");
  if (setting?.value) activePackId = setting.value as string;
  if (!activePackId) {
    const ids = await listPacks();
    if (!ids.length) throw new Error("no packs available");
    activePackId = ids[0];
  }
  return loadPack(activePackId);
}

export async function setActivePack(packId: string): Promise<void> {
  activePackId = packId;
  await db.settings.put({ key: "activePack", value: packId });
}

// Resolve a pack-relative asset path ("audio/x.wav", "images/pages/p.jpg")
export function packUrl(packId: string, rel: string): string {
  return `packs/${packId}/${rel}`;
}
