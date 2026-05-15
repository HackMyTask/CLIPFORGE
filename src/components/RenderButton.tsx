import { useCallback, useMemo } from "react";
import { useClipForgeStore } from "../store/useClipForgeStore";
import { assembleClips } from "../lib/clipAssembler";
import { startRender, cancelRender, downloadOutput } from "../lib/renderEngine";
import { estimateRenderTime, formatEstimatedTime } from "../lib/ffmpegCommands";

export default function RenderButton() {
  const { audio, clips, settings, renderJob, resetRenderJob } =
    useClipForgeStore();

  const canRender = audio !== null && clips.length > 0;
  const isProcessing = renderJob.status === "processing";
  const isDone = renderJob.status === "done";
  const isError = renderJob.status === "error";

  // Calculate estimated render time
  const estimatedTime = useMemo(() => {
    if (!audio || clips.length === 0) return null;
    const assembled = assembleClips({
      clips,
      beatMarkers: audio.beatMarkers,
      audioDuration: audio.duration,
      settings,
    });
    const seconds = estimateRenderTime(
      audio.duration,
      settings.exportQuality,
      assembled.length
    );
    return formatEstimatedTime(seconds);
  }, [audio, clips, settings]);

  const handleRender = useCallback(() => {
    if (!audio || clips.length === 0) return;

    const assembled = assembleClips({
      clips,
      beatMarkers: audio.beatMarkers,
      audioDuration: audio.duration,
      settings,
    });

    startRender(assembled, audio, settings);
  }, [audio, clips, settings]);

  const handleCancel = useCallback(() => {
    cancelRender();
  }, []);

  const handleDownload = useCallback(() => {
    if (renderJob.outputUrl) {
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, "");
      downloadOutput(renderJob.outputUrl, `clipforge_${timestamp}.mp4`);
    }
  }, [renderJob.outputUrl]);

  const handleReset = useCallback(() => {
    resetRenderJob();
  }, [resetRenderJob]);

  return (
    <div className="bg-surface border border-border rounded-card p-4">
      {/* === IDLE STATE === */}
      {!isProcessing && !isDone && !isError && (
        <>
          <button
            onClick={handleRender}
            disabled={!canRender}
            className={`
              w-full font-mono font-medium py-3 rounded-btn transition-all text-sm
              ${
                canRender
                  ? "bg-accent text-bg hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-border text-muted cursor-not-allowed"
              }
            `}
          >
            RENDER
          </button>

          {/* Estimated time */}
          {canRender && estimatedTime && (
            <p className="text-[10px] font-mono text-muted text-center mt-2">
              Est. render time: {estimatedTime}
            </p>
          )}

          {/* Requirements hint */}
          {!canRender && (
            <p className="text-[10px] font-mono text-muted/60 text-center mt-2">
              Upload audio + video clips untuk mulai render
            </p>
          )}
        </>
      )}

      {/* === PROCESSING STATE === */}
      {isProcessing && (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
              style={{ width: `${renderJob.progress}%` }}
            />
          </div>

          {/* Progress text */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-accent">
              Rendering...
            </span>
            <span className="text-[11px] font-mono text-muted">
              {renderJob.progress}%
            </span>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            className="w-full font-mono text-xs py-2 rounded-btn border border-error/30 text-error hover:bg-error/10 transition-colors"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* === DONE STATE === */}
      {isDone && (
        <div className="space-y-3">
          {/* Success indicator */}
          <div className="flex items-center justify-center gap-2 py-1">
            <span className="text-lg">✅</span>
            <span className="text-[11px] font-mono text-accent">
              Render selesai!
            </span>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="w-full bg-accent text-bg font-mono font-medium py-3 rounded-btn hover:brightness-110 transition-all text-sm"
          >
            DOWNLOAD MP4
          </button>

          {/* Render again */}
          <button
            onClick={handleReset}
            className="w-full font-mono text-xs py-2 rounded-btn border border-border text-muted hover:text-text hover:border-muted transition-colors"
          >
            Render Ulang
          </button>
        </div>
      )}

      {/* === ERROR STATE === */}
      {isError && (
        <div className="space-y-3">
          {/* Error indicator */}
          <div className="flex items-center gap-2 py-1">
            <span className="text-lg">❌</span>
            <span className="text-[11px] font-mono text-error leading-tight">
              {renderJob.error || "Render gagal"}
            </span>
          </div>

          {/* Retry button */}
          <button
            onClick={handleRender}
            disabled={!canRender}
            className="w-full bg-accent text-bg font-mono font-medium py-3 rounded-btn hover:brightness-110 transition-all text-sm"
          >
            COBA LAGI
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="w-full font-mono text-xs py-2 rounded-btn border border-border text-muted hover:text-text hover:border-muted transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
