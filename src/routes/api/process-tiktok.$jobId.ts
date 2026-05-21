import { createFileRoute } from "@tanstack/react-router";
import { provider } from "@/server/videoProvider.server";

export const Route = createFileRoute("/api/process-tiktok/$jobId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const jobId = params.jobId;
        if (!jobId || jobId.length > 200) {
          return Response.json({ error: "Invalid job id" }, { status: 400 });
        }
        try {
          const job = await provider.status(jobId);
          return Response.json(job);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Status failed";
          return Response.json({ error: msg }, { status: 502 });
        }
      },
    },
  },
});
