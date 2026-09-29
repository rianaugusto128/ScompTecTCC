import { useSyncExternalStore } from "react";
import { readSessionUser } from "./adminSession";

export const DEFAULT_PREFERENCES = Object.freeze({ showToasts: true, toastDuration: 6, showBadge: true, compactAlerts: true, reduceMotion: false });
const eventName = "scomptec-preferences-changed";
function storageKey() {
  const user = readSessionUser();
  return `scomptec_preferences:${user?.id || user?.email || "guest"}`;
}
function snapshot() {
  try { return localStorage.getItem(storageKey()); } catch { return null; }
}
function normalize(raw) {
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of ["showToasts", "showBadge", "compactAlerts", "reduceMotion"]) {
    if (typeof raw?.[key] === "boolean") result[key] = raw[key];
  }
  if ([4, 6, 10].includes(raw?.toastDuration)) result.toastDuration = raw.toastDuration;
  return result;
}
function parse(value) {
  try { return normalize(JSON.parse(value)); } catch { return { ...DEFAULT_PREFERENCES }; }
}
function subscribe(callback) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", callback); };
}
export function usePreferences() {
  return parse(useSyncExternalStore(subscribe, snapshot, () => null));
}
export function savePreferences(value) {
  localStorage.setItem(storageKey(), JSON.stringify(normalize(value)));
  window.dispatchEvent(new Event(eventName));
}
