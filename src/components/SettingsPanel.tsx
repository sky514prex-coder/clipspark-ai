import { motion } from "framer-motion";
import type { ProcessorSettings } from "@/lib/useVideoProcessor";

interface Props {
  settings: ProcessorSettings;
  onChange: (s: ProcessorSettings) => void;
  disabled?: boolean;
}

const SUBTITLE_OPTIONS: ProcessorSettings["subtitleStyle"][] = [
  "minimal",
  "bold",
  "neon",
  "viral",
];

export function SettingsPanel({ settings, onChange, disabled }: Props) {
  const update = <K extends keyof ProcessorSettings>(key: K, value: ProcessorSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="glass flex h-full flex-col gap-6 rounded-2xl p-6">
      <div>
        <h3 className="text-lg font-semibold">Edit Settings</h3>
        <p className="text-xs text-muted-foreground">
          These parameters are sent to the AI pipeline on each generation.
        </p>
      </div>

      <Slider
        label="Color Grading Strength"
        value={settings.colorGrading}
        onChange={(v) => update("colorGrading", v)}
        disabled={disabled}
      />
      <Slider
        label="Dynamic Zoom Intensity"
        value={settings.zoomIntensity}
        onChange={(v) => update("zoomIntensity", v)}
        disabled={disabled}
      />

      <Toggle
        label="Beat Sync Engine"
        description="Cut on the beat"
        value={settings.beatSync}
        onChange={(v) => update("beatSync", v)}
        disabled={disabled}
      />
      <Toggle
        label="Watermark Branding"
        description="Add ClipRush watermark"
        value={settings.watermark}
        onChange={(v) => update("watermark", v)}
        disabled={disabled}
      />

      <div>
        <label className="mb-2 block text-sm font-medium">Subtitle Style</label>
        <div className="grid grid-cols-2 gap-2">
          {SUBTITLE_OPTIONS.map((opt) => {
            const active = settings.subtitleStyle === opt;
            return (
              <button
                key={opt}
                disabled={disabled}
                onClick={() => update("subtitleStyle", opt)}
                className={`rounded-xl border px-3 py-2 text-sm capitalize transition-all disabled:opacity-50 ${
                  active
                    ? "border-transparent bg-gradient-primary text-primary-foreground glow-cyan"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-neon-cyan tabular-nums">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[oklch(0.85_0.2_200)] disabled:opacity-50"
        style={{
          background: `linear-gradient(to right, var(--neon-cyan) 0%, var(--neon-purple) ${value}%, oklch(1 0 0 / 0.1) ${value}%)`,
          height: 4,
          borderRadius: 999,
          appearance: "none",
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.94 }}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          value ? "bg-gradient-primary glow-cyan" : "bg-muted"
        }`}
      >
        <motion.span
          layout
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}
