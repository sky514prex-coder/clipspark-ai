import { useRef, useState } from "react";
import { Download, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { ProcessedVideo } from "@/lib/useVideoProcessor";

export function VideoPreview({ video }: { video: ProcessedVideo | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const download = async () => {
    if (!video) return;
    try {
      setDownloading(true);
      const res = await fetch(video.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${video.title.replace(/\s+/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(video.url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-4">
      <div className="relative flex-1 overflow-hidden rounded-xl bg-black">
        {video ? (
          <video
            ref={ref}
            src={video.url}
            poster={video.thumbnail}
            muted={muted}
            playsInline
            className="h-full w-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <div className="grid h-full min-h-[360px] place-items-center text-center text-sm text-muted-foreground">
            <div>
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-primary opacity-50" />
              Your processed clip will appear here.
            </div>
          </div>
        )}

        {video && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-4">
            <button
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="flex-1 text-sm text-white/90">{video.title}</div>
            <div className="text-xs text-white/60">{video.duration}s</div>
          </div>
        )}
      </div>

      <button
        onClick={download}
        disabled={!video || downloading}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.01] hover:glow-cyan disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        <Download className="h-4 w-4" />
        {downloading ? "Preparing…" : "Download Video"}
      </button>
    </div>
  );
}
