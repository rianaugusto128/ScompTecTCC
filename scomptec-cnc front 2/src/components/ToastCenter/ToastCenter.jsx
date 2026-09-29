import { useEffect } from "react";
import { CheckCircle2, Siren, X } from "lucide-react";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { usePreferences } from "../../services/preferences";

function Toast({ toast, dismiss, duration }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), duration * 1000);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss, duration]);

  const Icon = toast.resolved ? CheckCircle2 : Siren;
  const tone = toast.resolved
    ? "border-accent/40 bg-base-surface/95 shadow-glowGreenSm"
    : "border-rose-500/40 bg-base-surface/95 shadow-[0_14px_40px_rgba(0,0,0,.6),0_0_24px_rgba(244,63,94,.15)]";

  return (
    <div
      role="alert"
      className={`animate-fadeUp w-[min(380px,calc(100vw-2rem))] rounded-xl border p-4 shadow-panel backdrop-blur-xl transition-all ${tone}`}
    >
      <div className="flex gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
            toast.resolved
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-rose-500/30 bg-rose-500/15 text-rose-400"
          }`}
        >
          <Icon size={18} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-bold uppercase tracking-wider text-text-primary">
            {toast.title}
          </strong>
          <span className="mt-0.5 block truncate text-xs font-semibold text-text-secondary">
            <span className="font-mono text-accent">{toast.machineId}</span> · {toast.machineName}
          </span>
          <span
            className={`mt-1 block text-[10px] font-medium ${
              toast.resolved ? "text-accent" : "text-rose-400"
            }`}
          >
            {toast.companyName} · {toast.unitName}
          </span>
        </div>

        <button
          onClick={() => dismiss(toast.id)}
          aria-label="Fechar notificação"
          className="text-text-muted hover:text-text-primary transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ToastCenter() {
  const { toasts, dismissToast } = useMonitoring();
  const preferences = usePreferences();
  useEffect(() => {
    if (!preferences.showToasts) toasts.forEach((toast) => dismissToast(toast.id));
  }, [preferences.showToasts, toasts, dismissToast]);
  if (!preferences.showToasts) return null;
  return (
    <div className="fixed right-4 top-20 z-[70] space-y-3 pointer-events-auto">
      {toasts.slice(0, 3).map((toast) => (
        <Toast key={toast.id} toast={toast} dismiss={dismissToast} duration={preferences.toastDuration} />
      ))}
    </div>
  );
}
