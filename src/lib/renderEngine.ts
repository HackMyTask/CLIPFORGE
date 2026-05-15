/**
 * Render Engine — Main thread interface for the FFmpeg Web Worker.
 *
 * Handles:
 * - Spawning the worker
 * - Preparing file data (clips + audio → ArrayBuffers)
 * - Sending render jobs
 * - Receiving progress/done/error messages
 * - Generating download URL for the output
 */

import type { AssembledClip, GlobalSettings, AudioTrack } from "../types";
import { generateRenderCommand } from "./ffmpegCommands";
import { useClipForgeStore } from "../store/useClipForgeStore";

// Worker message types (duplicated from worker for type safety)
interface RenderSegment {
  clipFileName: string;
  clipData: ArrayBuffer;
  trimStart: number;
  trimEnd: number;
  effect: string;
  segmentIndex: number;
}

interface RenderPayload {
  segments: RenderSegment[];
  audioFileName: string;
  audioData: ArrayBuffer;
  filterComplex: string;
  outputArgs: string[];
  totalSegments: number;
}

let worker: Worker | null = null;

/**
 * Get or create the FFmpeg worker instance.
 */
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("../workers/ffmpeg.worker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

/**
 * Terminate the worker (used for cancel or cleanup).
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

/**
 * Start a render job.
 *
 * This will:
 * 1. Read all clip files into ArrayBuffers
 * 2. Read the audio file into an ArrayBuffer
 * 3. Generate FFmpeg filter_complex string
 * 4. Send everything to the worker
 * 5. Listen for progress/done/error
 */
export async function startRender(
  assembledClips: AssembledClip[],
  audio: AudioTrack,
  settings: GlobalSettings
): Promise<void> {
  const { setRenderJob } = useClipForgeStore.getState();

  if (assembledClips.length === 0) {
    setRenderJob({ status: "error", error: "No clips to render.", progress: 0 });
    return;
  }

  setRenderJob({ status: "processing", progress: 0, error: null, outputUrl: null });

  try {
    // Prepare segments: deduplicate files (same clip may appear multiple times)
    const uniqueClipFiles = new Map<string, File>();
    for (const seg of assembledClips) {
      if (!uniqueClipFiles.has(seg.clip.id)) {
        uniqueClipFiles.set(seg.clip.id, seg.clip.file);
      }
    }

    // Read unique clip files into ArrayBuffers
    const clipBuffers = new Map<string, ArrayBuffer>();
    for (const [id, file] of uniqueClipFiles) {
      const buffer = await file.arrayBuffer();
      clipBuffers.set(id, buffer);
    }

    // Build render segments (each assembled clip becomes a segment with its file data)
    const segments: RenderSegment[] = assembledClips.map((seg, idx) => {
      const ext = seg.clip.name.split(".").pop() || "mp4";
      return {
        clipFileName: `clip_${idx}.${ext}`,
        clipData: clipBuffers.get(seg.clip.id)!,
        trimStart: seg.clip.trimStart,
        trimEnd: seg.clip.trimEnd,
        effect: seg.effect,
        segmentIndex: idx,
      };
    });

    // Read audio file
    const audioData = await audio.file.arrayBuffer();
    const audioExt = audio.name.split(".").pop() || "mp3";
    const audioFileName = `audio.${audioExt}`;

    // Generate FFmpeg command
    const { filterComplex, outputArgs } = generateRenderCommand(
      assembledClips,
      settings.aspectRatio,
      settings.exportQuality,
      settings.transition
    );

    // Build payload
    const payload: RenderPayload = {
      segments,
      audioFileName,
      audioData,
      filterComplex,
      outputArgs,
      totalSegments: segments.length,
    };

    // Get worker and set up listeners
    const w = getWorker();

    w.onmessage = (event) => {
      const { type, payload: msgPayload } = event.data;

      switch (type) {
        case "progress":
          setRenderJob({
            status: "processing",
            progress: msgPayload.percent,
          });
          break;

        case "done": {
          // Create a downloadable blob URL
          const blob = new Blob([msgPayload.outputData], {
            type: "video/mp4",
          });
          const outputUrl = URL.createObjectURL(blob);
          setRenderJob({
            status: "done",
            progress: 100,
            outputUrl,
          });
          break;
        }

        case "error":
          setRenderJob({
            status: "error",
            error: msgPayload.message,
            progress: 0,
          });
          break;

        case "log":
          // Optional: store logs for debugging
          console.debug("[FFmpeg]", msgPayload.message);
          break;
      }
    };

    w.onerror = (err) => {
      setRenderJob({
        status: "error",
        error: `Worker error: ${err.message}`,
        progress: 0,
      });
    };

    // Send render command to worker (transfer ArrayBuffers for performance)
    const transferables = [
      audioData,
      ...segments.map((s) => s.clipData),
    ];

    w.postMessage({ type: "render", payload }, transferables);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    setRenderJob({ status: "error", error: message, progress: 0 });
  }
}

/**
 * Cancel an in-progress render.
 */
export function cancelRender() {
  const { setRenderJob } = useClipForgeStore.getState();

  if (worker) {
    worker.postMessage({ type: "cancel" });
  }

  // Also terminate and recreate worker as fallback
  terminateWorker();

  setRenderJob({
    status: "idle",
    progress: 0,
    error: null,
    outputUrl: null,
  });
}

/**
 * Download the rendered output.
 */
export function downloadOutput(url: string, filename: string = "clipforge_output.mp4") {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
