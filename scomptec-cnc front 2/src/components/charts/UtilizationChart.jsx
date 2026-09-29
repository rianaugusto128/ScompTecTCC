import { useId, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { summarizeUtilization } from "../../services/utilization";

const percent = value => value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const relativeTime = hours => hours === 0 ? "Agora" : `Há ${hours} h`;
const duration = seconds => seconds < 60 ? `${Math.round(seconds)} s` : seconds < 3600 ? `${(seconds / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min` : `${(seconds / 3600).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h`;

function AlertTooltip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="min-w-[210px] rounded-xl border border-base-border bg-base-surface p-4 text-xs shadow-xl">
    <p className="font-semibold text-text-primary">{point.ageHours === 0 ? "Última hora" : `De ${point.ageHours + 1} h atrás a ${point.ageHours} h atrás`}</p>
    {point.timestamp && <p className="mt-1 text-[10px] text-text-muted">Início: {new Date(point.timestamp).toLocaleString("pt-BR")}</p>}
    <div className="my-3 flex items-center justify-between gap-6 border-y border-base-border py-3">
      <span className="text-text-muted">Tempo em alerta</span><strong className="font-mono text-lg text-amber-400">{percent(point.alertRate)}</strong>
    </div>
    {[["Alarmes", point.ALARME, "text-amber-400"], ["Emergências", point.EMERGENCIA, "text-rose-400"], ["Operando", point.OPERANDO, "text-accent"]].map(([label, value, tone]) => <div key={label} className="mt-2 flex justify-between gap-6"><span className="text-text-muted">{label}</span><span className={`font-mono ${tone}`}>{percent(value)}</span></div>)}
    <p className="mt-3 text-[10px] text-text-muted">{duration(point.observed)} de tempo monitorado</p>
  </div>;
}

export default function UtilizationChart({ machines, data, loading, error }) {
  const [hours, setHours] = useState(24);
  const gradient = useId().replaceAll(":", "");
  const result = useMemo(() => summarizeUtilization(machines, hours, data), [machines, hours, data]);
  const chartData = useMemo(() => [...result.data].reverse(), [result.data]);
  const hasAlerts = result.alertRate > 0;
  const lineColor = hasAlerts ? "#FBBF24" : "#34D399";
  const statusLabel = result.observed === 0 ? "Sem histórico" : hasAlerts ? "Alertas no período" : "Sem alertas no período";
  const ticks = [0, hours / 4, hours / 2, hours * 3 / 4, hours];

  return <div className="w-full space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${result.observed === 0 ? "border-base-border text-text-muted" : hasAlerts ? "border-amber-400/20 bg-amber-400/5 text-amber-300" : "border-accent/20 bg-accent/5 text-accent"}`}>
        {hasAlerts ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}{statusLabel}
      </span>
      <div role="group" aria-label="Período do gráfico" className="flex gap-1 rounded-xl border border-base-border bg-base-bg/40 p-1">
        {[8, 12, 24].map(range => <button key={range} onClick={() => setHours(range)} aria-pressed={hours === range} className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${hours === range ? "bg-base-cardHover text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"}`}>{range}h</button>)}
      </div>
    </div>

    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Tempo em alerta</p>
        <div className="mt-1 flex items-baseline gap-2"><strong className={`font-mono text-4xl font-bold tracking-tight ${hasAlerts ? "text-amber-300" : "text-accent"}`}>{percent(result.alertRate)}</strong><span className="text-xs text-text-muted">nas últimas {hours}h</span></div>
      </div>
      <p className="max-w-[245px] text-xs leading-relaxed text-text-muted">Quanto maior a curva, maior a proporção de alarmes e emergências.</p>
    </div>

    {error && <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">Atualização interrompida. {result.observed > 0 ? "Exibindo o último histórico recebido. " : ""}{error}</p>}

    <div className="rounded-xl border border-base-border/70 bg-base-bg/30 px-2 pb-2 pt-4 sm:px-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2 text-[10px] text-text-muted">
        <span>ALARMES + EMERGÊNCIAS · % DO TEMPO MONITORADO</span>
        <span className="inline-flex items-center gap-1">Mais recente <ArrowRight size={12} /> Mais antigo</span>
      </div>
      {result.observed === 0 ? <div role="status" className="flex h-[260px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-text-muted">
        <Activity size={28} className="text-text-dim" />
        <p>{loading ? "Carregando histórico…" : result.samples ? "Leitura recebida. Aguarde a próxima atualização." : "Aguardando leituras no período selecionado."}</p>
        <p className="text-xs">Os alertas aparecerão aqui conforme a telemetria for recebida.</p>
      </div> : <div role="img" aria-label={`Alertas nas últimas ${hours} horas: ${percent(result.alertRate)} do tempo monitorado. Agora à esquerda; passado à direita. Zero significa sem alarmes ou emergências.`} className="h-[260px] w-full min-w-0 sm:h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 22, left: 0, bottom: 8 }} accessibilityLayer>
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineColor} stopOpacity={0.3} /><stop offset="100%" stopColor={lineColor} stopOpacity={0.015} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 6" stroke="#263244" vertical={false} />
            <XAxis dataKey="ageHours" type="number" domain={[0, hours]} ticks={ticks} tickFormatter={relativeTime} stroke="#8190A5" fontSize={10} tickLine={false} axisLine={false} tickMargin={12} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} stroke="#8190A5" fontSize={10} tickFormatter={value => `${value}%`} width={43} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="#34D399" strokeOpacity={0.5} strokeDasharray="4 4" />
            <Tooltip content={<AlertTooltip />} cursor={{ stroke: "#64748B", strokeDasharray: "4 4" }} filterNull={false} />
            <Area name="Tempo em alerta" dataKey="alertRate" type="linear" stroke={lineColor} fill={`url(#${gradient})`} strokeWidth={2.5} connectNulls={false} dot={{ r: 3, strokeWidth: 2, fill: "#111827" }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#111827" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-base-border/50 px-2 pt-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />0% · sem alarmes ou emergências</span>
        <span className="text-text-muted">Cada ponto resume 1 hora</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ["Pico de alertas", percent(result.peakAlertRate), AlertTriangle, "text-amber-300"],
        ["Tempo operando", duration(result.totals.OPERANDO), Activity, "text-accent"],
        ["Tempo em alerta", duration(result.totals.ALARME + result.totals.EMERGENCIA), Clock3, "text-text-primary"],
        ["Cobertura", percent(result.coverage), ShieldCheck, "text-text-primary"],
      ].map(([label, value, Icon, tone]) => <div key={label} className="rounded-xl border border-base-border/70 bg-base-surface/40 p-3"><div className="flex items-center justify-between gap-1 text-text-muted"><p className="text-[9px] font-semibold uppercase tracking-wide">{label}</p><Icon size={12} /></div><p className={`mt-2 font-mono text-lg font-semibold ${tone}`}>{value}</p></div>)}
    </div>
    <p className="text-[11px] leading-relaxed text-text-muted">{data ? "Demonstração. " : `${result.samples} leituras. `}Operação normal mantém a curva na base. Pausa, manutenção e desligamento não contam como alerta. Lacunas indicam ausência de dados; os tempos são somados entre as máquinas.</p>
  </div>;
}
