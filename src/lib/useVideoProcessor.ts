import { useCallback, useRef, useState } from "react";
import {
  buildPayload,
  pollUntilDone,
  submitJob,
  validateTikTokUrl,
  type JobResponse,
  type JobStatus,
  type ProcessorSettings,
} from "@/lib/videoApi";

export type { ProcessorSettings } from "@/lib/videoApi";

/**
 * Real async state machine — no fake timers, no simulated phases.
 * Progress comes from the backend via `progress` field.
 */
export type ProcessorStatus = "idle" | JobStatus;

export interface ProcessedVideo {
  url: string;
  thumbnail: string | null;
  duration: number | null;
  jobId: string;
}

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
      setProgress(0);

      const invalid = validateTikTokUrl(url);
      if (invalid) {
        setError(invalid);
        setStatus("failed");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setStatus("uploading");
        const initial = await submitJob(buildPayload(url, settings), controller.signal);
        setStatus(initial.status);
        setProgress(initial.progress);

        if (initial.status === "completed" && initial.video_url) {
          setVideo({
            url: initial.video_url,
            thumbnail: initial.thumbnail_url,
            duration: initial.duration_seconds,
            jobId: initial.job_id,
          });
          setProgress(100);
          return;
        }

        const final = await pollUntilDone(
          initial.job_id,
          (job: JobResponse) => {
            setStatus(job.status);
            setProgress(job.progress);
          },
          controller.signal,
        );

        if (!final.video_url) throw new Error("Backend returned no video URL.");
        setVideo({
          url: final.video_url,
          thumbnail: final.thumbnail_url,
          duration: final.duration_seconds,
          jobId: final.job_id,
        });
        setStatus("completed");
        setProgress(100);
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        setStatus("failed");
      }
    },
    [],
  );

  return { status, progress, error, video, process, reset };
}
