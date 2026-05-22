/**
 * Video Provider — GitHub Actions Backend (no CodeWords API key required)
 *
 * Submit: inserts job into Supabase, triggers GitHub Actions process-video.yml
 * Status: reads directly from Supabase video_jobs table
 */

import type { ProcessJobRequest, JobResponse, JobStatus } from "@/lib/videoApi";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface VideoProvider {
  submit(payload: ProcessJobRequest): Promise<JobResponse>;
  status(jobId: string): Promise<JobResponse>;
}

const GH_REPO     = "sky514prex-coder/clipspark-ai";
const GH_WORKFLOW = "process-video.yml";
const GH_REF      = "main";

function rowToJob(row: any): JobResponse {
  return {
    job_id:           row.id,
    status:           row.status as JobStatus,
    progress:         Math.max(0, Math.min(100, Number(row.progress ?? 0))),
    video_url:        row.video_url   ?? null,
    thumbnail_url:    row.thumbnail_url ?? null,
    duration_seconds: row.duration_seconds ?? null,
    error:            row.error ?? null,
  };
}

async function triggerGitHub(jobId: string, p: ProcessJobRequest): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn("[VideoProvider] GITHUB_TOKEN not set — job queued but processor not triggered");
    return;
  }
  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/actions/workflows/${GH_WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization:          `Bearer ${token}`,
        Accept:                 "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type":         "application/json",
      },
      body: JSON.stringify({
        ref: GH_REF,
        inputs: {
          job_id:         jobId,
          tiktok_url:     p.tiktok_url,
          color_grading:  String(p.color_grading_strength  ?? 65),
          motion_zoom:    String(p.motion_zoom_intensity   ?? 40),
          beat_sync:      String(p.beat_sync_enabled       ?? true),
          auto_subtitles: String(p.auto_subtitles          ?? true),
          subtitle_style: p.subtitle_style                 ?? "viral",
          watermark:      String(p.watermark_enabled       ?? false),
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub dispatch failed (${res.status}): ${body}`);
  }
}

const githubProvider: VideoProvider = {
  async submit(payload) {
    const { data, error } = await supabaseAdmin
      .from("video_jobs")
      .insert({
        tiktok_url: payload.tiktok_url,
        settings:   payload as any,
        status:     "queued",
        progress:   0,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const job = rowToJob(data);

    // Fire-and-forget — the UI immediately shows "queued" while Actions spins up
    triggerGitHub(job.job_id, payload).catch((err) => {
      console.error("[VideoProvider] GitHub trigger failed:", err);
      supabaseAdmin
        .from("video_jobs")
        .update({ status: "failed", error: `Trigger failed: ${String(err)}` })
        .eq("id", job.job_id)
        .catch(() => {});
    });

    return job;
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
        job_id: jobId, status: "failed", progress: 0,
        video_url: null, thumbnail_url: null, duration_seconds: null,
        error: "Unknown job id",
      };
    }
    return rowToJob(row);
  },
};

export const provider: VideoProvider = githubProvider;
