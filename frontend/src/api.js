// All talking to the backend goes through here.
//
// Render's free tier sleeps when idle and takes up to a minute to wake. A caller cannot wait for that,
// so every write goes into an outbox kept in localStorage and is sent in order, with retries.
// The screen never waits on the network. Calls get their id on the device (see startCall), which is
// what makes this safe: the start request can still be in the outbox while the caller is on stage 4.

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const BOX = "cg.outbox.v1";

const read = () => { try { return JSON.parse(localStorage.getItem(BOX) || "[]"); } catch { return []; } };
const write = (b) => { try { localStorage.setItem(BOX, JSON.stringify(b)); } catch { /* storage full or blocked */ } };

let status = { server: "unknown", pending: read().length }; // server: unknown | awake | waking | down
const listeners = new Set();
const emit = (patch = {}) => { status = { ...status, ...patch, pending: read().length }; listeners.forEach((l) => l(status)); };
export const subscribe = (fn) => { listeners.add(fn); fn(status); return () => listeners.delete(fn); };

async function request(method, path, body, ms = 70000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    if (!res.ok) {
      const err = new Error(`${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function ping() {
  emit({ server: status.server === "awake" ? "awake" : "waking" });
  try { await request("GET", "/health", null, 70000); emit({ server: "awake" }); return true; }
  catch { emit({ server: "down" }); return false; }
}

// ---- outbox ----
let inFlight = null;
let flushing = null;
let retryTimer = null;
let attempt = 0;

export function enqueue(op) {
  const box = read();
  // The latest save for a stage replaces an earlier one that has not been sent yet.
  const i = op.method === "PUT" ? box.findIndex((o) => o.method === "PUT" && o.path === op.path && o.id !== inFlight) : -1;
  if (i >= 0) box[i] = { ...box[i], body: op.body };
  else box.push({ id: crypto.randomUUID(), ...op });
  write(box);
  emit();
  flush();
}

async function run() {
  clearTimeout(retryTimer);
  while (read().length) {
    const op = read()[0];
    inFlight = op.id;
    try {
      await request(op.method, op.path, op.body);
      write(read().filter((o) => o.id !== op.id));
      attempt = 0;
      emit({ server: "awake" });
    } catch (e) {
      inFlight = null;
      const refused = e.status && e.status >= 400 && e.status < 500 && ![408, 425, 429].includes(e.status);
      if (refused) {
        // The server understood and said no (bad data, or a call it has never heard of). Retrying cannot help.
        console.warn("Dropped a write the server refused:", op.method, op.path, e.status);
        write(read().filter((o) => o.id !== op.id));
        emit();
        continue;
      }
      attempt += 1;
      emit({ server: "waking" });
      retryTimer = setTimeout(flush, Math.min(3000 * attempt, 20000));
      return;
    }
    inFlight = null;
  }
  emit();
}

export function flush() {
  if (!flushing) flushing = run().finally(() => { flushing = null; });
  return flushing;
}

// Resolves true when the outbox is empty, false if it is still not after `ms`.
export async function whenSynced(ms = 70000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!read().length) return true;
    flush();
    await new Promise((r) => setTimeout(r, 400));
  }
  return !read().length;
}

window.addEventListener("online", flush);
document.addEventListener("visibilitychange", () => { if (!document.hidden) flush(); });

// ---- the five things the screen does ----
export const startCall = (call) => enqueue({ method: "POST", path: "/calls", body: call });
export const saveStage = (id, n, body) => enqueue({ method: "PUT", path: `/calls/${id}/stages/${n}`, body });
export const closeCall = (id, body) => enqueue({ method: "POST", path: `/calls/${id}/close`, body });
export const listCalls = () => request("GET", "/calls?limit=200");
export const getCall = (id) => request("GET", `/calls/${id}`);
export const reviewCall = (id, force = false) => request("POST", `/calls/${id}/review${force ? "?force=true" : ""}`, null, 30000);
