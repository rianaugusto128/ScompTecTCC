import { useEffect, useState } from "react";
import { formatDuration } from "../utils/time";

export function useRelativeDuration(stateSince, showSeconds = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = stateSince ? Math.max(0, Math.floor((now - new Date(stateSince).getTime()) / 1000)) : 0;
  return { seconds, formatted: formatDuration(seconds, { showSeconds }) };
}

