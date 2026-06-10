const Loader = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex flex-col items-center gap-3 py-12" role="status">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />
    <span className="font-mono text-xs text-ink-3">{label}</span>
  </div>
);

export default Loader;
