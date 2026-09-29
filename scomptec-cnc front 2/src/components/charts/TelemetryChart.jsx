import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

const ANALOG = [
  { key: "current", label: "Corrente", unit: "A", limit: "currentLimit" },
  { key: "temperature", label: "Temperatura", unit: "°C", limit: "temperatureLimit" },
  { key: "powerKw", label: "Potência", unit: "kW" },
  { key: "voltage", label: "Tensão", unit: "V" },
];

export default function TelemetryChart({ machine }) {
  const [selected, setSelected] = useState(null);
  const samples = machine.telemetryBuffer || [];
  const signals = [...new Set(samples.flatMap(sample => Object.keys(sample.digital || {})))].sort();
  const options = [
    ...ANALOG,
    { key: "machineActive", label: "Ciclo da máquina", digital: true },
    ...signals.map(signal => ({ key: `digital:${signal}`, signal, label: signal.replaceAll("_", " "), digital: true })),
  ];
  const valueOf = (sample, option) => option.signal ? sample.digital?.[option.signal] ?? null : sample[option.key] ?? null;
  const metric = options.find(option => option.key === selected)
    || options.find(option => samples.some(sample => valueOf(sample, option) !== null)) || options[0];
  const data = samples.map(sample => ({ ...sample, value: valueOf(sample, metric) }));
  const count = data.filter(sample => sample.value !== null).length;
  const hasTimestamps = data.length > 0 && data.every(sample => Number.isFinite(sample.timestamp));
  const formatTime = value => hasTimestamps ? new Date(value).toLocaleTimeString("pt-BR") : value;
  const stale = machine.communicationStatus !== "ONLINE" || ["SEM_COMUNICACAO", "DADOS_DESATUALIZADOS"].includes(machine.status);
  const limit = machine[metric.limit];

  return <section className="panel p-5 space-y-4 bg-base-surface/90">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary"><BarChart3 size={16} className="text-accent" />Telemetria recebida</h2>
        <p className="text-xs text-text-muted">Últimas {samples.length} leituras · atualização automática a cada consulta.</p>
      </div>
      <label className="text-xs text-text-muted">Sinal exibido
        <select className="ml-2 rounded-lg border border-base-border bg-base-card p-2 text-text-primary" value={metric.key} onChange={event => setSelected(event.target.value)}>
          {options.map(option => <option key={option.key} value={option.key}>{option.label}{option.unit ? ` (${option.unit})` : ""}</option>)}
        </select>
      </label>
    </div>
    {stale && <p role="status" className="text-xs text-amber-400">Comunicação indisponível ou dados desatualizados. Exibindo as últimas leituras conhecidas.</p>}
    {count === 0 ? <div role="status" className="flex h-64 items-center justify-center text-center text-sm text-text-muted">
      {samples.length ? `Nenhuma leitura de ${metric.label.toLowerCase()} recebida. Selecione outro sinal disponível.` : "Aguardando o recebimento de leituras do dispositivo."}
    </div> : <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey={hasTimestamps ? "timestamp" : "time"} type={hasTimestamps ? "number" : "category"} domain={["dataMin", "dataMax"]} tickFormatter={formatTime} stroke="#737373" fontSize={10} minTickGap={35} />
          <YAxis stroke="#737373" fontSize={10} domain={metric.digital ? [0, 1] : [0, "auto"]} ticks={metric.digital ? [0, 1] : undefined} tickFormatter={value => metric.digital ? value ? "Ativo" : "Inativo" : value} />
          <Tooltip labelFormatter={formatTime} formatter={value => [metric.digital ? value ? "Ativo" : "Inativo" : `${value} ${metric.unit}`, metric.label]} contentStyle={{ backgroundColor: "#171717", borderColor: "#383838", borderRadius: "8px", color: "#fff" }} />
          {Number.isFinite(limit) && <ReferenceLine y={limit} ifOverflow="extendDomain" stroke="#F59E0B" strokeDasharray="4 4" label={{ value: `Limite: ${limit} ${metric.unit}`, fill: "#F59E0B", fontSize: 10, position: "top" }} />}
          <Area key={metric.key} type={metric.digital ? "stepAfter" : "linear"} dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} dot={{ r: count === 1 ? 4 : 2 }} connectNulls={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>}
  </section>;
}
