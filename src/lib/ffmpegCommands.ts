/**
 * FFmpeg Commands — Helper functions to generate FFmpeg filter strings
 * for effects, transitions, scaling, and final assembly.
 *
 * These are used by the FFmpeg Web Worker to construct the full render pipeline.
 */

import type {
  AssembledClip,
  AspectRatio,
  ExportQuality,
  TransitionType,
  ClipEffect,
} from "../types";

// === Resolution Map ===

interface Resolution {
  width: number;
  height: number;
}

export function getResolution(
  aspectRatio: AspectRatio,
  quality: ExportQuality
): Resolution {
  const resolutions: Record<AspectRatio, Record<ExportQuality, Resolution>> = {
    "9:16": {
      "720p": { width: 720, height: 1280 },
      "1080p": { width: 1080, height: 1920 },
      "4K": { width: 2160, height: 3840 },
    },
    "16:9": {
      "720p": { width: 1280, height: 720 },
      "1080p": { width: 1920, height: 1080 },
      "4K": { width: 3840, height: 2160 },
    },
    "1:1": {
      "720p": { width: 720, height: 720 },
      "1080p": { width: 1080, height: 1080 },
      "4K": { width: 2160, height: 2160 },
    },
  };

  return resolutions[aspectRatio][quality];
}

// === Effect Filters ===

/**
 * Generate FFmpeg video filter string for a given clip effect.
 */
export function getEffectFilter(
  effect: ClipEffect,
  durationFrames: number
): string {
  switch (effect) {
    case "zoom_in":
      return `zoompan=z='min(zoom+0.002,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${durationFrames}:s=1080x1920:fps=30`;

    case "zoom_out":
      return `zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.002))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${durationFrames}:s=1080x1920:fps=30`;

    case "boomerang":
      // Boomerang is handled specially (reverse + concat), return empty here
      return "";

    case "none":
    default:
      return "";
  }
}

/**
 * Check if a clip effect requires special multi-pass processing.
 */
export function isMultiPassEffect(effect: ClipEffect): boolean {
  return effect === "boomerang";
}

// === Transition Filters ===

/**
 * Generate FFmpeg filter for transition between clips.
 * Applied at the end of the outgoing clip and start of incoming clip.
 */
export function getTransitionFilter(
  transition: TransitionType,
  clipEndSec: number,
  transitionDuration: number = 0.3
): string {
  switch (transition) {
    case "fade":
      return `fade=t=out:st=${Math.max(0, clipEndSec - transitionDuration)}:d=${transitionDuration},fade=t=in:st=0:d=${transitionDuration}`;

    case "glitch":
      // Glitch effect using geq (color channel shift + noise)
      return `geq=r='r(X+random(1)*4,Y)':g='g(X,Y+random(1)*4)':b='b(X-random(1)*4,Y)',fade=t=out:st=${Math.max(0, clipEndSec - transitionDuration)}:d=${transitionDuration}`;

    case "cut":
    default:
      return "";
  }
}

// === Scale Filter ===

/**
 * Generate scale + pad filter to fit video into target aspect ratio.
 * Uses scale with force_original_aspect_ratio then pad to fill.
 */
export function getScaleFilter(
  aspectRatio: AspectRatio,
  quality: ExportQuality
): string {
  const { width, height } = getResolution(aspectRatio, quality);
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;
}

// === Trim Filter ===

/**
 * Generate trim filter for a clip segment.
 */
export function getTrimFilter(startSec: number, endSec: number): string {
  return `trim=start=${startSec.toFixed(3)}:end=${endSec.toFixed(3)},setpts=PTS-STARTPTS`;
}

// === Full Clip Processing Pipeline ===

/**
 * Generate complete filter chain for a single clip segment.
 */
export function getClipFilterChain(
  inputIndex: number,
  segment: AssembledClip,
  aspectRatio: AspectRatio,
  quality: ExportQuality,
  transition: TransitionType,
  fps: number = 30
): string {
  const filters: string[] = [];
  const segmentDuration = segment.endTime - segment.startTime;
  const durationFrames = Math.ceil(segmentDuration * fps);

  // 1. Trim to clip's trim points
  const clipOffset = segment.clip.trimStart;
  const clipEnd = Math.min(
    segment.clip.trimStart + segmentDuration,
    segment.clip.trimEnd
  );
  filters.push(getTrimFilter(clipOffset, clipEnd));

  // 2. Apply effect (if not boomerang — handled separately)
  if (segment.effect !== "none" && segment.effect !== "boomerang") {
    const effectFilter = getEffectFilter(segment.effect, durationFrames);
    if (effectFilter) filters.push(effectFilter);
  }

  // 3. Scale to target resolution
  filters.push(getScaleFilter(aspectRatio, quality));

  // 4. Set FPS
  filters.push(`fps=${fps}`);

  // 5. Apply transition
  if (transition !== "cut") {
    const transFilter = getTransitionFilter(transition, segmentDuration);
    if (transFilter) filters.push(transFilter);
  }

  return `[${inputIndex}:v]${filters.join(",")}[v${inputIndex}]`;
}

// === Concat Filter ===

/**
 * Generate the concat filter for multiple processed clip streams.
 */
export function getConcatFilter(numClips: number): string {
  const inputs = Array.from({ length: numClips }, (_, i) => `[v${i}]`).join("");
  return `${inputs}concat=n=${numClips}:v=1:a=0[outv]`;
}

// === Full Assembly Command Args ===

export interface FFmpegRenderArgs {
  filterComplex: string;
  outputArgs: string[];
}

/**
 * Generate the complete FFmpeg filter_complex and output arguments
 * for the final render.
 */
export function generateRenderCommand(
  segments: AssembledClip[],
  aspectRatio: AspectRatio,
  quality: ExportQuality,
  transition: TransitionType,
  fps: number = 30
): FFmpegRenderArgs {
  if (segments.length === 0) {
    return { filterComplex: "", outputArgs: [] };
  }

  // Build filter chains for each segment
  const filterLines: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const chain = getClipFilterChain(
      i,
      segments[i],
      aspectRatio,
      quality,
      transition,
      fps
    );
    filterLines.push(chain);
  }

  // Add concat
  filterLines.push(getConcatFilter(segments.length));

  const filterComplex = filterLines.join(";\n");

  // Output encoding args
  const { width, height } = getResolution(aspectRatio, quality);
  const crf = quality === "4K" ? "20" : quality === "1080p" ? "23" : "26";

  const outputArgs = [
    "-map",
    "[outv]",
    "-map",
    `${segments.length}:a`, // audio is the last input
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    crf,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-s",
    `${width}x${height}`,
    "-shortest",
    "-movflags",
    "+faststart",
    "output.mp4",
  ];

  return { filterComplex, outputArgs };
}

// === Boomerang Helper ===

/**
 * Generate the filter for boomerang effect (forward + reverse).
 * This requires a special two-pass approach:
 * 1. Process the clip normally
 * 2. Reverse it
 * 3. Concat original + reversed
 */
export function getBoomerangFilter(inputIndex: number): string {
  return [
    `[${inputIndex}:v]split[bfwd${inputIndex}][brev${inputIndex}]`,
    `[brev${inputIndex}]reverse[brevd${inputIndex}]`,
    `[bfwd${inputIndex}][brevd${inputIndex}]concat=n=2:v=1:a=0[boom${inputIndex}]`,
  ].join(";\n");
}

// === Utility ===

/**
 * Estimate render time based on total duration and quality.
 * Returns estimated seconds.
 */
export function estimateRenderTime(
  totalDurationSec: number,
  quality: ExportQuality,
  numSegments: number
): number {
  // Rough estimates based on browser FFmpeg.wasm performance
  const baseMultiplier =
    quality === "4K" ? 8 : quality === "1080p" ? 3 : 1.5;

  const segmentOverhead = numSegments * 0.5; // ~0.5s per segment for processing
  const encodingTime = totalDurationSec * baseMultiplier;

  return Math.ceil(encodingTime + segmentOverhead);
}

/**
 * Format an estimated time in seconds to human-readable string.
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `~${min}m ${sec}s`;
}
