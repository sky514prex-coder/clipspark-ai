/**
 * ============================================================================
 * Video Provider Adapter — persists job state in Supabase
 * ============================================================================
 *
 * Jobs are stored in `public.video_jobs` via the service-role admin client.
 * The stub still simulates progress, but every read/write now goes through
 * Supabase so jobs survive reloads, restarts, and multiple worker instances.
 *
 * To switch to a real engine (Shotstack / Creatomate / Replicate):
 *   1. Implement submit() to call the provider API and store provider_job_id.
 *   2. Implement status() to fetch the provider status and update the row.
 * ============================================================================
 */

import type { ProcessJobRequest, JobResponse, JobStatus } from "@/lib/videoApi";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface VideoProvider {
  submit(payload: ProcessJobRequest): Promise<JobResponse>;
  status(jobId: string): Promise<JobResponse>;
}

const STUB_DURATION_MS = 8_000;

function rowToJob(row: any): JobResponse {
  return {
    job_id: row.id,
    status: row.status as JobStatus,
    progress: row.progress ?? 0,
    video_url: row.video_url,
    thumbnail_url: row.thumbnail_url,
    duration_seconds: row.duration_seconds,
    error: row.error,
  };
}

const stubProvider: VideoProvider = {
  async submit(payload) {
    const { data, error } = await supabaseAdmin
      .from("video_jobs")
      .insert({
        tiktok_url: payload.tiktok_url,
        settings: payload as any,
        status: "queued",
        progress: 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToJob(data);
  },

  async status(jobId) {
    const { data: row, error } = await supabaseAdmin
      .from("video_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) {
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

    // Already finished — return persisted state.
    if (row.status === "completed" || row.status === "failed") {
      return rowToJob(row);
    }

    // Simulate progress based on created_at, persist updates.
    const elapsed = Date.now() - new Date(row.created_at).getTime();
    const pct = Math.min(100, Math.round((elapsed / STUB_DURATION_MS) * 100));

    const patch: Record<string, any> =
      pct < 100
        ? {
            status: pct < 15 ? "uploading" : "processing",
            progress: pct,
          }
        : {
            status: "completed",
            progress: 100,
            video_url:
              "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            thumbnail_url:
              "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
            duration_seconds: 30,
          };

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("video_jobs")
      .update(patch)
      .eq("id", jobId)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);
    return rowToJob(updated);
  },
};

export const provider: VideoProvider = stubProvider;
