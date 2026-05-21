import { motion } from "framer-motion";
import { Link2, Loader2, Sparkles } from "lucide-react";
import type { ProcessorStatus } from "@/lib/useVideoProcessor";

interface Props {
  url: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: ProcessorStatus;
  progress: number;
  error: string | null;
}

const STATUS_TEXT: Record<ProcessorStatus, string> = {
  idle: "Generate Clips",
  queued: "Queued…",
  uploading: "Uploading to engine…",
  processing: "Rendering with AI…",
  completed: "Open Result",
  failed: "Try Again",
};

export function UrlInput({ url, onChange, onSubmit, status, progress, error }: Props) {
  const busy = status === "queued" || status === "uploading" || status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative mx-auto w-full max-w-2xl"
    >
      <div className="absolute -inset-8 -z-10 animate-blob bg-gradient-blob blur-3xl" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onSubmit();
        }}
        className="glass-strong gradient-border relative flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-3 px-3">
          <Link2 className="h-5 w-5 shrink-0 text-neon-cyan" />
          <input
            type="url"
            value={url}
            onChange={(e) => onChange(e.target.value)}
            disabled={busy}
            placeholder="Paste your TikTok link here…"
            className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url}
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02] hover:glow-cyan disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {STATUS_TEXT[status]}
        </button>
      </form>

      {(busy || status === "completed") && (
        <div className="mt-4 px-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-primary"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{STATUS_TEXT[status]}</span>
            <span className="tabular-nums">{progress}%</span>
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-destructive">{error}</p>
      )}
    </motion.div>
  );
}
