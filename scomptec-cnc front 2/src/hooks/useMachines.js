import { useMonitoring } from "../contexts/MonitoringContext";

export function useMachines() { const { machines, loading, connectionError } = useMonitoring(); return { machines, loading, error: connectionError, reload: () => {} }; }
export function useMachine(id) { const { allMachines, loading } = useMonitoring(); return { machine: allMachines.find((machine) => machine.id === id) || null, loading }; }
export function useDashboardSummary() { const { scopeSummary } = useMonitoring(); return { summary: { ...scopeSummary, alarmsAndEmergencies: scopeSummary.alarms + scopeSummary.emergencies }, loading: false }; }
