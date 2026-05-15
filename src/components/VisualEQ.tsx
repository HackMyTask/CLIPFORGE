import { useRef, useEffect, useMemo, useCallback } from "react";
import { useClipForgeStore } from "../store/useClipForgeStore";

const NUM_BARS = 24;
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 80;

export default function VisualEQ() {
  const { audio, settings, isPlaying, playheadSec } = useClipForgeStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Only show if visualEQ enabled and audio is loaded
  const show = settings.visualEQ && audio !== null;

  // Position class
  const positionClass = useMemo(() => {
    switch (settings.eqPosition) {
      case "top":
        return "top-2 left-1/2 -translate-x-1/2";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      case "bottom":
      default:
        return "bottom-2 left-1/2 -translate-x-1/2";
    }
  }, [settings.eqPosition]);

  // Setup audio analyser
  useEffect(() => {
    if (!show) return;

    // Create hidden audio element for analysis
    const audioEl = new Audio();
    audioEl.crossOrigin = "anonymous";
    audioEl.src = URL.createObjectURL(audio!.file);
    audioEl.preload = "auto";
    audioElRef.current = audioEl;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;

    const source = ctx.createMediaElementSource(audioEl);
    source.connect(analyser);
    // Don't connect to destination — preview already plays audio
    // analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    return () => {
      audioEl.pause();
      URL.revokeObjectURL(audioEl.src);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
      audioElRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
      sourceRef.current = null;
      dataArrayRef.current = null;
    };
  }, [show, audio]);

  // Sync audio element with playhead and playing state
  useEffect(() => {
    if (!audioElRef.current || !show) return;
    const el = audioElRef.current;

    if (isPlaying) {
      el.currentTime = playheadSec;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = playheadSec;
    }
  }, [isPlaying, show]);

  // Keep audio element in sync when playhead jumps
  useEffect(() => {
    if (!audioElRef.current || !show || isPlaying) return;
    audioElRef.current.currentTime = playheadSec;
  }, [playheadSec, show, isPlaying]);

  // Draw function based on EQ style
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !analyser || !dataArray) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const color = settings.eqColor;

    switch (settings.eqStyle) {
      case "bars":
        drawBars(ctx, dataArray, color);
        break;
      case "wave":
        drawWave(ctx, dataArray, color);
        break;
      case "circle":
        drawCircle(ctx, dataArray, color);
        break;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [settings.eqStyle, settings.eqColor]);

  // Animation loop
  useEffect(() => {
    if (!show) return;

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw);
    } else {
      // Draw one static frame
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          // Draw idle state — small bars at minimum
          const color = settings.eqColor;
          drawIdleBars(ctx, color);
        }
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [show, isPlaying, draw, settings.eqColor]);

  if (!show) return null;

  return (
    <div
      className={`absolute ${positionClass} pointer-events-none z-10`}
      style={{ opacity: 0.75 }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
        style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}
      />
    </div>
  );
}

// === Drawing Functions ===

function drawBars(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  color: string
) {
  const barCount = NUM_BARS;
  const barWidth = CANVAS_WIDTH / barCount - 2;
  const step = Math.floor(dataArray.length / barCount);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step] / 255;
    const barHeight = Math.max(value * CANVAS_HEIGHT * 0.85, 2);
    const x = i * (barWidth + 2);
    const y = CANVAS_HEIGHT - barHeight;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 + value * 0.4;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  color: string
) {
  const points = dataArray.length;
  const step = CANVAS_WIDTH / (points - 1);

  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT / 2);

  for (let i = 0; i < points; i++) {
    const value = dataArray[i] / 255;
    const x = i * step;
    const y = CANVAS_HEIGHT / 2 - value * (CANVAS_HEIGHT * 0.4);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevX = (i - 1) * step;
      const prevY =
        CANVAS_HEIGHT / 2 - (dataArray[i - 1] / 255) * (CANVAS_HEIGHT * 0.4);
      const cpX = (prevX + x) / 2;
      ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
    }
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.8;
  ctx.stroke();

  // Mirror wave below center
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const value = dataArray[i] / 255;
    const x = i * step;
    const y = CANVAS_HEIGHT / 2 + value * (CANVAS_HEIGHT * 0.35);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevX = (i - 1) * step;
      const prevY =
        CANVAS_HEIGHT / 2 + (dataArray[i - 1] / 255) * (CANVAS_HEIGHT * 0.35);
      const cpX = (prevX + x) / 2;
      ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
    }
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  color: string
) {
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const baseRadius = 18;
  const maxBarHeight = 22;
  const barCount = NUM_BARS;
  const step = Math.floor(dataArray.length / barCount);
  const angleStep = (Math.PI * 2) / barCount;

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step] / 255;
    const barHeight = Math.max(value * maxBarHeight, 2);
    const angle = i * angleStep - Math.PI / 2;

    const x1 = centerX + Math.cos(angle) * baseRadius;
    const y1 = centerY + Math.sin(angle) * baseRadius;
    const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
    const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.6 + value * 0.4;
    ctx.stroke();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius - 2, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.3;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawIdleBars(ctx: CanvasRenderingContext2D, color: string) {
  const barCount = NUM_BARS;
  const barWidth = CANVAS_WIDTH / barCount - 2;

  for (let i = 0; i < barCount; i++) {
    const barHeight = 3 + Math.sin(i * 0.5) * 2;
    const x = i * (barWidth + 2);
    const y = CANVAS_HEIGHT - barHeight;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 1);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
