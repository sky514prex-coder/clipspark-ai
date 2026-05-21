import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AIParticles } from "@/components/AIParticles";
import { UrlInput } from "@/components/UrlInput";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { useVideoProcessor, type ProcessorSettings } from "@/lib/useVideoProcessor";

const DEFAULT_SETTINGS: ProcessorSettings = {
  colorGrading: 65,
  zoomIntensity: 40,
  beatSync: true,
  watermark: false,
  subtitleStyle: "viral",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipRush AI — Turn TikTok Links Into Viral Edits" },
      {
        name: "description",
        content:
          "100% free AI tool that turns TikTok links into cinematic, high-retention viral edits in seconds.",
      },
      { property: "og:title", content: "ClipRush AI — Viral Edits From Any TikTok Link" },
      {
        property: "og:description",
        content: "Free AI editor for creators. Paste a TikTok link, get cinematic clips.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const { status, progress, error, process } = useVideoProcessor();

  const handleSubmit = async () => {
    if (status === "ready") {
      navigate({ to: "/dashboard", search: { url } });
      return;
    }
    await process(url, DEFAULT_SETTINGS);
    // On success, jump to studio
    setTimeout(() => {
      navigate({ to: "/dashboard", search: { url } });
    }, 600);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 animate-blob bg-gradient-blob blur-3xl" />

      <Navbar />

      <main>
        <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
          <AIParticles count={28} />
          <div className="relative text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan" />
              100% Free · No signup · Open Source
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
            >
              Turn TikTok Links Into{" "}
              <span className="text-gradient">Viral Edits</span> With AI.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground"
            >
              A 100% free, powerful tool to instantly generate high-retention cinematic edits.
            </motion.p>

            <div className="mt-10">
              <UrlInput
                url={url}
                onChange={setUrl}
                onSubmit={handleSubmit}
                status={status}
                progress={progress}
                error={error}
              />
            </div>
          </div>
        </section>

        <Features />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}
