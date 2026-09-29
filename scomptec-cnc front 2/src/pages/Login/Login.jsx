import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, LogIn, Lock, Mail, ShieldCheck } from "lucide-react";
import Logo from "../../components/Logo/Logo";
import api from "../../services/api";
import { isAdminUser } from "../../services/adminSession";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await api.login(form.email, form.password);
      navigate(isAdminUser(session.user) ? "/admin" : "/selecionar-empresa");
    } catch {
      setError("Não foi possível entrar. Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-bg px-4 py-10 relative overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}login-cnc-background.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,10,16,0.35), rgba(5,10,16,0.65)), radial-gradient(ellipse at center, rgba(5,10,16,0.15), rgba(5,10,16,0.3))",
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fadeUp">
        <Link
          to="/inicio"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-base-bg/80 px-3 py-2 text-xs font-semibold text-text-secondary backdrop-blur-md hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para o portal SCOMPTEC
        </Link>

        <div className="panel p-6 sm:p-8 bg-base-surface/95 border-white/10 shadow-glowGreen backdrop-blur-md">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-3">
              <Logo size="md" tagline={null} />
            </div>
            <h1 className="text-xl font-extrabold text-white">Autenticação de Operador</h1>
            <p className="mt-1 text-xs text-text-muted">Acesse a central de telemetria e supervisão CNC.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted">
                E-mail Corporativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="operador@scomptec.com.br"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Senha de Acesso</label>
                <Link to="/recuperar-senha" className="text-xs font-semibold text-accent hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-field pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs font-semibold text-rose-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-xs">
              {loading ? (
                "Validando credenciais..."
              ) : (
                <>
                  <LogIn size={15} /> Entrar na Central
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-base-border/70 pt-4 text-center text-xs text-text-muted">
            Não possui credencial de acesso?{" "}
            <Link to="/registro" className="font-bold text-accent hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
