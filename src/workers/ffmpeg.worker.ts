/**
 * FFmpeg Web Worker — Runs FFmpeg.wasm in a separate thread
 * so the main UI thread stays responsive during rendering.
 *
 * Communication via postMessage:
 *   Main → Worker: { type: "render", payload: RenderPayload }
 *   Worker → Main: { type: "progress" | "done" | "error", payload: ... }
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// Types for worker messages
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

type IncomingMessage =
  | { type: "render"; payload: RenderPayload }
  | { type: "cancel" };

type OutgoingMessage =
  | { type: "progress"; payload: { percent: number; message: string } }
  | { type: "done"; payload: { outputData: ArrayBuffer } }
  | { type: "error"; payload: { message: string } }
  | { type: "log"; payload: { message: string } };

let ffmpeg: FFmpeg | null = null;
let isRunning = false;

/**
 * Initialize FFmpeg instance.
 */
async function initFFmpeg(onProgress: (percent: number, msg: string) => void) {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    self.postMessage({
      type: "log",
      payload: { message },
    } satisfies OutgoingMessage);
  });

  ffmpeg.on("progress", ({ progress, time }) => {
    const percent = Math.min(Math.round(progress * 100), 99);
    onProgress(percent, `Encoding... ${percent}% (${(time / 1000000).toFixed(1)}s)`);
  });

  // Load FFmpeg core from CDN (or from public/ if available)
  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
  });

  return ffmpeg;
}

/**
 * Send progress update to main thread.
 */
function sendProgress(percent: number, message: string) {
  self.postMessage({
    type: "progress",
    payload: { percent, message },
  } satisfies OutgoingMessage);
}

/**
 * Send error to main thread.
 */
function sendError(message: string) {
  self.postMessage({
    type: "error",
    payload: { message },
  } satisfies OutgoingMessage);
}

/**
 * Send completed result to main thread.
 */
function sendDone(outputData: ArrayBuffer) {
  self.postMessage({
    type: "done",
    payload: { outputData },
  } satisfies OutgoingMessage);
}

/**
 * Main render pipeline.
 */
async function handleRender(payload: RenderPayload) {
  if (isRunning) {
    sendError("A render job is already in progress.");
    return;
  }

  isRunning = true;

  try {
    sendProgress(0, "Initializing FFmpeg...");

    const ff = await initFFmpeg(sendProgress);

    sendProgress(5, "Writing input files...");

    // Write audio file to FFmpeg virtual filesystem
    await ff.writeFile(
      payload.audioFileName,
      await fetchFile(new Blob([payload.audioData]))
    );

    // Write each video segment to FFmpeg virtual filesystem
    for (let i = 0; i < payload.segments.length; i++) {
      const seg = payload.segments[i];
      const percent = 5 + Math.round((i / payload.segments.length) * 20);
      sendProgress(percent, `Loading clip ${i + 1}/${payload.segments.length}...`);

      await ff.writeFile(
        seg.clipFileName,
        await fetchFile(new Blob([seg.clipData]))
      );
    }

    sendProgress(25, "Building render pipeline...");

    // Build FFmpeg command arguments
    const args: string[] = [];

    // Input files: clips first, then audio
    for (const seg of payload.segments) {
      args.push("-i", seg.clipFileName);
    }
    args.push("-i", payload.audioFileName);

    // Filter complex
    if (payload.filterComplex) {
      args.push("-filter_complex", payload.filterComplex);
    }

    // Output args
    args.push(...payload.outputArgs);

    sendProgress(30, "Rendering video...");

    // Execute FFmpeg
    await ff.exec(args);

    sendProgress(95, "Reading output...");

    // Read output file
    const outputData = await ff.readFile("output.mp4");

    // Convert to ArrayBuffer
    const buffer =
      outputData instanceof Uint8Array
        ? outputData.buffer
        : new TextEncoder().encode(outputData as string).buffer;

    sendProgress(100, "Done!");
    sendDone(buffer as ArrayBuffer);

    // Cleanup files from virtual filesystem
    try {
      for (const seg of payload.segments) {
        await ff.deleteFile(seg.clipFileName);
      }
      await ff.deleteFile(payload.audioFileName);
      await ff.deleteFile("output.mp4");
    } catch {
      // Cleanup errors are non-critical
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown render error";
    sendError(message);
  } finally {
    isRunning = false;
  }
}

// === Worker Message Handler ===

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const { type } = event.data;

  switch (type) {
    case "render":
      await handleRender(event.data.payload);
      break;

    case "cancel":
      // FFmpeg.wasm doesn't support graceful cancel easily
      // but we can flag it
      if (ffmpeg && isRunning) {
        try {
          ffmpeg.terminate();
          ffmpeg = null;
          isRunning = false;
          sendError("Render cancelled by user.");
        } catch {
          sendError("Failed to cancel render.");
        }
      }
      break;

    default:
      sendError(`Unknown message type: ${type}`);
  }
};
