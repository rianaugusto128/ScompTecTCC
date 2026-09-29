import { Link } from "react-router-dom";
import { Activity, BellRing, History, Factory, ArrowRight, ShieldCheck, Cpu, Terminal, Radio } from "lucide-react";
import Logo from "../../components/Logo/Logo";

const highlights = [
  { icon: Activity, title: "Telemetria Contínua", desc: "Leitura de corrente, tensão, ciclo e sensores a 100Hz." },
  { icon: BellRing, title: "Alertas de Emergência", desc: "Notificação instantânea de botões de soco e alarmes de PLC." },
  { icon: History, title: "Auditoria & Histórico", desc: "Timeline cronológica de 24h e cálculo de disponibilidade OEE." },
  { icon: Factory, title: "Parque Multi-Unidade", desc: "Controle de múltiplas plantas industriais, setores e máquinas." },
];

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base-bg text-text-primary">
      {/* Background ambient green glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px circle at 50% -10%, rgba(16,185,129,0.14), transparent 70%)",
        }}
      />

      {/* Top Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary !px-4 !py-2 text-xs">
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-12 text-center lg:px-12 animate-fadeUp">
        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl text-white">
          Monitoramento inteligente de máquinas CNC,{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-accent bg-clip-text text-transparent">
            em tempo real.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-sm sm:text-base text-text-muted leading-relaxed">
          Acompanhe o estado de controladores legados e modernos — operando, em alarme, parada ou emergência —
          com telemetria instantânea, gráficos de utilização e alertas ao vivo em qualquer dispositivo.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/login" className="btn-primary px-7 py-3.5 text-sm">
            <span>Acessar Plataforma</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
          {highlights.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="panel p-5 space-y-3 bg-base-surface/60 border-base-border/70 hover:border-accent/40 transition-all hover:bg-base-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent shadow-glowGreenSm">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <p className="mt-1 text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-base-border/70 px-6 py-5 text-center text-xs text-text-muted bg-base-surface/40">
        © {new Date().getFullYear()} SCOMPTEC Automação Industrial — Todos os direitos reservados.
      </footer>
    </div>
  );
}
