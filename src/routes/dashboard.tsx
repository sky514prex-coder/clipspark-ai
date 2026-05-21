import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { VideoPreview } from "@/components/VideoPreview";
import { UrlInput } from "@/components/UrlInput";
import { useVideoProcessor, type ProcessorSettings } from "@/lib/useVideoProcessor";

const searchSchema = z.object({
  url: z.string().optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Studio — ClipRush AI" },
      {
        name: "description",
        content: "The ClipRush AI studio: generate, tune, and export viral cinematic clips.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { url: initialUrl } = Route.useSearch();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [settings, setSettings] = useState<ProcessorSettings>({
    colorGrading: 65,
    zoomIntensity: 40,
    beatSync: true,
    watermark: false,
    subtitleStyle: "viral",
  });

  const { status, progress, error, video, process } = useVideoProcessor();
  const busy = status === "validating" || status === "fetching" || status === "processing";

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[700px] animate-blob bg-gradient-blob blur-3xl" />

      <div className="relative mx-auto flex max-w-[1600px] gap-4 p-4">
        <DashboardSidebar />

        <main className="flex-1">
          <header className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Paste a TikTok link, tune the AI, and export your viral edit.
            </p>
          </header>

          <div className="mb-6">
            <UrlInput
              url={url}
              onChange={setUrl}
              onSubmit={() => process(url, settings)}
              status={status}
              progress={progress}
              error={error}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <SettingsPanel settings={settings} onChange={setSettings} disabled={busy} />
            <VideoPreview video={video} />
          </div>
        </main>
      </div>
    </div>
  );
}
