import { useState } from "react";
import { History, Search, ArrowRight, RefreshCw } from "lucide-react";

const formatDate = (value) => new Date(value).toLocaleString("pt-BR");
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function AdminActivity({ audit, incidents, onRefresh, onOpenIncidents }) {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("");
  const [date, setDate] = useState("");
  const [limit, setLimit] = useState(20);
  const open = incidents.filter((item) => item.status !== "Resolvida");
  const unassigned = open.filter((item) => !item.assignee).length;
  const critical = open.filter((item) => item.priority === "Crítica").length;
  const inProgress = open.filter((item) => item.status === "Em atendimento").length;
  const actorName = (entry) => entry.actor || "Responsável não informado";
  const actors = [...new Set(audit.map(actorName))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const entries = audit.filter((entry) => {
    const at = new Date(entry.at);
    const localDate = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
    return (!actor || actorName(entry) === actor) && (!date || localDate === date)
      && normalize(`${entry.action} ${actorName(entry)}`).includes(normalize(query.trim()));
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  function filter(setter, value) { setter(value); setLimit(20); }

  return <section className="admin-overview">
    <div className="panel p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div><h2 className="font-bold text-lg flex items-center gap-2"><History size={19} className="text-accent" /> Atividade administrativa</h2><p className="text-xs text-text-muted mt-2">Acompanhe o que foi feito, por quem e quando. Ações mais recentes primeiro.</p></div>
        <button className="btn-secondary" type="button" onClick={onRefresh}><RefreshCw size={15} /> Atualizar</button>
      </div>
      <div className="admin-log-filters">
        <label className="admin-field"><span className="flex items-center gap-2"><Search size={13} /> Buscar atividade</span><input className="input-field" placeholder="Ação ou responsável…" value={query} onChange={(event) => filter(setQuery, event.target.value)} /></label>
        <label className="admin-field"><span>Responsável</span><select className="input-field" value={actor} onChange={(event) => filter(setActor, event.target.value)}><option value="">Todos</option>{actors.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="admin-field"><span>Data da atividade</span><input className="input-field" type="date" value={date} onChange={(event) => filter(setDate, event.target.value)} /></label>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2 my-4 text-xs text-text-muted"><p>{entries.length} {entries.length === 1 ? "atividade encontrada" : "atividades encontradas"}</p>{(query || actor || date) && <button className="text-accent" type="button" onClick={() => { setQuery(""); setActor(""); setDate(""); setLimit(20); }}>Limpar filtros</button>}</div>
      {!entries.length ? <div className="admin-empty"><History size={28} className="mx-auto mb-3 text-text-muted" /><p>{audit.length ? "Nenhuma atividade corresponde aos filtros." : "Nenhuma atividade registrada ainda."}</p><p className="text-xs mt-2">{audit.length ? "Ajuste a busca, o responsável ou a data." : "Cadastros, atendimentos e alterações de limites aparecerão aqui."}</p></div> : <ol className="admin-activity-list">{entries.slice(0, limit).map((entry) => <li key={entry.id} className="admin-activity-item"><span className="admin-activity-dot" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-medium break-words">{entry.action}</p><p className="text-xs text-text-muted mt-2">Por {actorName(entry)}</p></div><time className="text-xs text-text-muted" dateTime={entry.at}>{formatDate(entry.at)}</time></li>)}</ol>}
      {entries.length > limit && <button className="btn-secondary w-full mt-4" type="button" onClick={() => setLimit((value) => value + 20)}>Mostrar mais atividades</button>}
    </div>
    <aside className="space-y-4">
      <div className="panel p-5"><p className="eyebrow mb-2">Atendimento</p><h2 className="font-bold text-lg">Pendências da equipe</h2><p className="text-xs text-text-muted mt-2 mb-5">Resumo das ocorrências que ainda precisam de acompanhamento.</p><dl className="admin-pending-list">{[["Sem responsável", unassigned], ["Prioridade crítica", critical], ["Em atendimento", inProgress]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl><p className="text-xs text-text-muted mt-4">{open.length ? `${open.length} ocorrência(s) aguardando conclusão.` : "Nenhuma ocorrência pendente no momento."}</p><button className="btn-secondary w-full mt-5" type="button" onClick={onOpenIncidents}>Gerenciar ocorrências <ArrowRight size={15} /></button></div>
      <div className="panel p-5"><h2 className="font-bold text-sm">Sobre este registro</h2><p className="text-xs text-text-muted mt-2 leading-relaxed">O histórico reúne as alterações administrativas salvas no sistema. Use Atualizar para consultar as ações de outros administradores.</p></div>
    </aside>
  </section>;
}
