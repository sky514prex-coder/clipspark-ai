/**
 * ============================================================================
 * Video Provider Adapter — PLUG YOUR REAL ENGINE HERE
 * ============================================================================
 *
 * This file is the seam between our app and a real video-rendering backend.
 * The default implementation is a development stub that returns a job id and
 * exposes a polling endpoint reporting progress. It does NOT edit video.
 *
 * To go production-ready, implement ONE of these providers and export it as
 * `provider` below:
 *
 *   • Shotstack          https://shotstack.io/docs/api/  (recommended for
 *                        URL → rendered edit with captions/zoom/color)
 *   • Creatomate         https://creatomate.com/docs/api
 *   • Replicate          https://replicate.com/docs  (for AI models:
 *                        whisper subtitles, RVM background, etc.)
 *
 * Required secret (add via Lovable secrets, NEVER commit):
 *   SHOTSTACK_API_KEY   or   CREATOMATE_API_KEY   or   REPLICATE_API_TOKEN
 *
 * Read with: process.env.SHOTSTACK_API_KEY
 * ============================================================================
 */

import type { ProcessJobRequest, JobResponse } from "@/lib/videoApi";

export interface VideoProvider {
  submit(payload: ProcessJobRequest): Promise<JobResponse>;
  status(jobId: string): Promise<JobResponse>;
}

/* ---------------------------------------------------------------------------
 * STUB PROVIDER (default in dev). Replace with a real one below.
 * Stores jobs in-memory and reports linear progress so the full UI flow
 * (submit → poll → completed → download) works end-to-end.
 * --------------------------------------------------------------------------- */

interface StubJob {
  startedAt: number;
  payload: ProcessJobRequest;
}
const stubJobs = new Map<string, StubJob>();
const STUB_DURATION_MS = 8_000;

const stubProvider: VideoProvider = {
  async submit(payload) {
    const jobId = `stub_${crypto.randomUUID()}`;
    stubJobs.set(jobId, { startedAt: Date.now(), payload });
    return {
      job_id: jobId,
      status: "queued",
      progress: 0,
      video_url: null,
      thumbnail_url: null,
      duration_seconds: null,
      error: null,
    };
  },
  async status(jobId) {
    const job = stubJobs.get(jobId);
    if (!job) {
      return {
        job_id: jobId,
        status: "failed",
        progress: 0,
        video_url: null,
        thumbnail_url: null,
        duration_seconds: null,
        error: "Unknown job id",
      };
    }
    const elapsed = Date.now() - job.startedAt;
    const pct = Math.min(100, Math.round((elapsed / STUB_DURATION_MS) * 100));
    if (pct < 100) {
      return {
        job_id: jobId,
        status: pct < 15 ? "uploading" : "processing",
        progress: pct,
        video_url: null,
        thumbnail_url: null,
        duration_seconds: null,
        error: null,
      };
    }
    return {
      job_id: jobId,
      status: "completed",
      progress: 100,
      // Dev-only sample so the player & download button are testable.
      // This is NOT an edit of the user's TikTok — replace with a real provider.
      video_url:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      thumbnail_url:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
      duration_seconds: 30,
      error: null,
    };
  },
};

/* ---------------------------------------------------------------------------
 * SHOTSTACK PROVIDER — reference implementation (commented).
 * Uncomment and export as `provider` once SHOTSTACK_API_KEY is set.
 * --------------------------------------------------------------------------- */
/*
const SHOTSTACK_BASE = "https://api.shotstack.io/edit/stage"; // or /v1 for prod
const shotstackProvider: VideoProvider = {
  async submit(payload) {
    const apiKey = process.env.SHOTSTACK_API_KEY;
    if (!apiKey) throw new Error("SHOTSTACK_API_KEY is not configured");

    // Build a Shotstack edit JSON from our settings.
    // Docs: https://shotstack.io/docs/api/#tag/Edit
    const edit = {
      timeline: {
        tracks: [
          {
            clips: [
              {
                asset: { type: "video", src: payload.tiktok_url },
                start: 0,
                length: "auto",
                filter: payload.color_grading_strength > 50 ? "boost" : "muted",
              },
            ],
          },
        ],
      },
      output: { format: "mp4", resolution: "hd" },
    };

    const res = await fetch(`${SHOTSTACK_BASE}/render`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || `Shotstack submit ${res.status}`);

    return {
      job_id: json.response.id,
      status: "queued",
      progress: 0,
      video_url: null,
      thumbnail_url: null,
      duration_seconds: null,
      error: null,
    };
  },
  async status(jobId) {
    const apiKey = process.env.SHOTSTACK_API_KEY!;
    const res = await fetch(`${SHOTSTACK_BASE}/render/${jobId}`, {
      headers: { "x-api-key": apiKey },
    });
    const json = await res.json();
    const s = json.response;
    const map: Record<string, JobResponse["status"]> = {
      queued: "queued", fetching: "uploading", rendering: "processing",
      saving: "processing", done: "completed", failed: "failed",
    };
    return {
      job_id: jobId,
      status: map[s.status] ?? "processing",
      progress: s.status === "done" ? 100 : s.status === "rendering" ? 60 : 20,
      video_url: s.url ?? null,
      thumbnail_url: s.poster ?? null,
      duration_seconds: s.duration ?? null,
      error: s.error ?? null,
    };
  },
};
*/

// Swap this export to switch providers.
export const provider: VideoProvider = stubProvider;
