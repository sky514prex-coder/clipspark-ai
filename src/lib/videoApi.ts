/**
 * ============================================================================
 * ClipRush AI — Video Processing Service Layer
 * ============================================================================
 *
 * This module is the SINGLE point of integration between the frontend and your
 * real video-processing backend. It is provider-agnostic: swap the default
 * export with Shotstack / Creatomate / Replicate / your own FFmpeg worker
 * without touching any React code.
 *
 * The frontend NEVER calls a third-party API directly. It calls our own
 * TanStack server route (`/api/process-tiktok`) which holds the secret API
 * key in `process.env` and forwards to the chosen provider.
 *
 * ----------------------------------------------------------------------------
 * To plug in your real engine:
 *   1. Pick a provider in `src/server/videoProviders/` (or add a new one).
 *   2. Add your secret via Lovable secrets (e.g. SHOTSTACK_API_KEY).
 *   3. Set VIDEO_PROVIDER env to "shotstack" | "creatomate" | "replicate".
 *   4. The frontend is already wired — no UI changes needed.
 * ----------------------------------------------------------------------------
 */

export interface ProcessorSettings {
  colorGrading: number;          // 0–100
  zoomIntensity: number;         // 0–100
  beatSync: boolean;
  watermark: boolean;
  subtitleStyle: "minimal" | "bold" | "neon" | "viral";
}

/**
 * Exact JSON payload the frontend POSTs to /api/process-tiktok.
 * Mirror this shape in your backend / provider adapter.
 */
export interface ProcessJobRequest {
  tiktok_url: string;
  color_grading_strength: number;   // 0–100
  motion_zoom_intensity: number;    // 0–100
  beat_sync_enabled: boolean;
  auto_subtitles: boolean;
  subtitle_style: ProcessorSettings["subtitleStyle"];
  watermark_enabled: boolean;
}

/**
 * Job lifecycle. Mirrors what real render APIs (Shotstack, Creatomate) return.
 */
export type JobStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  progress: number;        // 0–100, returned by the backend
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error: string | null;
}

const TIKTOK_REGEX = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i;

export function buildPayload(
  url: string,
  s: ProcessorSettings,
): ProcessJobRequest {
  return {
    tiktok_url: url.trim(),
    color_grading_strength: s.colorGrading,
    motion_zoom_intensity: s.zoomIntensity,
    beat_sync_enabled: s.beatSync,
    auto_subtitles: true,
    subtitle_style: s.subtitleStyle,
    watermark_enabled: s.watermark,
  };
}

export function validateTikTokUrl(url: string): string | null {
  if (!url || !url.trim()) return "Please paste a TikTok link.";
  if (!TIKTOK_REGEX.test(url.trim()))
    return "Not a valid TikTok URL. Expected tiktok.com / vm.tiktok.com / vt.tiktok.com.";
  return null;
}

/* ---------------------------------------------------------------------------
 * Client-side service: submit a job + poll until completion.
 * Backend contract:
 *   POST /api/process-tiktok           -> { job_id, status, progress, ... }
 *   GET  /api/process-tiktok/:job_id   -> { job_id, status, progress, ... }
 * --------------------------------------------------------------------------- */

export async function submitJob(
  payload: ProcessJobRequest,
  signal?: AbortSignal,
): Promise<JobResponse> {
  const res = await fetch("/api/process-tiktok", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  const body = (await res.json().catch(() => ({}))) as Partial<JobResponse> & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(body.error || `Submit failed (HTTP ${res.status})`);
  }
  return body as JobResponse;
}

export async function pollJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobResponse> {
  const res = await fetch(`/api/process-tiktok/${encodeURIComponent(jobId)}`, {
    signal,
  });
  const body = (await res.json().catch(() => ({}))) as Partial<JobResponse> & {
    error?: string;
  };
  if (!res.ok) throw new Error(body.error || `Poll failed (HTTP ${res.status})`);
  return body as JobResponse;
}

/**
 * Poll a job until completion or failure, calling `onUpdate` on every tick.
 * Uses exponential backoff capped at 4s; aborts cleanly via AbortSignal.
 */
export async function pollUntilDone(
  jobId: string,
  onUpdate: (job: JobResponse) => void,
  signal?: AbortSignal,
): Promise<JobResponse> {
  let delay = 1000;
  // Hard timeout: 15 minutes for real TikTok download, transcription, render, and upload.
  const deadline = Date.now() + 15 * 60_000;

  while (true) {
    if (signal?.aborted) throw new Error("Aborted");
    if (Date.now() > deadline) throw new Error("Render timed out after 15 minutes.");

    const job = await pollJob(jobId, signal);
    onUpdate(job);

    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.error || "Render failed on the backend.");
    }

    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 4000);
  }
}
