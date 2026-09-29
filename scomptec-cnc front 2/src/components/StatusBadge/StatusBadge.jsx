import { getStatusConfig } from "../../utils/status";

export default function StatusBadge({ status, size = "md", isNew = false, showIcon = true }) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${cfg.border} ${cfg.bg} ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } font-semibold uppercase tracking-wider ${cfg.text} transition-all duration-200 backdrop-blur-sm`}
    >
      <span className="relative flex h-1.5 w-1.5 items-center justify-center">
        {cfg.pulse && (
          <span className={`absolute inline-flex h-3 w-3 rounded-full ${cfg.dot} opacity-70 animate-beaconRadar`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      </span>
      {showIcon && <Icon size={isSm ? 11 : 13} strokeWidth={2.3} className="shrink-0" />}
      <span>{cfg.label}</span>
      {isNew && (
        <span className="ml-1 animate-badgeIn rounded bg-rose-500 px-1 py-0.2 text-[8px] font-bold text-white shadow-[0_0_6px_rgba(244,63,94,0.6)]">
          NOVO
        </span>
      )}
    </span>
  );
}

