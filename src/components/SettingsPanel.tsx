import { useClipForgeStore } from "../store/useClipForgeStore";
import type {
  AspectRatio,
  ExportQuality,
  TransitionType,
  EQStyle,
} from "../types";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "1:1", label: "1:1 (Square)" },
];

const EXPORT_QUALITIES: { value: ExportQuality; label: string }[] = [
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "4K", label: "4K" },
];

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "glitch", label: "Glitch" },
];

const EQ_STYLES: { value: EQStyle; label: string }[] = [
  { value: "bars", label: "Bars" },
  { value: "wave", label: "Wave" },
  { value: "circle", label: "Circle" },
];

const EQ_POSITIONS: { value: "bottom" | "top" | "center"; label: string }[] = [
  { value: "bottom", label: "Bottom" },
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
];

export default function SettingsPanel() {
  const { settings, updateSettings } = useClipForgeStore();

  return (
    <div className="bg-surface border border-border rounded-card p-4 flex-1 flex flex-col overflow-auto">
      <h2 className="font-mono text-sm text-muted mb-4">⚙️ Settings</h2>

      <div className="space-y-4">
        {/* Aspect Ratio */}
        <SelectGroup
          label="Aspect Ratio"
          value={settings.aspectRatio}
          options={ASPECT_RATIOS}
          onChange={(v) => updateSettings({ aspectRatio: v as AspectRatio })}
        />

        {/* Export Quality */}
        <SelectGroup
          label="Export Quality"
          value={settings.exportQuality}
          options={EXPORT_QUALITIES}
          onChange={(v) => updateSettings({ exportQuality: v as ExportQuality })}
        />

        {/* Transition */}
        <SelectGroup
          label="Transition"
          value={settings.transition}
          options={TRANSITIONS}
          onChange={(v) => updateSettings({ transition: v as TransitionType })}
        />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Beat Sync Cut */}
        <ToggleRow
          label="Beat Sync Cut"
          description="Potong clip sesuai beat musik"
          checked={settings.beatSyncCut}
          onChange={(v) => updateSettings({ beatSyncCut: v })}
        />

        {/* Randomize Order */}
        <ToggleRow
          label="Randomize Order"
          description="Acak urutan clip saat render"
          checked={settings.randomizeOrder}
          onChange={(v) => updateSettings({ randomizeOrder: v })}
        />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Visual EQ Toggle */}
        <ToggleRow
          label="Visual EQ"
          description="Tampilkan EQ overlay di video"
          checked={settings.visualEQ}
          onChange={(v) => updateSettings({ visualEQ: v })}
        />

        {/* EQ Options — only visible when visualEQ is enabled */}
        {settings.visualEQ && (
          <div className="space-y-3 pl-2 border-l-2 border-accent/20 ml-1">
            {/* EQ Style */}
            <ButtonGroup
              label="EQ Style"
              value={settings.eqStyle}
              options={EQ_STYLES}
              onChange={(v) => updateSettings({ eqStyle: v as EQStyle })}
            />

            {/* EQ Position */}
            <ButtonGroup
              label="Position"
              value={settings.eqPosition}
              options={EQ_POSITIONS}
              onChange={(v) =>
                updateSettings({
                  eqPosition: v as "bottom" | "top" | "center",
                })
              }
            />

            {/* EQ Color */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted">Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.eqColor}
                  onChange={(e) => updateSettings({ eqColor: e.target.value })}
                  className="w-6 h-6 rounded-sm border border-border cursor-pointer bg-transparent"
                />
                <span className="text-[10px] font-mono text-muted">
                  {settings.eqColor}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4K Warning */}
        {settings.exportQuality === "4K" && (
          <div className="bg-accent/5 border border-accent/20 rounded-btn p-2">
            <p className="text-[10px] font-mono text-accent leading-relaxed">
              ⚠️ 4K export akan lebih lambat di browser. Estimasi render 2–5
              menit tergantung durasi video.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Reusable sub-components ---

function SelectGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-mono text-muted block mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded-btn px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent/50 transition-colors cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-[11px] font-mono text-text block leading-tight">
          {label}
        </span>
        <span className="text-[10px] font-mono text-muted leading-tight">
          {description}
        </span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-8 h-[18px] rounded-full shrink-0 mt-0.5 transition-colors duration-200
          ${checked ? "bg-accent" : "bg-border"}
        `}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`
            absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-200
            ${checked ? "left-[15px] bg-bg" : "left-[2px] bg-muted"}
          `}
        />
      </button>
    </div>
  );
}

function ButtonGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="text-[11px] font-mono text-muted block mb-1.5">
        {label}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 text-[10px] font-mono py-1 px-1.5 rounded-btn transition-all
              ${
                value === opt.value
                  ? "bg-accent text-bg"
                  : "bg-bg text-muted border border-border hover:text-text"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
