import { useEffect, useState } from "react";
import { User, Bell, Sliders, Save, RotateCcw, LockKeyhole } from "lucide-react";
import { readSessionUser } from "../../services/adminSession";
import api from "../../services/api";
import { DEFAULT_PREFERENCES, savePreferences, usePreferences } from "../../services/preferences";

function Toggle({ title, description, checked, onChange }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
    <span><span className="block text-sm font-semibold text-text-primary">{title}</span><span className="mt-1 block text-xs text-text-muted">{description}</span></span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-accent" />
  </label>;
}

export default function Settings() {
  const preferences = usePreferences();
  const [form, setForm] = useState(preferences);
  const [user, setUser] = useState(readSessionUser);
  const [profileStatus, setProfileStatus] = useState("Carregando dados da conta...");
  const [feedback, setFeedback] = useState(null);
  const dirty = Object.keys(DEFAULT_PREFERENCES).some((key) => form[key] !== preferences[key]);
  useEffect(() => {
    let active = true;
    api.me().then((profile) => {
      if (active) { setUser(profile); setProfileStatus(""); }
    }).catch(() => {
      if (active) setProfileStatus("Não foi possível atualizar o perfil. Exibindo os dados disponíveis da sessão.");
    });
    return () => { active = false; };
  }, []);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setFeedback(null); };
  const handleSave = (event) => {
    event.preventDefault();
    try {
      savePreferences(form);
      setFeedback({ error: false, text: "Preferências salvas para sua conta neste dispositivo." });
    } catch {
      setFeedback({ error: true, text: "Não foi possível salvar. Verifique o armazenamento do aplicativo e tente novamente." });
    }
  };
  const role = ["admin", "ADMIN", "ADMIN_SCOMPTEC"].includes(user?.role) ? "Administrador" : user?.role === "CLIENTE" ? "Cliente industrial" : "Operador";
  return <div className="max-w-4xl space-y-5 animate-fadeUp">
    <div><h1 className="text-2xl font-extrabold text-text-primary">Configurações da Conta</h1><p className="mt-1 text-sm text-text-muted">Seu perfil e suas preferências de monitoramento.</p></div>
    <section className="panel space-y-4 bg-base-surface/80 p-5">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><User size={22} /></span><div><h2 className="text-sm font-bold text-text-primary">Dados da conta</h2><p className="text-xs text-text-muted">{role}</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="account-name" className="mb-1.5 block text-xs font-semibold text-text-secondary">Nome cadastrado</label><input id="account-name" readOnly value={user?.name || ""} placeholder="Nome indisponível" className="input-field text-sm" /></div>
        <div><label htmlFor="account-email" className="mb-1.5 block text-xs font-semibold text-text-secondary">E-mail cadastrado</label><input id="account-email" type="email" readOnly value={user?.email || ""} placeholder="E-mail indisponível" aria-describedby="account-readonly" className="input-field text-sm" /></div>
      </div>
      <p id="account-readonly" className="flex items-center gap-2 text-xs text-text-muted"><LockKeyhole size={14} />Dados de cadastro somente para consulta.</p>
      {profileStatus && <p role="status" className="text-xs text-text-muted">{profileStatus}</p>}
    </section>
    <form onSubmit={handleSave} className="space-y-5">
      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className="panel bg-base-surface/80 p-5">
          <h2 className="flex items-center gap-2 border-b border-base-border pb-3 text-sm font-bold text-accent"><Bell size={16} />Notificações</h2>
          <div className="divide-y divide-base-border">
            <Toggle title="Avisos flutuantes" description="Exibir na tela os avisos de eventos recebidos pelo monitoramento." checked={form.showToasts} onChange={(value) => update("showToasts", value)} />
            <Toggle title="Contador no sino" description="Mostrar a quantidade de alertas não lidos junto ao sino." checked={form.showBadge} onChange={(value) => update("showBadge", value)} />
            <div className="pt-3"><label htmlFor="toast-duration" className="mb-2 block text-sm font-semibold text-text-primary">Duração dos avisos</label><select id="toast-duration" value={form.toastDuration} disabled={!form.showToasts} onChange={(event) => update("toastDuration", Number(event.target.value))} className="input-field text-sm disabled:opacity-50"><option value={4}>4 segundos</option><option value={6}>6 segundos</option><option value={10}>10 segundos</option></select></div>
          </div>
          <p className="mt-4 text-xs text-text-muted">Os alertas continuam disponíveis no sino e na Central de Alertas.</p>
        </section>
        <section className="panel bg-base-surface/80 p-5">
          <h2 className="flex items-center gap-2 border-b border-base-border pb-3 text-sm font-bold text-accent"><Sliders size={16} />Aparência e acessibilidade</h2>
          <div className="divide-y divide-base-border">
            <Toggle title="Lista de notificações compacta" description="Usar menos espaço entre os alertas na caixa do sino." checked={form.compactAlerts} onChange={(value) => update("compactAlerts", value)} />
            <Toggle title="Reduzir animações" description="Diminuir movimentos e transições da interface de monitoramento." checked={form.reduceMotion} onChange={(value) => update("reduceMotion", value)} />
          </div>
        </section>
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${feedback.error ? "border-rose-500/40 text-rose-400" : "border-accent/30 text-accent"}`}>{feedback.text}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-muted">{dirty ? "Você tem alterações não salvas." : "Preferências deste dispositivo."}</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setForm({ ...DEFAULT_PREFERENCES }); setFeedback(null); }} className="flex items-center gap-2 rounded-lg border border-base-border px-3 py-2 text-xs text-text-secondary"><RotateCcw size={14} />Restaurar padrão</button><button type="submit" disabled={!dirty} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"><Save size={15} />Salvar preferências</button></div>
      </div>
    </form>
  </div>;
}
