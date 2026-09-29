import { useMonitoring } from "../../contexts/MonitoringContext";

export default function ConnectionNotice() {
  const { demoMode, loading, connectionError, lastSync } = useMonitoring();
  if (demoMode || (!loading && !connectionError)) return null;
  return <div role="status" className="m-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
    {loading ? "Conectando ao servidor de monitoramento…" : "Sem conexão com o backend. Tentando reconectar automaticamente."}
    {connectionError && <span className="block text-xs">{connectionError}</span>}
    {lastSync && <span className="block text-xs">Última atualização confirmada: {lastSync.toLocaleString("pt-BR")}. As leituras exibidas estão desatualizadas.</span>}
  </div>;
}
