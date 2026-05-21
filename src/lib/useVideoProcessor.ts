import { useCallback, useRef, useState } from "react";

export type ProcessorStatus =
  | "idle"
  | "validating"
  | "fetching"
  | "processing"
  | "ready"
  | "error";

export interface ProcessorSettings {
  colorGrading: number;
  zoomIntensity: number;
  beatSync: boolean;
  watermark: boolean;
  subtitleStyle: "minimal" | "bold" | "neon" | "viral";
}

export interface ProcessedVideo {
  url: string;
  title: string;
  duration: number;
  thumbnail?: string;
}

const TIKTOK_REGEX = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i;

export function useVideoProcessor() {
  const [status, setStatus] = useState<ProcessorStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<ProcessedVideo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setProgress(0);
    setError(null);
    setVideo(null);
  }, []);

  const process = useCallback(
    async (url: string, settings: ProcessorSettings) => {
      setError(null);
      setVideo(null);
      setProgress(5);
      setStatus("validating");

      if (!url || !TIKTOK_REGEX.test(url.trim())) {
        setError("Invalid TikTok link. Please paste a valid tiktok.com URL.");
        setStatus("error");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Simulated progress stream while awaiting backend
      const phases: Array<{ status: ProcessorStatus; target: number; delay: number }> = [
        { status: "fetching", target: 35, delay: 400 },
        { status: "processing", target: 85, delay: 600 },
      ];

      const runPhase = async (phase: (typeof phases)[number]) => {
        setStatus(phase.status);
        await new Promise<void>((resolve) => {
          const step = () => {
            setProgress((p) => {
              const next = Math.min(phase.target, p + Math.random() * 6 + 2);
              if (next >= phase.target) {
                resolve();
                return next;
              }
              setTimeout(step, phase.delay / 10);
              return next;
            });
          };
          step();
        });
      };

      try {
        for (const phase of phases) {
          if (controller.signal.aborted) return;
          await runPhase(phase);
        }

        // Real fetch to backend API
        const timeout = setTimeout(() => controller.abort(), 30_000);
        const res = await fetch("/api/process-tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), settings }),
          signal: controller.signal,
        }).catch((e) => {
          if (e.name === "AbortError") throw new Error("API timeout. Try again.");
          throw new Error("Network error. Check your connection.");
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Processing failed (${res.status})`);
        }

        const data = (await res.json()) as ProcessedVideo;
        setProgress(100);
        setVideo(data);
        setStatus("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        setStatus("error");
      }
    },
    [],
  );

  return { status, progress, error, video, process, reset };
}
