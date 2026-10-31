import {
  LessonPackSchema,
  type LessonPack,
  type PackLang,
} from "@pagebuddy/schema";
import { db } from "./db";

const cache = new Map<string, LessonPack>();
let activePackId: string | null = null;

export interface PackMeta {
  id: string;
  title: string;
  language: PackLang;
  dir: "ltr" | "rtl";
}

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

// Pack index metadata — lets the language gate/world picker work without
// fetching every pack.json. Older index.json files lack `meta` → assume en.
export async function listPackMeta(): Promise<PackMeta[]> {
  try {
    const res = await fetch("packs/index.json");
    const idx = (await res.json()) as {
      packs: string[];
      meta?: PackMeta[];
    };
    if (idx.meta?.length) return idx.meta;
    return idx.packs.map((id) => ({
      id,
      title: id,
      language: "en" as PackLang,
      dir: "ltr" as const,
    }));
  } catch {
    return [];
  }
}

// The "world" the kid is in — drives which packs/stats/chrome are shown.
export async function getActiveLang(): Promise<PackLang | null> {
  const s = await db.settings.get("activeLang");
  return (s?.value as PackLang) ?? null;
}

export async function setActiveLang(lang: PackLang): Promise<void> {
  await db.settings.put({ key: "activeLang", value: lang });
  // jump to that world's most recent pack if we have one, else its first
  const metas = await listPackMeta();
  const first = metas.find((m) => m.language === lang);
  const cur = await db.settings.get("activePack");
  const curInLang = metas.find((m) => m.id === cur?.value && m.language === lang);
  if (first && !curInLang) await setActivePack(first.id);
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
