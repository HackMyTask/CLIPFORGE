import { create } from "zustand";
import type {
  AudioTrack,
  VideoClip,
  GlobalSettings,
  RenderJob,
} from "../types";

interface ClipForgeStore {
  audio: AudioTrack | null;
  clips: VideoClip[];
  settings: GlobalSettings;
  renderJob: RenderJob;
  playheadSec: number;
  isPlaying: boolean;

  // Actions
  setAudio: (audio: AudioTrack) => void;
  clearAudio: () => void;
  addClips: (clips: VideoClip[]) => void;
  removeClip: (id: string) => void;
  reorderClips: (fromIdx: number, toIdx: number) => void;
  updateClip: (id: string, patch: Partial<VideoClip>) => void;
  updateSettings: (patch: Partial<GlobalSettings>) => void;
  setPlayhead: (sec: number) => void;
  setPlaying: (v: boolean) => void;
  setRenderJob: (patch: Partial<RenderJob>) => void;
  resetRenderJob: () => void;
}

const defaultSettings: GlobalSettings = {
  aspectRatio: "9:16",
  exportQuality: "1080p",
  transition: "cut",
  beatSyncCut: true,
  randomizeOrder: false,
  visualEQ: false,
  eqStyle: "bars",
  eqPosition: "bottom",
  eqColor: "#e8ff47",
};

const defaultRenderJob: RenderJob = {
  status: "idle",
  progress: 0,
  outputUrl: null,
  error: null,
};

export const useClipForgeStore = create<ClipForgeStore>((set) => ({
  audio: null,
  clips: [],
  settings: defaultSettings,
  renderJob: defaultRenderJob,
  playheadSec: 0,
  isPlaying: false,

  setAudio: (audio) => set({ audio }),

  clearAudio: () => set({ audio: null }),

  addClips: (newClips) =>
    set((state) => ({ clips: [...state.clips, ...newClips] })),

  removeClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
    })),

  reorderClips: (fromIdx, toIdx) =>
    set((state) => {
      const clips = [...state.clips];
      const [moved] = clips.splice(fromIdx, 1);
      clips.splice(toIdx, 0, moved);
      return { clips };
    }),

  updateClip: (id, patch) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  updateSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch },
    })),

  setPlayhead: (sec) => set({ playheadSec: sec }),

  setPlaying: (v) => set({ isPlaying: v }),

  setRenderJob: (patch) =>
    set((state) => ({
      renderJob: { ...state.renderJob, ...patch },
    })),

  resetRenderJob: () => set({ renderJob: defaultRenderJob }),
}));
