import { create } from "zustand";
import type { LessonPack } from "@pagebuddy/schema";
import { activePack } from "./pack";

interface AppState {
  pack: LessonPack | null;
  audioUnlocked: boolean;
  setAudioUnlocked: () => void;
  loadPack: () => Promise<LessonPack>;
}

export const useApp = create<AppState>((set, get) => ({
  pack: null,
  audioUnlocked: false,
  setAudioUnlocked: () => set({ audioUnlocked: true }),
  loadPack: async () => {
    const cur = get().pack;
    if (cur) return cur;
    const pack = await activePack();
    set({ pack });
    return pack;
  },
}));
