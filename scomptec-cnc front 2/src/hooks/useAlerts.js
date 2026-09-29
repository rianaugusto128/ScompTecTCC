import { useMonitoring } from "../contexts/MonitoringContext";
export function useAlerts() { const { alerts } = useMonitoring(); return { alerts, loading: false, reload: () => {} }; }
