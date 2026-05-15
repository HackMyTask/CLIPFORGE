import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useClipForgeStore } from "../store/useClipForgeStore";
import type { VideoClip, ClipEffect } from "../types";

const EFFECTS: { value: ClipEffect; label: string }[] = [
  { value: "none", label: "None" },
  { value: "boomerang", label: "Boomerang" },
  { value: "zoom_in", label: "Zoom In" },
  { value: "zoom_out", label: "Zoom Out" },
];

interface ClipCardProps {
  clip: VideoClip;
  isActive?: boolean;
}

export default function ClipCard({ clip, isActive = false }: ClipCardProps) {
  const { removeClip, updateClip } = useClipForgeStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleEffectChange = (effect: ClipEffect) => {
    updateClip(clip.id, { effect });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-start gap-2 bg-bg/50 border rounded-btn p-2 group transition-colors
        ${isActive ? "border-accent shadow-[0_0_8px_rgba(232,255,71,0.15)]" : "border-border"}
        ${isDragging ? "shadow-lg shadow-accent/10" : ""}
      `}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex flex-col items-center justify-center gap-[3px] pt-1.5 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <span className="w-3.5 h-[2px] bg-muted/50 rounded-full block" />
        <span className="w-3.5 h-[2px] bg-muted/50 rounded-full block" />
        <span className="w-3.5 h-[2px] bg-muted/50 rounded-full block" />
      </button>

      {/* Thumbnail */}
      <img
        src={clip.thumbnailUrl}
        alt={clip.name}
        className={`
          w-14 h-8 rounded-sm object-cover shrink-0 border
          ${isActive ? "border-accent" : "border-border"}
        `}
      />

      {/* Info & Effect */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text font-mono truncate leading-tight">
          {clip.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted font-mono">
            {formatDuration(clip.duration)}
          </span>
          {clip.effect !== "none" && (
            <span className="text-[9px] font-mono bg-accent/10 text-accent px-1 py-[1px] rounded-sm border border-accent/20 uppercase">
              {clip.effect.replace("_", " ")}
            </span>
          )}
        </div>

        {/* Effect selector — shown on hover */}
        <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {EFFECTS.map((fx) => (
            <button
              key={fx.value}
              onClick={() => handleEffectChange(fx.value)}
              className={`
                text-[9px] font-mono px-1.5 py-[2px] rounded-sm transition-all
                ${
                  clip.effect === fx.value
                    ? "bg-accent text-bg"
                    : "bg-surface text-muted hover:text-text border border-border"
                }
              `}
            >
              {fx.label}
            </button>
          ))}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeClip(clip.id)}
        className="text-[10px] text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-all font-mono shrink-0 mt-0.5"
        aria-label="Remove clip"
      >
        ✕
      </button>
    </div>
  );
}
