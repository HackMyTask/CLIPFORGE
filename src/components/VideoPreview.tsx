import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useClipForgeStore } from "../store/useClipForgeStore";
import type { VideoClip } from "../types";
import VisualEQ from "./VisualEQ";

export default function VideoPreview() {
  const { audio, clips, settings, playheadSec, isPlaying, setPlayhead, setPlaying } =
    useClipForgeStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);
  const [activeClipUrl, setActiveClipUrl] = useState<string | null>(null);
  const [activeClip, setActiveClip] = useState<VideoClip | null>(null);

  const duration = audio?.duration ?? 0;

  // Calculate clip segments (same logic as Timeline)
  const clipSegments = useMemo(() => {
    if (clips.length === 0 || duration === 0) return [];

    const segments: { clip: VideoClip; startSec: number; endSec: number }[] = [];

    if (settings.beatSyncCut && audio && audio.beatMarkers.length > 1) {
      const markers = audio.beatMarkers;
      let clipIdx = 0;
      for (let i = 0; i < markers.length - 1; i++) {
        const clip = clips[clipIdx % clips.length];
        segments.push({ clip, startSec: markers[i], endSec: markers[i + 1] });
        clipIdx++;
      }
    } else {
      let currentTime = 0;
      let clipIdx = 0;
      while (currentTime < duration && clips.length > 0) {
        const clip = clips[clipIdx % clips.length];
        const clipDur = clip.trimEnd - clip.trimStart;
        const endTime = Math.min(currentTime + clipDur, duration);
        segments.push({ clip, startSec: currentTime, endSec: endTime });
        currentTime = endTime;
        clipIdx++;
        if (clipIdx > 500) break;
      }
    }

    return segments;
  }, [clips, audio, settings.beatSyncCut, duration]);

  // Find the active clip based on playhead position
  const currentSegment = useMemo(() => {
    if (clipSegments.length === 0) return null;
    return (
      clipSegments.find(
        (seg) => playheadSec >= seg.startSec && playheadSec < seg.endSec
      ) ?? clipSegments[clipSegments.length - 1]
    );
  }, [clipSegments, playheadSec]);

  // Update video source when active clip changes
  useEffect(() => {
    if (!currentSegment) {
      setActiveClip(null);
      if (activeClipUrl) {
        URL.revokeObjectURL(activeClipUrl);
        setActiveClipUrl(null);
      }
      return;
    }

    if (currentSegment.clip.id !== activeClip?.id) {
      // Clean up old URL
      if (activeClipUrl) {
        URL.revokeObjectURL(activeClipUrl);
      }

      const newUrl = URL.createObjectURL(currentSegment.clip.file);
      setActiveClipUrl(newUrl);
      setActiveClip(currentSegment.clip);

      if (videoRef.current) {
        videoRef.current.src = newUrl;
        videoRef.current.load();
      }
    }

    // Seek video to correct offset within clip
    if (videoRef.current && currentSegment) {
      const offsetInSegment = playheadSec - currentSegment.startSec;
      const clipOffset = currentSegment.clip.trimStart + offsetInSegment;
      const clampedOffset = Math.min(clipOffset, currentSegment.clip.trimEnd);

      // Only seek if difference is significant (avoid constant seeking during playback)
      if (Math.abs(videoRef.current.currentTime - clampedOffset) > 0.3) {
        videoRef.current.currentTime = clampedOffset;
      }
    }
  }, [currentSegment, playheadSec]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeClipUrl) URL.revokeObjectURL(activeClipUrl);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || duration === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Pause video + audio
      videoRef.current?.pause();
      audioRef.current?.pause();
      return;
    }

    // Start video + audio
    videoRef.current?.play().catch(() => {});
    if (audioRef.current) {
      audioRef.current.currentTime = playheadSec;
      audioRef.current.play().catch(() => {});
    }

    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const newPlayhead = playheadSec + delta;

      if (newPlayhead >= duration) {
        setPlayhead(0);
        setPlaying(false);
        return;
      }

      setPlayhead(newPlayhead);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Sync audio time when playhead jumps (manual seek)
  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.currentTime = playheadSec;
    }
  }, [playheadSec, isPlaying]);

  const handlePlayPause = useCallback(() => {
    if (duration === 0) return;
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying, duration]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setPlayhead(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, [setPlaying, setPlayhead]);

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Aspect ratio class
  const aspectClass =
    settings.aspectRatio === "9:16"
      ? "aspect-[9/16] max-h-full"
      : settings.aspectRatio === "1:1"
        ? "aspect-square max-h-full"
        : "aspect-video max-h-full";

  // Empty state
  if (!audio && clips.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-card flex-1 flex flex-col items-center justify-center gap-3">
        <span className="text-3xl">🎬</span>
        <span className="text-sm text-muted font-mono">Video Preview</span>
        <span className="text-[10px] text-muted/60 font-mono text-center max-w-[200px]">
          Upload audio dan video clips untuk melihat preview di sini
        </span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-card flex-1 flex flex-col overflow-hidden">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted">Preview</span>
          {activeClip && activeClip.effect !== "none" && (
            <span className="text-[9px] font-mono bg-accent/10 text-accent px-1.5 py-[1px] rounded-sm border border-accent/20 uppercase">
              {activeClip.effect.replace("_", " ")}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-muted">
          {settings.aspectRatio} • {settings.exportQuality}
        </span>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center bg-black/40 p-2 min-h-0">
        <div className={`relative ${aspectClass} w-auto mx-auto overflow-hidden rounded-sm bg-black`}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            loop={false}
          />

          {/* Visual EQ Overlay */}
          <VisualEQ />

          {/* Overlay: clip name */}
          {activeClip && (
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
              <span className="text-[9px] font-mono text-white/60 bg-black/50 px-1.5 py-0.5 rounded-sm truncate max-w-[60%]">
                {activeClip.name}
              </span>
            </div>
          )}

          {/* No clip to show */}
          {!activeClip && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-muted/60">
                No clip at current position
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            disabled={duration === 0}
            className="w-7 h-7 flex items-center justify-center rounded-btn bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={duration === 0}
            className="w-7 h-7 flex items-center justify-center rounded-btn bg-surface border border-border hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ResetIcon />
          </button>
        </div>

        {/* Time display */}
        <span className="text-[10px] font-mono text-muted">
          {formatTime(playheadSec)} / {formatTime(duration)}
        </span>
      </div>

      {/* Hidden audio element for playback */}
      {audio && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audio.file)}
          preload="auto"
          className="hidden"
        />
      )}
    </div>
  );
}

// --- SVG Icon components ---

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 1.5L10 6L3 10.5V1.5Z" fill="#e8ff47" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="1.5" width="3" height="9" rx="0.5" fill="#e8ff47" />
      <rect x="7" y="1.5" width="3" height="9" rx="0.5" fill="#e8ff47" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="2" width="2" height="8" rx="0.5" fill="#6b6b80" />
      <path d="M5 6L10 2.5V9.5L5 6Z" fill="#6b6b80" />
    </svg>
  );
}
