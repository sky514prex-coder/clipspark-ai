/**
 * ============================================================================
 * Video Provider Adapter — persists job state in Supabase
 * ============================================================================
 *
 * Jobs are stored in `public.video_jobs` via the service-role admin client.
 * CodeWords owns the actual render pipeline and writes status/progress/output
 * back into Supabase. This adapter no longer simulates completion.
 *
 * If CODEWORDS_API_KEY is available in the server environment, this adapter can
 * call the public CodeWords API directly. Otherwise it queues jobs in Supabase
 * for the deployed backend worker to pick up and polls the persisted row.
 * ============================================================================
 */

import type { ProcessJobRequest, JobResponse, JobStatus } from "@/lib/videoApi";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface VideoProvider {
  submit(payload: ProcessJobRequest): Promise<JobResponse>;
  status(jobId: string): Promise<JobResponse>;
}

const STUB_DURATION_MS = 8_000;
const DEFAULT_CODEWORDS_URL = "https://runtime.codewords.ai/run/cliprush_api_579b7a01";

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

function normalizeJob(job: Partial<JobResponse> & { id?: string }): JobResponse {
  return {
    job_id: job.job_id ?? job.id ?? "",
    status: (job.status ?? "queued") as JobStatus,
    progress: Math.max(0, Math.min(100, Number(job.progress ?? 0))),
    video_url: job.video_url ?? null,
    thumbnail_url: job.thumbnail_url ?? null,
    duration_seconds: job.duration_seconds ?? null,
    error: job.error ?? null,
  };
}

async function callCodewords(path: string, init?: RequestInit): Promise<JobResponse> {
  const apiKey = process.env.CODEWORDS_API_KEY;
  if (!apiKey) throw new Error("CODEWORDS_API_KEY is not configured");

  const baseUrl = process.env.CODEWORDS_URL || DEFAULT_CODEWORDS_URL;
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(async () => ({ error: await res.text().catch(() => "") }));
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `CodeWords request failed (${res.status})`);
  }
  return normalizeJob(body);
}

const supabaseQueueProvider: VideoProvider = {
  async submit(payload) {
    if (process.env.CODEWORDS_API_KEY) {
      return callCodewords("", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

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
    if (process.env.CODEWORDS_API_KEY) {
      return callCodewords(`/jobs/${encodeURIComponent(jobId)}`);
    }

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
    return rowToJob(row);
  },
};

export const provider: VideoProvider = supabaseQueueProvider;
