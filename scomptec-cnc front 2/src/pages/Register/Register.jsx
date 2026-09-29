import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import Logo from "../../components/Logo/Logo";
import api from "../../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const passwordsMatch = form.password && form.password === form.confirmPassword;
  const passwordIsLongEnough = form.password.length >= 8;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const [error, setError] = useState("");
  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    if (!emailLooksValid) {
      setError("Digite um e-mail válido, por exemplo nome@empresa.com.br.");
      return;
    }
    if (!passwordIsLongEnough) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.register({ name: form.name, email: form.email, password: form.password });
      navigate("/selecionar-empresa");
    } catch (err) {
      setError(err.message || "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-bg px-4 py-10 relative overflow-hidden">
      {/* Ambient green glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 50% 30%, rgba(16,185,129,0.12), transparent 70%)",
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fadeUp">
        <Link
          to="/inicio"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Voltar para o portal SCOMPTEC
        </Link>

        <div className="panel p-8 bg-base-surface/90 border-base-border shadow-glowGreen">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-3">
              <Logo size="md" tagline={null} />
            </div>
            <h1 className="text-xl font-extrabold text-white">Criar Conta Operacional</h1>
            <p className="mt-1 text-xs text-text-muted">Inicie o monitoramento remoto do seu parque CNC.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Nome do Responsável</label>
              <input
                required
                minLength={2}
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Eng. Carlos Silva"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Empresa / Planta Fabril</label>
              <input
                required
                value={form.company}
                onChange={handleChange("company")}
                placeholder="Ex: Usinagem Moderna Ltda"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">E-mail Corporativo</label>
              <input
                type="email"
                required
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                title="Digite um e-mail válido, por exemplo nome@empresa.com.br"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="carlos@usinagem.com.br"
                className="input-field text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Senha</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-text-muted">Confirmar</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="••••••••"
                  className="input-field text-xs"
                />
              </div>
            </div>

            {form.email && !emailLooksValid && (
              <p className="text-xs text-rose-400 font-semibold">Digite um e-mail válido, por exemplo nome@empresa.com.br.</p>
            )}
            {form.password && !passwordIsLongEnough && (
              <p className="text-xs text-rose-400 font-semibold">A senha precisa ter pelo menos 8 caracteres.</p>
            )}
            {form.confirmPassword && !passwordsMatch && (
              <p className="text-xs text-rose-400 font-semibold">As senhas não coincidem.</p>
            )}
            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={loading || !passwordsMatch || !passwordIsLongEnough || !emailLooksValid}
              className="btn-primary w-full py-3 mt-3 text-xs"
            >
              {loading ? (
                "Registrando conta..."
              ) : (
                <>
                  <UserPlus size={15} /> Cadastrar e Iniciar
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-base-border/70 pt-4 text-center text-xs text-text-muted">
            Já possui credencial cadastrada?{" "}
            <Link to="/login" className="font-bold text-accent hover:underline">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}





