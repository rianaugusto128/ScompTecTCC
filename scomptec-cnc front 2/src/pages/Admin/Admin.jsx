import { useEffect, useRef, useState } from "react";
import { Activity, Users, ClipboardList, SlidersHorizontal, Plus, Download } from "lucide-react";
import { useMonitoring } from "../../contexts/MonitoringContext";
import AdminUserRow from "./AdminUserRow";
import { readSessionUser } from "../../services/adminSession";
import AdminActivity from "./AdminActivity";
import { defaultRules, initialAdminState, roles, signalProblems } from "./adminModel";
import api from "../../services/api";
import "./admin.css";

const tabs = [["signals", "Visão operacional", Activity], ["users", "Usuários", Users], ["incidents", "Ocorrências", ClipboardList], ["rules", "Limites de alerta", SlidersHorizontal]];
const emptyUser = { name: "", email: "", role: "operator", password: "" };
const emptyIncident = { machineId: "", title: "", priority: "Alta", assignee: "", note: "" };
const formatDate = (value) => new Date(value).toLocaleString("pt-BR");
function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
function Empty({ children }) { return <p className="admin-empty">{children}</p>; }

export default function Admin() {
  const { allMachines } = useMonitoring();
  const machines = allMachines;
  const [tab, setTab] = useState("signals");
  const [state, setState] = useState(() => initialAdminState(false));
  const [userForm, setUserForm] = useState(emptyUser);
  const [incidentForm, setIncidentForm] = useState(emptyIncident);
  const [ruleForm, setRuleForm] = useState(defaultRules);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    let cancelled = false;
    api.getAdminState().then((data) => {
      if (cancelled) return;
      setState(data); setRuleForm(data.rules); setReady(true);
    }).catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function persist(operation, message) {
    if (saving.current || !ready) return false;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const data = await operation();
      setState(data); setNotice(message);
      return true;
    } catch (reason) {
      setError(reason.message || "Não foi possível salvar. Tente novamente.");
      return false;
    } finally { saving.current = false; setBusy(false); }
  }
  const activeUsers = state.users.filter((user) => user.active);
  const troubled = machines.filter((machine) => signalProblems(machine, state.rules).length);
  const openIncidents = state.incidents.filter((incident) => incident.status !== "Resolvida");

  async function createUser(event) {
    event.preventDefault();
    const name = userForm.name.trim();
    const email = userForm.email.trim().toLowerCase();
    if (name.length < 2) return setError("Informe um nome com pelo menos 2 caracteres.");
    if (state.users.some((user) => user.email === email)) return setError("Este e-mail já está cadastrado nesta lista.");
    if (await persist(() => api.createAdminUser({ ...userForm, name, email }), "Usuário criado. A conta já pode acessar o sistema.")) setUserForm(emptyUser);
  }
  function toggleUser(user) {
    return persist(() => api.updateAdminUser(user.id, { active: !user.active }), "Status do usuário atualizado.");
  }
  async function createIncident(event) {
    event.preventDefault();
    if (!incidentForm.title.trim() || !machines.some((machine) => machine.id === incidentForm.machineId)) return setError("Informe a máquina e a descrição do problema.");
    const machine = machines.find((item) => item.id === incidentForm.machineId);
    if (!machine?.backendId) return setError("Selecione uma máquina conectada ao servidor.");
    if (await persist(() => api.createIncident({ ...incidentForm, machineId: machine.backendId }), "Ocorrência registrada.")) setIncidentForm(emptyIncident);
  }
  function updateIncident(id, field, value) {
    return persist(() => api.updateIncident(id, { [field]: value }), "Ocorrência atualizada.");
  }
  function saveRules(event) {
    event.preventDefault();
    const rules = Object.fromEntries(Object.entries(ruleForm).map(([key, value]) => [key, Number(value)]));
    if (Object.values(rules).some((value) => !Number.isFinite(value) || value <= 0) || rules.voltageMin >= rules.voltageMax) return setError("Use valores positivos e tensão mínima menor que a máxima.");
    return persist(() => api.saveAdminRules(rules), "Limites de alerta salvos.");
  }
  function exportReport() {
    const content = JSON.stringify({ mode: "administracao", exportedAt: new Date().toISOString(), incidents: state.incidents, rules: state.rules, audit: state.audit }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "scomptec-relatorio-administrativo.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Relatório exportado.");
  }

  return <div className="admin-page space-y-6 animate-fadeUp">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow mb-2">SCOMPTEC • Administração</p><h1 className="text-2xl sm:text-3xl font-extrabold">Central de controle</h1><p className="text-sm text-text-muted mt-2">Atividades, pessoas e atendimentos em um só lugar.</p></div>
      <button className="btn-secondary" disabled={!ready || busy} onClick={exportReport}><Download size={16} /> Exportar relatório</button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {[["Atividades registradas", state.audit.length, "Histórico de alterações"], ["Sem responsável", openIncidents.filter((item) => !item.assignee).length, "Ocorrências para atribuir"], ["Ocorrências abertas", openIncidents.length, "Aguardando conclusão"], ["Usuários ativos", activeUsers.length, "Contas habilitadas"]].map(([label, count, hint]) => <div key={label} className="panel p-4"><p className="text-xs text-text-muted">{label}</p><p className="text-3xl font-bold my-2">{count}</p><p className="text-xs text-text-muted">{hint}</p></div>)}
    </div>
    <nav aria-label="Seções administrativas" className="admin-tabs">{tabs.map(([id, label, Icon]) => <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setError(""); setNotice(""); }}><Icon size={16} />{label}</button>)}</nav>
    {error && <p role="alert" className="admin-error">{error}</p>}
    {notice && <p role="status" className="admin-success">{notice}</p>}

    {loading && <p role="status">Carregando administração…</p>}
    {busy && <p role="status">Atualizando dados…</p>}
    {!ready && !loading && <button className="btn-secondary" onClick={() => window.location.reload()}>Tentar novamente</button>}
    <fieldset disabled={busy || !ready} className="space-y-5 min-w-0">
    {tab === "signals" && <AdminActivity audit={state.audit} incidents={state.incidents}
      onRefresh={() => persist(() => api.getAdminState(), "Atividades atualizadas.")}
      onOpenIncidents={() => { setTab("incidents"); setError(""); setNotice(""); }} />}

    {tab === "users" && <section className="space-y-5">
      <form onSubmit={createUser} className="panel p-5 space-y-4"><div><h2 className="font-bold text-lg">Criar usuário</h2><p className="text-xs text-text-muted mt-1">Crie uma conta de acesso e informe a senha inicial à pessoa responsável.</p></div><div className="grid gap-4 md:grid-cols-3">
        <Field label="Nome completo"><input className="input-field" required minLength={2} maxLength={100} value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></Field>
        <Field label="E-mail"><input className="input-field" type="email" required maxLength={150} value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></Field>
        <Field label="Senha inicial"><input className="input-field" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></Field>
        <Field label="Perfil"><select className="input-field" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      </div><button className="btn-primary" type="submit"><Plus size={16} /> Adicionar usuário</button></form>
      <div className="panel overflow-x-auto"><table className="admin-table"><caption className="sr-only">Usuários cadastrados</caption><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ação</th></tr></thead><tbody>{state.users.map((user) => <AdminUserRow key={`${user.id}-${user.role}`} user={user} ownAccount={user.id === readSessionUser()?.id}
        onToggle={toggleUser}
        onSaveRole={(selected, role) => persist(() => api.updateAdminUser(selected.id, { role }), "Perfil atualizado.")}
        onDelete={(selected) => persist(() => api.deleteAdminUser(selected.id), "Usuário excluído.")} />)}</tbody></table>{!state.users.length && <Empty>Nenhum usuário cadastrado. Adicione uma pessoa no formulário acima.</Empty>}</div>
      <div className="panel p-5"><h2 className="font-bold mb-3">Perfis de acesso</h2><p className="text-sm text-text-secondary">Administrador: acessa esta central e gerencia usuários, ocorrências e limites. Os demais perfis acessam os painéis de monitoramento; manutenção e operador identificam a função da pessoa na equipe.</p></div>
    </section>}

    {tab === "incidents" && <section className="space-y-5">
      <form className="panel p-5 space-y-4" onSubmit={createIncident}><h2 className="font-bold text-lg">Registrar ocorrência</h2><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Máquina"><select className="input-field" required value={incidentForm.machineId} onChange={(event) => setIncidentForm({ ...incidentForm, machineId: event.target.value })}><option value="">Selecione a CNC</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.name}</option>)}</select></Field>
        <Field label="Prioridade"><select className="input-field" value={incidentForm.priority} onChange={(event) => setIncidentForm({ ...incidentForm, priority: event.target.value })}>{["Crítica", "Alta", "Média", "Baixa"].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Descrição do problema"><input className="input-field" required maxLength={180} value={incidentForm.title} onChange={(event) => setIncidentForm({ ...incidentForm, title: event.target.value })} /></Field>
        <Field label="Responsável"><select className="input-field" value={incidentForm.assignee} onChange={(event) => setIncidentForm({ ...incidentForm, assignee: event.target.value })}><option value="">Não atribuído</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
      </div><Field label="Observações iniciais"><textarea className="input-field" maxLength={2000} value={incidentForm.note} onChange={(event) => setIncidentForm({ ...incidentForm, note: event.target.value })} /></Field><button className="btn-primary" disabled={!machines.length}><Plus size={16} /> Registrar ocorrência</button></form>
      {!state.incidents.length && <Empty>Nenhuma ocorrência registrada.</Empty>}
      {state.incidents.map((incident) => <article className="panel p-5 space-y-4" key={incident.id}><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-text-muted">{incident.machineId} • {formatDate(incident.createdAt)}</p><h2 className="font-bold mt-1">{incident.title}</h2></div><span className={`admin-chip ${incident.priority === "Crítica" ? "text-rose-300" : "text-amber-300"}`}>{incident.priority}</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Responsável pelo atendimento"><select className="input-field" aria-label={`Responsável: ${incident.title}`} value={incident.assignee} onChange={(event) => updateIncident(incident.id, "assignee", event.target.value)}><option value="">Não atribuído</option>{state.users.filter((user) => user.active || user.id === incident.assignee).map((user) => <option key={user.id} value={user.id}>{user.name}{user.active ? "" : " (inativo)"}</option>)}</select></Field><Field label="Andamento"><select className="input-field" aria-label={`Andamento: ${incident.title}`} value={incident.status} onChange={(event) => updateIncident(incident.id, "status", event.target.value)}>{["Aberta", "Em atendimento", "Resolvida"].map((value) => <option key={value}>{value}</option>)}</select></Field></div>
        {incident.note && <p className="text-sm text-text-muted">Observações iniciais: {incident.note}</p>}
        <form className="space-y-3" key={`${incident.id}-${incident.attendance || ""}`} onSubmit={(event) => { event.preventDefault(); const attendance = new FormData(event.currentTarget).get("attendance").trim(); if (!attendance) { setError("Descreva o atendimento antes de salvar."); return; } updateIncident(incident.id, "attendance", attendance); }}><Field label="Registro do atendimento"><textarea name="attendance" className="input-field" required maxLength={2000} defaultValue={incident.attendance || ""} /></Field><button className="btn-secondary">Salvar atendimento</button></form>
      </article>)}
      <p className="text-xs text-text-muted">Resolver uma ocorrência encerra o registro de atendimento; o sinal e o estado da CNC não são alterados.</p>
    </section>}

    {tab === "rules" && <form onSubmit={saveRules} className="panel p-5 space-y-5 max-w-3xl"><div><h2 className="font-bold text-lg">Limites para os sinais analógicos</h2><p className="text-xs text-amber-300 mt-2">{troubled.length} máquina(s) com desvio de sinal ou comunicação nos limites salvos.</p><p className="text-sm text-text-muted mt-2">Ajuste conforme a especificação de cada instalação; os valores iniciais são demonstrativos. Os limites salvos são usados no resumo de desvios abaixo.</p></div><div className="grid gap-4 sm:grid-cols-2">{[["current", "Corrente máxima (A)"], ["temperature", "Temperatura máxima (°C)"], ["voltageMin", "Tensão mínima (V)"], ["voltageMax", "Tensão máxima (V)"]].map(([key, label]) => <Field key={key} label={label}><input type="number" min="0.1" step="0.1" required className="input-field" value={ruleForm[key]} onChange={(event) => setRuleForm({ ...ruleForm, [key]: event.target.value })} /></Field>)}</div><button className="btn-primary">Salvar limites</button></form>}
    </fieldset>
  </div>;
}
