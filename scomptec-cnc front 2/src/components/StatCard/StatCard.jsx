export default function StatCard({ label, value, icon: Icon, tone = "default", suffix, hint, trend }) {
  const toneText = {
    default: "text-text-primary",
    run: "text-accent",
    idle: "text-amber-400",
    danger: "text-rose-400",
    green: "text-accent",
  }[tone] || "text-text-primary";

  const iconStyles = {
    default: "bg-accent/10 border-accent/20 text-accent",
    run: "bg-accent/15 border-accent/30 text-accent shadow-glowGreenSm",
    idle: "bg-amber-400/10 border-amber-400/20 text-amber-400",
    danger: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    green: "bg-accent/15 border-accent/30 text-accent shadow-glowGreenSm",
  }[tone] || "bg-accent/10 border-accent/20 text-accent";

  return (
    <div className="panel group p-5 flex flex-col justify-between hover:border-accent/30 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent/90">{label}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`data-mono text-3xl font-extrabold tracking-tight ${toneText}`}>
              {value}
            </span>
            {suffix && <span className="text-xs font-semibold text-text-muted">{suffix}</span>}
          </div>
          {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
        </div>

        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${iconStyles}`}>
            <Icon size={19} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-base-border/70 pt-2.5 text-[11px] text-text-muted">
          <span className="text-accent font-semibold">{trend}</span>
          <span>vs período anterior</span>
        </div>
      )}
    </div>
  );
}

