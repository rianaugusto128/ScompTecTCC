import { ChevronRight, Home } from "lucide-react";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { useLocation, useParams, Link } from "react-router-dom";

const PAGE_LABELS = {
  dashboard: "Visão Geral",
  maquinas: "Máquinas",
  alertas: "Alertas",
  historico: "Histórico",
  clientes: "Clientes",
  unidades: "Unidades",
  dispositivos: "Dispositivos",
  configuracoes: "Configurações",
  admin: "Administração",
};

export default function Breadcrumb({ unit, machine }) {
  const { activeCompany, companies, allMachines: machines, units } = useMonitoring();
  const location = useLocation();
  const { id } = useParams();
  const page = location.pathname.split("/")[1];
  const machineId = machine || (page === "maquinas" ? id : null);
  const currentMachine = machines.find((item) => item.id === machineId);
  const currentUnit = unit || units.find((item) => item.id === currentMachine?.unitId)?.name;
  const companyName =
    activeCompany?.name ||
    (currentMachine ? companies.find((item) => item.id === currentMachine.companyId)?.name : null);

  const items = [
    { label: "SCOMPTEC", to: "/dashboard" },
    companyName && !["configuracoes", "admin"].includes(page) ? { label: companyName, to: "/dashboard" } : null,
    machineId && currentUnit ? { label: currentUnit, to: "/unidades" } : null,
    { label: PAGE_LABELS[page] || "Visão Geral", to: `/${page}` },
    machineId ? { label: machineId } : null,
  ].filter(Boolean);

  return (
    <nav
      aria-label="Navegação estrutural"
      className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-base-border/70 bg-base-card/40 px-3 py-1 text-xs backdrop-blur-sm"
    >
      <Home size={12} className="text-accent/80 shrink-0" />
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <ChevronRight size={11} className="text-text-dim shrink-0" />}
          {index === items.length - 1 ? (
            <span aria-current="page" className="font-semibold text-accent">{item.label}</span>
          ) : (
            <Link
              to={item.to}
              className="text-text-muted transition-colors hover:text-accent font-medium truncate max-w-[160px]"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
