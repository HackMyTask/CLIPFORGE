import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useClipForgeStore } from "../store/useClipForgeStore";
import type { VideoClip } from "../types";
import ClipCard from "./ClipCard";

const ACCEPTED_FORMATS = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total limit

/**
 * Extract the first frame from a video file as a thumbnail URL.
 */
function extractThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);

      URL.revokeObjectURL(objectUrl);
      resolve(thumbnailUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video"));
    };
  });
}

/**
 * Get the duration of a video file.
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read video metadata"));
    };
  });
}

export default function VideoUploader() {
  const { clips, addClips, reorderClips } = useClipForgeStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTotalSize = clips.reduce((acc, c) => acc + c.file.size, 0);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIdx = clips.findIndex((c) => c.id === active.id);
      const toIdx = clips.findIndex((c) => c.id === over.id);

      if (fromIdx !== -1 && toIdx !== -1) {
        reorderClips(fromIdx, toIdx);
      }
    },
    [clips, reorderClips]
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setIsProcessing(true);

      const validFiles: File[] = [];
      let totalNewSize = 0;

      for (const file of Array.from(files)) {
        if (!ACCEPTED_FORMATS.includes(file.type)) {
          setError(
            `"${file.name}" — format tidak didukung. Gunakan MP4, MOV, atau WEBM.`
          );
          continue;
        }
        totalNewSize += file.size;
        validFiles.push(file);
      }

      if (currentTotalSize + totalNewSize > MAX_TOTAL_SIZE) {
        setError("Total ukuran video melebihi 500MB. Kurangi file.");
        setIsProcessing(false);
        return;
      }

      if (validFiles.length === 0) {
        setIsProcessing(false);
        return;
      }

      try {
        const newClips: VideoClip[] = await Promise.all(
          validFiles.map(async (file) => {
            const [thumbnailUrl, duration] = await Promise.all([
              extractThumbnail(file),
              getVideoDuration(file),
            ]);

            return {
              id: uuidv4(),
              file,
              name: file.name,
              duration,
              thumbnailUrl,
              effect: "none" as const,
              trimStart: 0,
              trimEnd: duration,
            };
          })
        );

        addClips(newClips);
      } catch (err) {
        console.error("Video processing error:", err);
        setError("Gagal memproses beberapa video. Coba lagi.");
      } finally {
        setIsProcessing(false);
      }
    },
    [addClips, currentTotalSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = "";
    },
    [processFiles]
  );

  return (
    <div className="bg-surface border border-border rounded-card p-4 flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-sm text-muted">🎬 Video Clips</h2>
        {clips.length > 0 && (
          <span className="text-[10px] font-mono text-muted bg-bg px-1.5 py-0.5 rounded-btn border border-border">
            {clips.length} clip{clips.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          min-h-[80px] border-2 border-dashed rounded-card flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200 shrink-0
          ${
            isDragging
              ? "border-accent bg-accent/5 scale-[1.02]"
              : "border-border hover:border-muted hover:bg-bg/30"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted font-mono">Processing...</span>
          </div>
        ) : (
          <>
            <span className="text-lg mb-1">{isDragging ? "📽️" : "🎬"}</span>
            <span className="text-xs text-muted font-mono text-center px-2">
              {isDragging
                ? "Drop video(s) here"
                : "Drag & drop atau klik untuk upload video"}
            </span>
            <span className="text-[10px] text-muted/60 font-mono mt-1">
              MP4, MOV, WEBM • Multi-file • Max 500MB total
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-error font-mono mt-2 shrink-0">{error}</p>
      )}

      {/* Sortable clip list */}
      {clips.length > 0 && (
        <div className="mt-3 flex-1 overflow-auto space-y-2 min-h-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={clips.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
