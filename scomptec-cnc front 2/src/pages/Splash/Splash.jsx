import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo/Logo";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/inicio"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const tagDelay = 480;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base-bg text-text-primary">
      {/* Central emerald aura */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(650px circle at 50% 45%, rgba(16,185,129,0.18), transparent 70%)",
        }}
      />

      <div className="relative text-center flex flex-col items-center">
        <h1 className="animate-fadeUp">
          <Logo size="xl" tagline={null} />
        </h1>

        <p
          className="mt-3 text-xs font-bold uppercase tracking-[0.4em] text-accent opacity-0 animate-fadeUp"
          style={{ animationDelay: `${tagDelay}ms`, animationFillMode: "forwards" }}
        >
          Telemetria & Supervisão CNC
        </p>
      </div>

      <div className="relative mt-10 h-1 w-32 overflow-hidden rounded-full bg-base-surface border border-base-border/80">
        <div
          className="h-full w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-emerald-500 to-accent shadow-[0_0_8px_#10B981] animate-loadBar"
          style={{ animationDelay: `${tagDelay + 100}ms` }}
        />
      </div>
    </div>
  );
}
