/**
 * Clip Assembler — Logic for ordering clips and beat-sync cutting.
 *
 * Input:  clips[], beatMarkers[], settings
 * Output: AssembledClip[] — array with { clip, startTime, endTime, effect }
 */

import type {
  VideoClip,
  GlobalSettings,
  AssembledClip,
  ClipEffect,
} from "../types";

interface AssembleOptions {
  clips: VideoClip[];
  beatMarkers: number[];
  audioDuration: number;
  settings: GlobalSettings;
}

/**
 * Assemble clips into a final ordered sequence with timing.
 */
export function assembleClips({
  clips,
  beatMarkers,
  audioDuration,
  settings,
}: AssembleOptions): AssembledClip[] {
  if (clips.length === 0 || audioDuration <= 0) return [];

  // Step 1: Optionally shuffle clips
  let orderedClips = [...clips];
  if (settings.randomizeOrder) {
    orderedClips = shuffleArray(orderedClips);
  }

  // Step 2: Assemble based on beatSyncCut or sequential mode
  if (settings.beatSyncCut && beatMarkers.length > 1) {
    return assembleBeatSync(orderedClips, beatMarkers, audioDuration);
  } else {
    return assembleSequential(orderedClips, audioDuration);
  }
}

/**
 * Beat-Synced assembly:
 * Each clip segment fills one beat interval.
 * Clips loop back to the beginning if there are more beats than clips.
 */
function assembleBeatSync(
  clips: VideoClip[],
  beatMarkers: number[],
  audioDuration: number
): AssembledClip[] {
  const assembled: AssembledClip[] = [];

  // Ensure beat markers are sorted
  const sortedMarkers = [...beatMarkers].sort((a, b) => a - b);

  // If first beat is not at 0, add a segment from 0 to first beat
  const markers =
    sortedMarkers[0] > 0.05 ? [0, ...sortedMarkers] : [...sortedMarkers];

  // Add end marker if last beat doesn't reach audio end
  const lastMarker = markers[markers.length - 1];
  if (audioDuration - lastMarker > 0.1) {
    markers.push(audioDuration);
  }

  let clipIdx = 0;

  for (let i = 0; i < markers.length - 1; i++) {
    const startTime = markers[i];
    const endTime = markers[i + 1];

    // Skip very short segments (< 50ms)
    if (endTime - startTime < 0.05) continue;

    const clip = clips[clipIdx % clips.length];

    assembled.push({
      clip,
      startTime,
      endTime,
      effect: clip.effect,
    });

    clipIdx++;
  }

  return assembled;
}

/**
 * Sequential assembly:
 * Clips are laid end-to-end based on their trimmed duration.
 * Loops back to beginning if audio is longer than total clip duration.
 */
function assembleSequential(
  clips: VideoClip[],
  audioDuration: number
): AssembledClip[] {
  const assembled: AssembledClip[] = [];

  let currentTime = 0;
  let clipIdx = 0;
  const maxIterations = 1000; // safety limit
  let iterations = 0;

  while (currentTime < audioDuration && iterations < maxIterations) {
    const clip = clips[clipIdx % clips.length];
    const clipDuration = getClipDuration(clip);

    // Skip clips with zero or negative duration
    if (clipDuration <= 0) {
      clipIdx++;
      iterations++;
      continue;
    }

    const endTime = Math.min(currentTime + clipDuration, audioDuration);

    assembled.push({
      clip,
      startTime: currentTime,
      endTime,
      effect: clip.effect,
    });

    currentTime = endTime;
    clipIdx++;
    iterations++;
  }

  return assembled;
}

/**
 * Get the effective duration of a clip (considering trim points).
 */
function getClipDuration(clip: VideoClip): number {
  return clip.trimEnd - clip.trimStart;
}

/**
 * Fisher-Yates shuffle (non-mutating).
 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate the total render duration based on assembled clips.
 */
export function getTotalAssembledDuration(assembled: AssembledClip[]): number {
  if (assembled.length === 0) return 0;
  return assembled[assembled.length - 1].endTime;
}

/**
 * Get the active clip at a given timestamp.
 */
export function getClipAtTime(
  assembled: AssembledClip[],
  timeSec: number
): AssembledClip | null {
  return (
    assembled.find(
      (seg) => timeSec >= seg.startTime && timeSec < seg.endTime
    ) ?? null
  );
}

/**
 * Get the time offset within a clip for a given global timestamp.
 * Used to seek the video to the correct position.
 */
export function getClipOffset(segment: AssembledClip, globalTime: number): number {
  const offsetInSegment = globalTime - segment.startTime;
  return segment.clip.trimStart + offsetInSegment;
}

/**
 * Generate a summary of the assembly for debugging/display.
 */
export function getAssemblySummary(assembled: AssembledClip[]): {
  totalSegments: number;
  totalDuration: number;
  uniqueClips: number;
  effects: Record<ClipEffect, number>;
} {
  const uniqueIds = new Set(assembled.map((a) => a.clip.id));
  const effects: Record<ClipEffect, number> = {
    none: 0,
    boomerang: 0,
    zoom_in: 0,
    zoom_out: 0,
  };

  for (const seg of assembled) {
    effects[seg.effect]++;
  }

  return {
    totalSegments: assembled.length,
    totalDuration: getTotalAssembledDuration(assembled),
    uniqueClips: uniqueIds.size,
    effects,
  };
}
