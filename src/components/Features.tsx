import { motion } from "framer-motion";
import {
  Scissors,
  Palette,
  Captions,
  ZoomIn,
  Music2,
  Stamp,
} from "lucide-react";

const features = [
  { icon: Scissors, title: "AI Clip Detection", desc: "Auto-detects the most viral moments from any TikTok." },
  { icon: Palette, title: "Cinematic Color Grading", desc: "Hollywood-grade LUTs applied intelligently per scene." },
  { icon: Captions, title: "Smart Captions", desc: "Word-by-word animated subtitles tuned for retention." },
  { icon: ZoomIn, title: "Dynamic Zoom", desc: "Beat-aware punch-ins that keep eyes glued to the screen." },
  { icon: Music2, title: "Beat Sync Engine", desc: "Cuts perfectly aligned to the audio waveform." },
  { icon: Stamp, title: "Watermark Branding", desc: "Subtle, customizable watermarks that scale your brand." },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="mb-14 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-balance text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Built for <span className="text-gradient">viral retention</span>
        </motion.h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Every clip is processed by a stack of AI models optimized for short-form virality.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            whileHover={{ y: -6 }}
            className="glass group relative overflow-hidden rounded-2xl p-6 transition-all hover:border-neon-cyan/30"
          >
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-primary opacity-0 blur-3xl transition-opacity group-hover:opacity-30" />
            <div className="relative">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
