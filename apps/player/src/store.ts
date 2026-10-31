import { create } from "zustand";
import type { LessonPack, PackLang } from "@pagebuddy/schema";
import { activePack, setActiveLang } from "./pack";

interface AppState {
  pack: LessonPack | null;
  audioUnlocked: boolean;
  setAudioUnlocked: () => void;
  loadPack: () => Promise<LessonPack>;
  switchLang: (lang: PackLang) => Promise<LessonPack>;
}

export const useApp = create<AppState>((set, get) => ({
  pack: null,
  audioUnlocked: false,
  setAudioUnlocked: () => set({ audioUnlocked: true }),
  loadPack: async () => {
    const cur = get().pack;
    if (cur) return cur;
    const pack = await activePack();
    // the whole app follows the pack's language/direction (ar packs → RTL)
    document.documentElement.dir = pack.dir;
    document.documentElement.lang = pack.language;
    set({ pack });
    return pack;
  },
  switchLang: async (lang) => {
    await setActiveLang(lang);
    // drop the cached pack so loadPack resolves the new world's active pack
    set({ pack: null });
    return get().loadPack();
  },
}));
