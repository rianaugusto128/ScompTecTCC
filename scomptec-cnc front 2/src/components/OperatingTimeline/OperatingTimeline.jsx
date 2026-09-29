import { formatDuration } from "../../utils/time";

const CONFIG = {
  OPERANDO: { label: "Operando", color: "bg-accent shadow-[0_0_6px_#10B981]", text: "text-accent" },
  PARADA: { label: "Parada", color: "bg-slate-600", text: "text-slate-400" },
  ALARME: { label: "Alarme", color: "bg-amber-500", text: "text-amber-400" },
  EMERGENCIA: { label: "Emergência", color: "bg-rose-500", text: "text-rose-400" },
  SEM_REGISTRO: { label: "Sem registro", color: "bg-base-surface", text: "text-text-muted" },
};

const time = (date) => date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function OperatingTimeline({ machine }) {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const elapsedToday = Math.max(1, Math.floor((now - midnight) / 1000));
  const operating = machine.operatingTimeToday || 0;
  const stopped = machine.stoppedTimeToday || 0;
  const alarm = machine.alarmTimeToday || 0;
  const emergency = machine.emergencyTimeToday || 0;
  const recorded = operating + stopped + alarm + emergency;
  const scale = recorded > elapsedToday ? elapsedToday / recorded : 1;
  const untracked = Math.max(0, elapsedToday - recorded * scale);

  const parts = [
    ["SEM_REGISTRO", untracked],
    ["OPERANDO", operating * 0.68 * scale],
    ["PARADA", stopped * scale],
    ["OPERANDO", operating * 0.32 * scale],
    ["ALARME", alarm * scale],
    ["EMERGENCIA", emergency * scale],
  ].filter(([, seconds]) => seconds > 0);

  let cursor = midnight.getTime();
  const segments = parts.map(([status, seconds], index) => {
    const start = new Date(cursor);
    cursor += seconds * 1000;
    const end = index === parts.length - 1 ? now : new Date(cursor);
    return { status, seconds, start, end };
  });

  return (
    <section className="panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-base-border/70 pb-3">
        <div>
          <h2 className="text-sm font-bold text-text-primary">Linha do Tempo Operacional (Hoje)</h2>
          <p className="text-xs text-text-muted">Passe o cursor sobre os segmentos para auditar os intervalos de produção.</p>
        </div>
        <span className="font-mono text-[11px] text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
          24H AUDIT
        </span>
      </div>

      <div className="pt-2">
        <div className="relative flex h-10 overflow-visible rounded-lg bg-base-surface border border-base-border/80 p-0.5">
          {segments.map((segment, index) => {
            const cfg = CONFIG[segment.status] || CONFIG.SEM_REGISTRO;
            const pct = Math.max(0.5, (segment.seconds / elapsedToday) * 100);

            return (
              <div
                key={`${segment.status}-${index}`}
                className={`group relative min-w-[3px] transition-all duration-150 hover:brightness-125 ${cfg.color} ${
                  index === 0 ? "rounded-l-md" : ""
                } ${index === segments.length - 1 ? "rounded-r-md" : ""}`}
                style={{ width: `${pct}%` }}
              >
                {/* Hover Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2.5 hidden w-48 -translate-x-1/2 rounded-xl border border-base-border bg-base-surface/95 p-3 text-left shadow-panel backdrop-blur-xl group-hover:block animate-fadeUp">
                  <div className="flex items-center gap-2 border-b border-base-border/70 pb-1.5 mb-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.color}`} />
                    <strong className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</strong>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="block text-[11px] text-text-muted">
                      {time(segment.start)} → {time(segment.end)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-text-dim">Duração</span>
                    <span className="data-mono block font-bold text-text-primary">
                      {formatDuration(segment.seconds, { showSeconds: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hour Ticks */}
        <div className="mt-2 flex justify-between font-mono text-[10px] text-text-muted">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span className="text-accent font-semibold">AGORA</span>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-base-border/70 pt-3">
          {Object.entries(CONFIG)
            .filter(([key]) => key !== "SEM_REGISTRO")
            .map(([key, cfg]) => (
              <span key={key} className="inline-flex items-center gap-2 text-xs text-text-secondary">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
                <span>{cfg.label}</span>
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}

