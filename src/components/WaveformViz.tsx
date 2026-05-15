import { useMemo } from "react";
import { useClipForgeStore } from "../store/useClipForgeStore";

const WAVEFORM_HEIGHT = 48;

export default function WaveformViz() {
  const { audio, playheadSec } = useClipForgeStore();

  const waveformData = audio?.waveformData ?? [];
  const duration = audio?.duration ?? 0;
  const beatMarkers = audio?.beatMarkers ?? [];

  // Generate SVG path for waveform
  const waveformPath = useMemo(() => {
    if (waveformData.length === 0) return "";

    const width = 1000; // viewBox width
    const halfH = WAVEFORM_HEIGHT / 2;
    const step = width / waveformData.length;

    let path = `M 0 ${halfH}`;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * step;
      const amp = waveformData[i] * halfH * 0.9;
      path += ` L ${x} ${halfH - amp}`;
    }

    // Mirror bottom
    for (let i = waveformData.length - 1; i >= 0; i--) {
      const x = i * step;
      const amp = waveformData[i] * halfH * 0.9;
      path += ` L ${x} ${halfH + amp}`;
    }

    path += " Z";
    return path;
  }, [waveformData]);

  // Progress percentage for gradient mask
  const progressPercent = duration > 0 ? (playheadSec / duration) * 100 : 0;

  if (!audio) return null;

  return (
    <div className="bg-surface border border-border rounded-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-mono text-[11px] text-muted">🎶 Waveform</h2>
        <span className="text-[10px] font-mono text-accent/70">
          {audio.bpm} BPM
        </span>
      </div>

      <div className="relative w-full overflow-hidden rounded-btn bg-bg/50">
        <svg
          viewBox={`0 0 1000 ${WAVEFORM_HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: `${WAVEFORM_HEIGHT}px` }}
        >
          <defs>
            {/* Gradient for progress */}
            <linearGradient id="waveProgress" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset={`${progressPercent}%`} stopColor="#e8ff47" stopOpacity="0.8" />
              <stop offset={`${progressPercent}%`} stopColor="#6b6b80" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Waveform shape */}
          <path d={waveformPath} fill="url(#waveProgress)" />

          {/* Beat markers */}
          {beatMarkers.map((sec, i) => {
            const x = duration > 0 ? (sec / duration) * 1000 : 0;
            return (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x}
                y2={WAVEFORM_HEIGHT}
                stroke="#e8ff47"
                strokeOpacity={0.3}
                strokeWidth={0.8}
              />
            );
          })}

          {/* Playhead */}
          {duration > 0 && (
            <line
              x1={(playheadSec / duration) * 1000}
              y1={0}
              x2={(playheadSec / duration) * 1000}
              y2={WAVEFORM_HEIGHT}
              stroke="#ff4757"
              strokeWidth={1.5}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
