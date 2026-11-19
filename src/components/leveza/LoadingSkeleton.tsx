export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando">
      <div className="skeleton h-28 rounded-card" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-card" />
      ))}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
