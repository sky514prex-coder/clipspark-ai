export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} ClipRush AI — 100% free, forever.</p>
        <p>Open source. No accounts. No paywalls.</p>
      </div>
    </footer>
  );
}
