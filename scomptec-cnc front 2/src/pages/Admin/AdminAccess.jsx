import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../services/api";
import { Shield } from "lucide-react";
import { isAdminUser } from "../../services/adminSession";

export default function AdminAccess({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    api.me().then((current) => {
      if (cancelled) return;
      localStorage.setItem("scomptec_user", JSON.stringify(current));
      setUser(current);
    }).catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);
  if (checking) return <p role="status">Verificando acesso administrativo…</p>;
  if (isAdminUser(user)) return children;
  return (
    <section className="panel mx-auto max-w-lg p-8 text-center space-y-4">
      <Shield className="mx-auto text-accent" size={36} />
      <h1 className="text-2xl font-bold">Acesso administrativo</h1>
      {error && <p role="alert">{error}</p>}
      <p className="text-text-secondary">{user ? "Seu perfil não possui acesso a esta área." : "Entre com uma conta de administrador para continuar."}</p>
      <Link className="btn-secondary" to={user ? "/dashboard" : "/login"}>{user ? "Voltar ao painel" : "Ir para o login"}</Link>
    </section>
  );
}
