import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { provider } from "@/server/videoProvider.server";

const schema = z.object({
  tiktok_url: z.string().url().max(2048),
  color_grading_strength: z.number().min(0).max(100),
  motion_zoom_intensity: z.number().min(0).max(100),
  beat_sync_enabled: z.boolean(),
  auto_subtitles: z.boolean(),
  subtitle_style: z.enum(["minimal", "bold", "neon", "viral"]),
  watermark_enabled: z.boolean(),
});

export const Route = createFileRoute("/api/process-tiktok")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        if (!/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i.test(parsed.data.tiktok_url)) {
          return Response.json({ error: "URL must be a tiktok.com link" }, { status: 400 });
        }
        try {
          const job = await provider.submit(parsed.data);
          return Response.json(job);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Submit failed";
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
