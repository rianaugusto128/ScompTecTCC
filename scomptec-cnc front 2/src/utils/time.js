export function formatDuration(value, options = {}) {
  const seconds = Math.max(0, options.unit === "minutes" ? value * 60 : value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (options.showSeconds) return `${hours ? `${hours}h ` : ""}${minutes ? `${minutes}min ` : ""}${secs}s`;
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}min` : `${minutes}min`;
}

export function formatRelativeTime(date, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `há ${seconds}s`;
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  return `há ${Math.floor(seconds / 86400)}d`;
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(date));
}

