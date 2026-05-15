/**
 * Beat Detector — BPM + beat marker detection from AudioBuffer
 *
 * Uses energy-based onset detection with peak picking
 * and autocorrelation for BPM estimation.
 */

export interface BeatDetectionResult {
  bpm: number;
  beatMarkers: number[]; // timestamps in seconds
}

/**
 * Analyze an AudioBuffer to detect BPM and beat positions.
 */
export async function detectBeats(
  audioBuffer: AudioBuffer
): Promise<BeatDetectionResult> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Frame-based energy calculation
  const frameSize = Math.floor(sampleRate * 0.01); // 10ms frames
  const hopSize = Math.floor(frameSize / 2);
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const energy: number[] = [];
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    let sum = 0;
    for (let j = start; j < start + frameSize; j++) {
      sum += channelData[j] * channelData[j];
    }
    energy.push(sum / frameSize);
  }

  // Onset strength — difference in energy between consecutive frames
  const onsetStrength: number[] = [0];
  for (let i = 1; i < energy.length; i++) {
    const diff = energy[i] - energy[i - 1];
    onsetStrength.push(diff > 0 ? diff : 0);
  }

  // Normalize onset strength
  const maxOnset = Math.max(...onsetStrength);
  if (maxOnset > 0) {
    for (let i = 0; i < onsetStrength.length; i++) {
      onsetStrength[i] /= maxOnset;
    }
  }

  // Peak picking with adaptive threshold
  const peaks: number[] = [];
  const windowSize = 10;
  const threshold = 0.3;
  const minPeakDistance = Math.floor(sampleRate * 0.2 / hopSize); // min 200ms between beats

  let lastPeakIdx = -minPeakDistance;

  for (let i = windowSize; i < onsetStrength.length - windowSize; i++) {
    if (onsetStrength[i] < threshold) continue;
    if (i - lastPeakIdx < minPeakDistance) continue;

    let isPeak = true;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      if (j !== i && onsetStrength[j] >= onsetStrength[i]) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      peaks.push(i);
      lastPeakIdx = i;
    }
  }

  // Convert peak indices to timestamps (seconds)
  const beatMarkers = peaks.map((p) => (p * hopSize) / sampleRate);

  // Estimate BPM from inter-beat intervals
  const bpm = estimateBPM(beatMarkers);

  return { bpm, beatMarkers };
}

/**
 * Estimate BPM from an array of beat timestamps.
 */
function estimateBPM(beatMarkers: number[]): number {
  if (beatMarkers.length < 2) return 120; // default fallback

  // Calculate intervals between consecutive beats
  const intervals: number[] = [];
  for (let i = 1; i < beatMarkers.length; i++) {
    intervals.push(beatMarkers[i] - beatMarkers[i - 1]);
  }

  // Filter out outliers (keep intervals between 0.25s and 2s → 30-240 BPM range)
  const validIntervals = intervals.filter((iv) => iv >= 0.25 && iv <= 2.0);

  if (validIntervals.length === 0) return 120;

  // Use median interval for robustness
  validIntervals.sort((a, b) => a - b);
  const medianInterval = validIntervals[Math.floor(validIntervals.length / 2)];

  const rawBPM = 60 / medianInterval;

  // Normalize BPM to common range (60-180)
  let normalizedBPM = rawBPM;
  while (normalizedBPM < 60) normalizedBPM *= 2;
  while (normalizedBPM > 180) normalizedBPM /= 2;

  return Math.round(normalizedBPM);
}

/**
 * Extract waveform data (downsampled amplitude) for visualization.
 */
export function extractWaveformData(
  audioBuffer: AudioBuffer,
  numSamples: number = 1000
): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / numSamples);
  const waveform: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const start = i * blockSize;
    let sum = 0;
    for (let j = start; j < start + blockSize && j < channelData.length; j++) {
      sum += Math.abs(channelData[j]);
    }
    waveform.push(sum / blockSize);
  }

  // Normalize to 0–1
  const max = Math.max(...waveform);
  if (max > 0) {
    for (let i = 0; i < waveform.length; i++) {
      waveform[i] /= max;
    }
  }

  return waveform;
}
