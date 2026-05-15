import { useCallback, useRef, useMemo } from "react";
import { useClipForgeStore } from "../store/useClipForgeStore";

const PIXELS_PER_SECOND = 20;
const RULER_HEIGHT = 20;
const BEAT_ROW_HEIGHT = 16;
const CLIP_ROW_HEIGHT = 32;
const TOTAL_HEIGHT = RULER_HEIGHT + BEAT_ROW_HEIGHT + CLIP_ROW_HEIGHT + 24; // + padding

export default function Timeline() {
  const { audio, clips, settings, playheadSec, setPlayhead } =
    useClipForgeStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const duration = audio?.duration ?? 0;
  const totalWidth = Math.max(duration * PIXELS_PER_SECOND, 400);

  // Calculate clip positions based on beat sync or sequential
  const clipBlocks = useMemo(() => {
    if (clips.length === 0 || duration === 0) return [];

    const blocks: {
      id: string;
      name: string;
      startSec: number;
      endSec: number;
      colorIdx: number;
    }[] = [];

    if (settings.beatSyncCut && audio && audio.beatMarkers.length > 1) {
      // Beat-synced: each clip fills one beat interval
      const markers = audio.beatMarkers;
      let clipIdx = 0;

      for (let i = 0; i < markers.length - 1; i++) {
        const clip = clips[clipIdx % clips.length];
        blocks.push({
          id: `${clip.id}-${i}`,
          name: clip.name,
          startSec: markers[i],
          endSec: markers[i + 1],
          colorIdx: clipIdx % clips.length,
        });
        clipIdx++;
      }
    } else {
      // Sequential: clips laid end-to-end
      let currentTime = 0;
      let clipIdx = 0;

      while (currentTime < duration && clips.length > 0) {
        const clip = clips[clipIdx % clips.length];
        const clipDur = clip.trimEnd - clip.trimStart;
        const endTime = Math.min(currentTime + clipDur, duration);

        blocks.push({
          id: `${clip.id}-${clipIdx}`,
          name: clip.name,
          startSec: currentTime,
          endSec: endTime,
          colorIdx: clipIdx % clips.length,
        });

        currentTime = endTime;
        clipIdx++;

        // Safety: prevent infinite loop
        if (clipIdx > 500) break;
      }
    }

    return blocks;
  }, [clips, audio, settings.beatSyncCut, duration]);

  // Ruler tick marks
  const rulerTicks = useMemo(() => {
    const ticks: { sec: number; label: string; isMajor: boolean }[] = [];
    if (duration === 0) return ticks;

    // Determine tick interval based on duration
    let interval = 1;
    if (duration > 120) interval = 10;
    else if (duration > 60) interval = 5;
    else if (duration > 30) interval = 2;

    for (let sec = 0; sec <= duration; sec += interval) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      ticks.push({
        sec,
        label: `${m}:${s.toString().padStart(2, "0")}`,
        isMajor: sec % (interval * 5) === 0 || sec === 0,
      });
    }

    return ticks;
  }, [duration]);

  // Beat markers
  const beatMarkers = audio?.beatMarkers ?? [];

  // Handle click/drag on timeline to set playhead
  const getSecFromX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      const sec = Math.max(0, Math.min(x / PIXELS_PER_SECOND, duration));
      return sec;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (duration === 0) return;
      isDraggingRef.current = true;
      setPlayhead(getSecFromX(e.clientX));
    },
    [duration, getSecFromX, setPlayhead]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPlayhead(getSecFromX(e.clientX));
    },
    [getSecFromX, setPlayhead]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Playhead position in px
  const playheadX = playheadSec * PIXELS_PER_SECOND;

  // Clip block colors (rotate through a palette)
  const CLIP_COLORS = [
    "bg-accent/30 border-accent/50",
    "bg-info/30 border-info/50",
    "bg-purple-500/30 border-purple-500/50",
    "bg-pink-500/30 border-pink-500/50",
    "bg-orange-500/30 border-orange-500/50",
    "bg-teal-500/30 border-teal-500/50",
  ];

  // Empty state
  if (!audio) {
    return (
      <div className="bg-surface border border-border rounded-card p-4 h-40">
        <h2 className="font-mono text-sm text-muted mb-2">⏱️ Timeline</h2>
        <div className="h-full border border-dashed border-border rounded-card flex items-center justify-center text-muted text-xs font-mono">
          Upload audio untuk melihat timeline
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-card p-3 h-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="font-mono text-sm text-muted">⏱️ Timeline</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted">
            {formatTime(playheadSec)} / {formatTime(duration)}
          </span>
          {clips.length > 0 && (
            <span className="text-[10px] font-mono text-accent/70">
              {clipBlocks.length} segments
            </span>
          )}
        </div>
      </div>

      {/* Scrollable timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair select-none rounded-btn bg-bg/50"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, height: `${TOTAL_HEIGHT}px` }}
        >
          {/* === RULER ROW === */}
          <div
            className="absolute top-0 left-0 w-full border-b border-border/50"
            style={{ height: `${RULER_HEIGHT}px` }}
          >
            {rulerTicks.map((tick) => (
              <div
                key={tick.sec}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${tick.sec * PIXELS_PER_SECOND}px` }}
              >
                <div
                  className={`w-px ${tick.isMajor ? "h-3 bg-muted/60" : "h-2 bg-muted/30"}`}
                />
                {tick.isMajor && (
                  <span className="text-[8px] font-mono text-muted/60 mt-px">
                    {tick.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* === BEAT MARKERS ROW === */}
          <div
            className="absolute left-0 w-full"
            style={{
              top: `${RULER_HEIGHT}px`,
              height: `${BEAT_ROW_HEIGHT}px`,
            }}
          >
            {beatMarkers.map((sec, i) => (
              <div
                key={i}
                className="absolute top-0 w-px h-full bg-accent/40"
                style={{ left: `${sec * PIXELS_PER_SECOND}px` }}
              />
            ))}
          </div>

          {/* === CLIP BLOCKS ROW === */}
          <div
            className="absolute left-0 w-full"
            style={{
              top: `${RULER_HEIGHT + BEAT_ROW_HEIGHT + 4}px`,
              height: `${CLIP_ROW_HEIGHT}px`,
            }}
          >
            {clipBlocks.map((block) => {
              const left = block.startSec * PIXELS_PER_SECOND;
              const width =
                (block.endSec - block.startSec) * PIXELS_PER_SECOND;
              const colorClass = CLIP_COLORS[block.colorIdx % CLIP_COLORS.length];

              return (
                <div
                  key={block.id}
                  className={`absolute top-0 h-full border rounded-sm overflow-hidden flex items-center ${colorClass}`}
                  style={{
                    left: `${left}px`,
                    width: `${Math.max(width - 1, 2)}px`,
                  }}
                >
                  {width > 30 && (
                    <span className="text-[8px] font-mono text-text/70 truncate px-1">
                      {block.name.replace(/\.[^/.]+$/, "")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* === PLAYHEAD === */}
          <div
            className="absolute top-0 w-px h-full bg-error z-10 pointer-events-none"
            style={{ left: `${playheadX}px` }}
          >
            {/* Playhead triangle */}
            <div className="absolute -top-0.5 -left-[4px] w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-error" />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1.5 shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-accent/40 rounded-sm" />
          <span className="text-[9px] font-mono text-muted">beats</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-error rounded-sm" />
          <span className="text-[9px] font-mono text-muted">playhead</span>
        </div>
        {clips.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-info/40 rounded-sm" />
            <span className="text-[9px] font-mono text-muted">clips</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
