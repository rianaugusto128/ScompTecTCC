export default function LoadingState({ rows = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Carregando dados">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 w-full animate-pulse rounded-xl border border-base-border/70 bg-base-card/60 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-loadBar" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-lg border border-base-border/70 bg-base-card/60 ${className}`}
    />
  );
}

