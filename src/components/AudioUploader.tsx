import { useCallback, useRef, useState, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { useClipForgeStore } from "../store/useClipForgeStore";
import { detectBeats, extractWaveformData } from "../lib/beatDetector";

const ACCEPTED_FORMATS = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function AudioUploader() {
  const { audio, setAudio, clearAudio } = useClipForgeStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize / destroy wavesurfer when audio changes
  useEffect(() => {
    if (!audio || !waveformRef.current) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#6b6b80",
      progressColor: "#e8ff47",
      cursorColor: "#e8ff47",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
      backend: "WebAudio",
    });

    const objectUrl = URL.createObjectURL(audio.file);
    ws.load(objectUrl);

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      URL.revokeObjectURL(objectUrl);
    };
  }, [audio]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return "Format tidak didukung. Gunakan MP3, WAV, OGG, atau FLAC.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File terlalu besar. Maksimal 50MB.";
    }
    return null;
  };

  const processAudioFile = useCallback(async (file: File) => {
    setError(null);
    setIsAnalyzing(true);

    try {
      // Decode audio to AudioBuffer for analysis
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Detect beats & BPM
      const { bpm, beatMarkers } = await detectBeats(audioBuffer);

      // Extract waveform visualization data
      const waveformData = extractWaveformData(audioBuffer, 1000);

      setAudio({
        file,
        name: file.name,
        duration: audioBuffer.duration,
        bpm,
        beatMarkers,
        waveformData,
      });

      await audioContext.close();
    } catch (err) {
      console.error("Audio processing error:", err);
      setError("Gagal memproses file audio. Coba file lain.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [setAudio]);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      processAudioFile(file);
    },
    [processAudioFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
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
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }
    clearAudio();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearAudio]);

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- RENDER: Analyzing state ---
  if (isAnalyzing) {
    return (
      <div className="bg-surface border border-border rounded-card p-4">
        <h2 className="font-mono text-sm text-muted mb-3">🎵 Audio</h2>
        <div className="flex items-center justify-center gap-3 h-20">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted font-mono">
            Analyzing audio...
          </span>
        </div>
      </div>
    );
  }

  // --- RENDER: Audio loaded ---
  if (audio) {
    return (
      <div className="bg-surface border border-border rounded-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-sm text-muted">🎵 Audio</h2>
          <button
            onClick={handleRemove}
            className="text-xs text-error hover:text-red-400 font-mono transition-colors"
          >
            ✕ Remove
          </button>
        </div>

        {/* File info + badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-text font-mono truncate max-w-[160px]">
            {audio.name}
          </span>
          <span className="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded-btn border border-accent/20">
            {audio.bpm} BPM
          </span>
          <span className="text-[10px] font-mono bg-info/10 text-info px-1.5 py-0.5 rounded-btn border border-info/20">
            {formatDuration(audio.duration)}
          </span>
          <span className="text-[10px] font-mono bg-surface text-muted px-1.5 py-0.5 rounded-btn border border-border">
            {audio.beatMarkers.length} beats
          </span>
        </div>

        {/* Waveform */}
        <div
          ref={waveformRef}
          className="w-full rounded-btn overflow-hidden bg-bg/50"
        />
      </div>
    );
  }

  // --- RENDER: Upload zone ---
  return (
    <div className="bg-surface border border-border rounded-card p-4">
      <h2 className="font-mono text-sm text-muted mb-3">🎵 Audio</h2>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          h-24 border-2 border-dashed rounded-card flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200
          ${
            isDragging
              ? "border-accent bg-accent/5 scale-[1.02]"
              : "border-border hover:border-muted hover:bg-bg/30"
          }
        `}
      >
        <span className="text-lg mb-1">
          {isDragging ? "🎶" : "🎵"}
        </span>
        <span className="text-xs text-muted font-mono">
          {isDragging ? "Drop file here" : "Drag & drop atau klik untuk upload"}
        </span>
        <span className="text-[10px] text-muted/60 font-mono mt-1">
          MP3, WAV, OGG, FLAC • Max 50MB
        </span>
      </div>

      {error && (
        <p className="text-xs text-error font-mono mt-2">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.flac,audio/mpeg,audio/wav,audio/ogg,audio/flac"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
