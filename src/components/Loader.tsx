/** Minimal crescent-moon spinner (CSS only — replaces the old three.js moon). */
const Loader = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex flex-col items-center gap-3 py-12" role="status">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
    <span className="text-sm text-zinc-500">{label}</span>
  </div>
);

export default Loader;
