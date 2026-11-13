// The call in progress lives on the device, so a refresh or a dropped connection never loses it.
import { useEffect, useState } from "react";

const KEY = "cg.active.v1";
export const loadActive = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
export const saveActive = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } };
export const clearActive = () => localStorage.removeItem(KEY);

export const newCall = (fields) => ({
  id: crypto.randomUUID(),
  ...fields,
  startedAt: new Date().toISOString(),
  stage: 1,
  reached: 1,
  results: {}, // { [stage]: { taps: [tapId], words: "" } }
});

export const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function useElapsed(startedAt, running = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

export function useHash() {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => setH(location.hash || "#/");
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return h;
}
