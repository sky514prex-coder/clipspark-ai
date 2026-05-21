import { createFileRoute } from "@tanstack/react-router";

// Placeholder backend. Replace with real TikTok processing pipeline.
// Returns a working sample video URL so the UI is end-to-end functional.
export const Route = createFileRoute("/api/process-tiktok")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: string; settings?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const url = (body.url ?? "").trim();
        if (!/^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/.+/i.test(url)) {
          return Response.json({ error: "Invalid TikTok link" }, { status: 400 });
        }

        // Simulate server-side work
        await new Promise((r) => setTimeout(r, 800));

        return Response.json({
          url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          title: "ClipRush Edit — Viral Cut",
          duration: 32,
          thumbnail:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
        });
      },
    },
  },
});
