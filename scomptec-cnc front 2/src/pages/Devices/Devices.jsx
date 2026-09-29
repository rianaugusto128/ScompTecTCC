import { Cpu, WifiOff, Signal } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { useMonitoring } from "../../contexts/MonitoringContext";


export default function Devices() {
  const [searchParams] = useSearchParams();
  const requestedDevice = searchParams.get("dispositivo");
  const { allMachines } = useMonitoring();

  const devices = allMachines.filter(m => m.deviceId).map((m) => ({
    id: m.deviceId,
    machineId: m.id,
    machineName: m.name,
    companyId: m.companyId,
    commStatus: m.communicationStatus || "UNKNOWN",
    lastComm: m.lastCommunicationAt,
    firmwareVersion: m.firmwareVersion || "Não informado",
    rssi: m.rssi,
    signals: m.sensors || ["Corrente", "Tensão", "Temperatura", "Ciclo", "Emergência"],
  }));

  const onlineCount = devices.filter((d) => d.commStatus === "ONLINE").length;
  const unstableCount = devices.filter((d) => d.commStatus === "INSTAVEL").length;
  const offlineCount = devices.filter((d) => d.commStatus === "OFFLINE").length;

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Módulos e Gateways IoT (Arduino Opta WiFi)
            </h1>
            <span className="rounded-full bg-accent-soft border border-accent/30 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              {onlineCount}/{devices.length} ONLINE
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Dispositivos microcontrolados de aquisição de sinais industriais e telemetria CNC em campo.
          </p>
        </div>

      </div>

      {/* 34: Arduino Opta WiFi / Communication Dashboard Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="panel p-4 bg-base-surface/80 border-base-border space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total de Módulos</span>
          <p className="data-mono text-2xl font-extrabold text-white">{devices.length}</p>
          <span className="text-[11px] text-text-dim block">Controladores ativos</span>
        </div>

        <div className="panel p-4 bg-base-surface/80 border-accent/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Online & Estável</span>
          <p className="data-mono text-2xl font-extrabold text-accent">{onlineCount}</p>
          <span className="text-[11px] text-text-dim block">Taxa {devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0}%</span>
        </div>

        <div className="panel p-4 bg-base-surface/80 border-amber-500/30 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Instáveis / Ruído</span>
          <p className="data-mono text-2xl font-extrabold text-amber-400">{unstableCount}</p>
          <span className="text-[11px] text-text-dim block">Latência elevada</span>
        </div>

        <div className="panel p-4 bg-base-surface/80 border-slate-700 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Offline / Sem Sinal</span>
          <p className="data-mono text-2xl font-extrabold text-slate-300">{offlineCount}</p>
          <span className="text-[11px] text-text-dim block">Máquinas afetadas</span>
        </div>
      </div>

      {/* Devices Table */}
      <div className="panel overflow-hidden bg-base-surface/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-base-border/70 bg-base-card/80 text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3.5 font-bold">Dispositivo IoT</th>
                <th className="px-4 py-3.5 font-bold">Máquina CNC Associada</th>
                <th className="px-4 py-3.5 font-bold">Comunicação</th>
                <th className="px-4 py-3.5 font-bold">Sinal Wi-Fi (RSSI)</th>
                <th className="px-4 py-3.5 font-bold">Firmware</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border/70">
              {devices
                .filter((device) => !requestedDevice || device.id === requestedDevice)
                .map((d) => {
                  const isOnline = d.commStatus === "ONLINE";

                  return (
                    <tr
                      key={d.id}
                      className={`transition-colors hover:bg-base-cardHover ${
                        requestedDevice === d.id ? "bg-accent/[0.04] border-l-2 border-accent" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-accent">
                        <span className="inline-flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 border border-accent/20 text-accent">
                            <Cpu size={14} />
                          </span>
                          {d.id}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          to={`/maquinas/${d.machineId}`}
                          className="font-semibold text-text-primary hover:text-accent transition-colors inline-flex items-center gap-1.5"
                        >
                          <span className="font-mono text-xs text-accent">[{d.machineId}]</span>
                          <span>{d.machineName}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#10B981]" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                            <WifiOff size={11} /> {d.commStatus === "UNKNOWN" ? "Sem confirmação" : "Offline"}
                          </span>
                        )}
                      </td>
                      <td className="data-mono px-4 py-3.5 font-medium text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Signal size={12} className="text-accent" />
                          {d.rssi == null ? "Não informado" : `${d.rssi} dBm`}
                        </span>
                      </td>
                      <td className="data-mono px-4 py-3.5 font-medium text-text-secondary">
                        <span className="rounded bg-base-surface px-1.5 py-0.5 border border-base-border">
                          {d.firmwareVersion}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
