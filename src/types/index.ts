export type AspectRatio = "9:16" | "16:9" | "1:1";
export type ExportQuality = "720p" | "1080p" | "4K";
export type ClipEffect = "none" | "boomerang" | "zoom_in" | "zoom_out";
export type TransitionType = "cut" | "fade" | "glitch";
export type EQStyle = "bars" | "wave" | "circle";

export interface AudioTrack {
  file: File;
  name: string;
  duration: number; // seconds
  bpm: number;
  beatMarkers: number[]; // array of timestamps in seconds
  waveformData: number[]; // amplitude per sample for waveform rendering
}

export interface VideoClip {
  id: string;
  file: File;
  name: string;
  duration: number; // seconds (5–10s ideal)
  thumbnailUrl: string; // object URL from first frame
  effect: ClipEffect;
  trimStart: number; // default 0
  trimEnd: number; // default = duration
}

export interface GlobalSettings {
  aspectRatio: AspectRatio;
  exportQuality: ExportQuality;
  transition: TransitionType;
  beatSyncCut: boolean; // cut clips on beat
  randomizeOrder: boolean; // randomize clip order on render
  visualEQ: boolean; // show EQ overlay on video
  eqStyle: EQStyle;
  eqPosition: "bottom" | "top" | "center";
  eqColor: string; // hex color
}

export interface RenderJob {
  status: "idle" | "processing" | "done" | "error";
  progress: number; // 0–100
  outputUrl: string | null;
  error: string | null;
}

export interface AssembledClip {
  clip: VideoClip;
  startTime: number;
  endTime: number;
  effect: ClipEffect;
}
