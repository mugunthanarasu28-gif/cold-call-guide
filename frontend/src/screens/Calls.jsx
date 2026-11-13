import { useEffect, useMemo, useState } from "react";
import { listCalls } from "../api.js";
import { OUTCOMES, STAGES } from "../content/stages.js";
import { fmt } from "../active.js";
import { OutcomePill, StagePips } from "../ui.jsx";

const CACHE = "cg.calls.cache";

export default function Calls() {
  const [rows, setRows] = useState(() => { try { return JSON.parse(localStorage.getItem(CACHE)) || null; } catch { return null; } });
  const [state, setState] = useState("loading"); // loading | ok | failed
  const [outcome, setOutcome] = useState("");

  const load = () => {
    setState("loading");
    listCalls()
      .then((r) => { setRows(r); setState("ok"); try { localStorage.setItem(CACHE, JSON.stringify(r)); } catch { /* ignore */ } })
      .catch(() => setState("failed"));
  };
  useEffect(load, []);

  const ends = useMemo(() => {
    const counts = Array(8).fill(0);
    (rows || []).filter((c) => c.status === "closed").forEach((c) => { counts[c.stage_reached - 1] += 1; });
    return counts;
  }, [rows]);
  const most = Math.max(1, ...ends);
  const shown = (rows || []).filter((c) => !outcome || c.outcome === outcome);

  return (
    <main className="page">
      <h1>Past calls</h1>

      {state === "loading" && <p className="muted">{rows ? "Refreshing." : "Loading. If the server was asleep this can take up to a minute."}</p>}
      {state === "failed" && (
        <p className="muted">The server did not answer. {rows ? "This is the last list it sent. " : ""}<button className="linklike" onClick={load}>Try again</button></p>
      )}

      {rows && rows.length === 0 && state === "ok" && <p className="lede">No calls yet. <a href="#/">Start one.</a></p>}

      {rows && rows.some((c) => c.status === "closed") && (
        <section className="ends" aria-label="Where calls end">
          <h2>Where your calls end</h2>
          <ol>
            {STAGES.map((s) => (
              <li key={s.n}>
                <span className="ends-count">{ends[s.n - 1]}</span>
                <span className="ends-bar" style={{ height: `${Math.max(4, (ends[s.n - 1] / most) * 72)}px` }} />
                <span className="ends-name">{s.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="filter">
            <label>Outcome{" "}
              <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option value="">All calls</option>
                {OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <span className="muted">{shown.length} of {rows.length}</span>
          </div>
          <ul className="calls">
            {shown.map((c) => (
              <li key={c.id}>
                <a href={`#/calls/${c.id}`} className="call-row">
                  <div className="call-main">
                    <b>{c.prospect_name}</b>
                    <span className="call-co">{[c.prospect_role, c.company].filter(Boolean).join(", ")}</span>
                    {c.snippet && <span className="call-words">{c.snippet}</span>}
                  </div>
                  <div className="call-stage">
                    <StagePips reached={c.stage_reached} />
                    <span>{STAGES[c.stage_reached - 1].name}</span>
                  </div>
                  <div className="call-end">
                    <OutcomePill call={c} />
                    <span className="muted">
                      {new Date(c.started_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {c.duration_seconds != null && `, ${fmt(c.duration_seconds)}`}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
