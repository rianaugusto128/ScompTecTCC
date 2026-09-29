import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nenhum registro encontrado",
  description = "Não há dados cadastrados ou compatíveis com os filtros selecionados.",
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-base-border bg-base-surface/40 px-4 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent shadow-glowGreenSm">
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-sm font-bold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

