import { motion } from "framer-motion";
import { Link2, Cpu, Download } from "lucide-react";

const steps = [
  { icon: Link2, title: "Paste Link", desc: "Drop any TikTok URL into ClipRush." },
  { icon: Cpu, title: "AI Processes via API", desc: "Our pipeline analyzes, cuts, grades, and captions." },
  { icon: Download, title: "Download Viral Clips", desc: "Export cinema-ready edits in seconds." },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          From link to <span className="text-gradient">viral</span> in 3 steps
        </h2>
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-neon-cyan/40 to-transparent md:block" />
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="glass relative rounded-2xl p-8 text-center"
            >
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground glow-cyan">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="text-xs uppercase tracking-widest text-neon-cyan">
                Step {i + 1}
              </div>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
