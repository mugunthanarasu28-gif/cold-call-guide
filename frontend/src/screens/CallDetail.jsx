import { useEffect, useState } from "react";
import { getCall, reviewCall } from "../api.js";
import { STAGES } from "../content/stages.js";
import { fmt } from "../active.js";
import { OutcomePill, ReviewCard, StagePips } from "../ui.jsx";

export default function CallDetail({ id }) {
  const [call, setCall] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getCall(id).then(setCall).catch(() => setErr("Could not load this call. The server may still be waking.")); }, [id]);

  const runReview = async () => {
    setBusy(true);
    try { setCall({ ...call, review: await reviewCall(id, true) }); } catch { setErr("The review could not run."); }
    setBusy(false);
  };

  if (err && !call) return <main className="page narrow"><p className="muted">{err} <a href="#/calls">Back to past calls</a></p></main>;
  if (!call) return <main className="page narrow"><p className="muted">Loading.</p></main>;

  const by = Object.fromEntries(call.stages.map((s) => [s.stage, s]));

  return (
    <main className="page narrow">
      <p><a href="#/calls">Past calls</a></p>
      <h1>{call.prospect_name}</h1>
      <p className="lede">{[call.prospect_role, call.company, call.company_kind].filter(Boolean).join(", ")}</p>
      <p className="meta">
        <OutcomePill call={call} /> <StagePips reached={call.stage_reached} /> Stage {call.stage_reached}, {STAGES[call.stage_reached - 1].name}
        {call.duration_seconds != null && `, ${fmt(call.duration_seconds)}`}
        {call.caller_name && `, called by ${call.caller_name}`}
      </p>
      {call.next_step && <p><b>Next step:</b> {call.next_step}</p>}

      <ol className="record-list">
        {STAGES.filter((s) => s.n <= call.stage_reached).map((s) => {
          const r = by[s.n];
          return (
            <li key={s.n}>
              <h2>{s.n}. {s.name}</h2>
              {r?.taps?.length ? <p className="chips">{r.taps.map((t) => <span key={t} className="chip">{t}</span>)}</p> : <p className="muted">Nothing tapped.</p>}
              {r?.words?.trim() && <blockquote>{r.words}</blockquote>}
            </li>
          );
        })}
      </ol>

      <ReviewCard review={call.review} outcome={call.outcome} />
      {call.status === "closed" && (
        <button className="btn btn-quiet" onClick={runReview} disabled={busy}>{busy ? "Reading the call" : call.review ? "Run the review again" : "Review this call"}</button>
      )}
      {err && <p className="muted">{err}</p>}
    </main>
  );
}
