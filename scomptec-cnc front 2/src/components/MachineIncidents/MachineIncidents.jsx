import { useEffect, useState } from "react";
import { ClipboardList, ChevronDown, RefreshCw } from "lucide-react";
import api from "../../services/api";

function IncidentList({ machine }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!machine.backendId) {
      setError("A consulta de ocorrências está disponível para máquinas cadastradas no servidor.");
      setLoading(false);
      return;
    }
    api.getMachineIncidents(machine.backendId).then((data) => {
      if (active) setItems(data);
    }).catch((err) => {
      if (active) setError(err.message || "Não foi possível carregar as ocorrências.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [machine.backendId, revision]);
  return <div className="border-t border-base-border p-4 sm:p-5 space-y-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-text-muted">Atendimentos registrados para {machine.id}.</p>
      <button type="button" disabled={loading} onClick={() => setRevision((value) => value + 1)} className="btn-secondary text-xs disabled:opacity-50"><RefreshCw size={13} />Atualizar</button>
    </div>
    {loading ? <p role="status" className="text-sm text-text-muted">Carregando ocorrências...</p> : error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : items.length === 0 ? <p className="text-sm text-text-muted">Nenhuma ocorrência registrada para esta CNC.</p> : <div className="space-y-3">
      <p className="text-xs text-text-muted">{items.length} ocorrência(s) · {items.filter((item) => item.status !== "Resolvida").length} em aberto</p>
      {items.map((item) => <article key={item.id} className="rounded-xl border border-base-border bg-base-bg/40 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold text-text-primary break-words">{item.title}</h3><span className={`rounded-full px-2 py-1 text-xs ${item.status === "Resolvida" ? "bg-accent-soft text-accent" : "bg-amber-500/10 text-amber-300"}`}>{item.status}</span></div>
        <dl className="grid gap-2 text-xs sm:grid-cols-3">
          <div><dt className="text-text-muted">Registrada em</dt><dd className="mt-1 text-text-secondary">{new Date(item.createdAt).toLocaleString("pt-BR")}</dd></div>
          <div><dt className="text-text-muted">Prioridade</dt><dd className="mt-1 text-text-secondary">{item.priority}</dd></div>
          <div><dt className="text-text-muted">Responsável</dt><dd className="mt-1 text-text-secondary">{item.assigneeName}</dd></div>
        </dl>
        {item.note && <div><h4 className="text-xs font-semibold text-text-secondary">Observações iniciais</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-muted">{item.note}</p></div>}
        <div className="border-t border-base-border pt-3"><h4 className="text-xs font-semibold text-text-secondary">Registro do atendimento</h4><p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-muted">{item.attendance || "Atendimento ainda não registrado."}</p></div>
      </article>)}
    </div>}
  </div>;
}

export default function MachineIncidents({ machine }) {
  const [open, setOpen] = useState(false);
  return <section className="panel overflow-hidden">
    <button type="button" aria-expanded={open} aria-controls="machine-incidents" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-base-cardHover">
      <span className="flex items-center gap-2 text-sm font-bold text-text-primary"><ClipboardList size={17} className="text-accent" />Verificar ocorrências desta CNC</span>
      <ChevronDown size={16} className={`shrink-0 text-accent transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    <div id="machine-incidents" hidden={!open}>{open && <IncidentList machine={machine} />}</div>
  </section>;
}
