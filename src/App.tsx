import { useState, useEffect } from "react";
import AudioUploader from "./components/AudioUploader";
import VideoUploader from "./components/VideoUploader";
import SettingsPanel from "./components/SettingsPanel";
import Timeline from "./components/Timeline";
import WaveformViz from "./components/WaveformViz";
import VideoPreview from "./components/VideoPreview";
import RenderButton from "./components/RenderButton";

function MobileWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-bg/95 flex items-center justify-center p-6">
      <div className="bg-surface border border-border rounded-card p-6 max-w-sm text-center space-y-4">
        <span className="text-4xl block">📱</span>
        <h2 className="font-mono text-lg text-text">Desktop Recommended</h2>
        <p className="text-xs text-muted font-mono leading-relaxed">
          ClipForge menggunakan FFmpeg.wasm yang membutuhkan resources besar.
          Untuk pengalaman terbaik, gunakan browser desktop (Chrome/Edge).
        </p>
        <button
          onClick={onDismiss}
          className="w-full bg-accent text-bg font-mono font-medium py-2.5 rounded-btn hover:brightness-110 transition-all text-sm"
        >
          Lanjutkan Saja
        </button>
      </div>
    </div>
  );
}

function SharedArrayBufferWarning() {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex justify-center pointer-events-none">
      <div className="bg-error/10 border border-error/30 rounded-card px-4 py-2.5 max-w-md pointer-events-auto">
        <p className="text-[11px] font-mono text-error leading-relaxed text-center">
          ⚠️ SharedArrayBuffer not available. Render mungkin gagal.
          Pastikan COOP/COEP headers aktif (jalankan via <code className="bg-error/10 px-1 rounded-sm">npm run dev</code>).
        </p>
      </div>
    </div>
  );
}

function App() {
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [sabSupported, setSabSupported] = useState(true);

  useEffect(() => {
    // Detect mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobile) setShowMobileWarning(true);

    // Check SharedArrayBuffer support
    if (typeof SharedArrayBuffer === "undefined") {
      setSabSupported(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Mobile Warning Modal */}
      {showMobileWarning && (
        <MobileWarning onDismiss={() => setShowMobileWarning(false)} />
      )}

      {/* SharedArrayBuffer Warning */}
      {!sabSupported && <SharedArrayBufferWarning />}

      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="font-mono text-lg sm:text-xl font-medium tracking-tight">
            <span className="text-accent">CLIP</span>FORGE
          </h1>
          <span className="text-[10px] sm:text-xs text-muted font-mono bg-surface px-1.5 sm:px-2 py-0.5 rounded-btn border border-border hidden sm:inline-block">
            MVP Maker
          </span>
        </div>
        <p className="text-[10px] sm:text-xs text-muted font-mono hidden md:block">
          Upload musik, upload video, render dalam detik.
        </p>
      </header>

      {/* Main Layout */}
      <main className="flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 lg:h-[calc(100vh-57px)] overflow-auto lg:overflow-hidden">
        {/* Left Panel — Upload & Clips */}
        <section className="w-full lg:w-80 flex flex-col gap-3 sm:gap-4 shrink-0 lg:overflow-auto">
          <AudioUploader />
          <VideoUploader />
        </section>

        {/* Center — Preview & Timeline */}
        <section className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0">
          <VideoPreview />
          <WaveformViz />
          <Timeline />
        </section>

        {/* Right Panel — Settings & Render */}
        <section className="w-full lg:w-72 flex flex-col gap-3 sm:gap-4 shrink-0 lg:overflow-auto">
          <SettingsPanel />
          <RenderButton />
        </section>
      </main>
    </div>
  );
}

export default App;
