import { useMemo, useState } from "react";
import { OUTCOMES, OUTCOME_LABEL, STAGES, suggestOutcome } from "../content/stages.js";
import { clearActive, fmt, loadActive } from "../active.js";
import { closeCall, reviewCall, whenSynced } from "../api.js";
import { ReviewCard, StagePips } from "../ui.jsx";

const GROUPS = [...new Set(OUTCOMES.map((o) => o.group))];

export default function Wrap({ id }) {
  const [call] = useState(() => { const c = loadActive(); return c && c.id === id ? c : null; });
  const suggested = useMemo(() => (call ? suggestOutcome(call.results) : null), [call]);
  const [outcome, setOutcome] = useState(suggested);
  const [nextStep, setNextStep] = useState("");
  const [phase, setPhase] = useState("form"); // form | saved | reviewing | done
  const [review, setReview] = useState(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(null);

  if (!call && phase === "form") {
    return (
      <main className="page narrow">
        <h1>This call is already saved</h1>
        <p className="lede"><a href={`#/calls/${id}`}>Open it</a> or <a href="#/calls">see past calls</a>.</p>
      </main>
    );
  }

  const seconds = call ? Math.max(0, Math.floor((new Date(call.endedAt || Date.now()) - new Date(call.startedAt)) / 1000)) : sent?.duration_seconds;
  const needs = call?.results?.[5]?.words?.trim() || "";

  const save = async (chosen, step, ended, secs) => {
    const body = { outcome: chosen, next_step: step || null, ended_at: ended, duration_seconds: secs };
    setSent(body);
    closeCall(id, body);
    clearActive();
    setPhase("saved");
    setNote("");
    if (!(await whenSynced())) { setNote("Saved on this device. It goes to the server as soon as the server wakes."); return; }
    setPhase("reviewing");
    try { setReview(await reviewCall(id, true)); } catch { setNote("The call is saved. The review could not run."); }
    setPhase("done");
  };

  const apply = (o) => { setOutcome(o); setReview(null); save(o, sent.next_step, sent.ended_at, sent.duration_seconds); };

  if (phase !== "form") {
    return (
      <main className="page narrow">
        <h1>{phase === "saved" ? "Saving the call" : "Call saved"}</h1>
        <p className="lede">
          {OUTCOME_LABEL[outcome] || "No outcome"}, {fmt(seconds || 0)}.
          {phase === "saved" && " Waiting for the server to confirm."}
          {phase === "reviewing" && " Reading the call for a second opinion."}
        </p>
        {note && <p className="muted">{note}</p>}
        <ReviewCard review={review} outcome={outcome} onApply={apply} />
        <div className="actions">
          <a className="btn btn-primary" href="#/">Start the next call</a>
          <a className="btn btn-quiet" href="#/calls">Past calls</a>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <h1>End the call</h1>
      <p className="lede">
        {call.prospect_name}, {call.company}. <StagePips reached={call.reached} /> Stage {call.reached}, {STAGES[call.reached - 1].name}, {fmt(seconds)}.
      </p>

      <section className="record" aria-label="What the record holds">
        <h2>Their words, stage 5</h2>
        {needs
          ? <blockquote>{needs}</blockquote>
          : <p className="muted">Nothing saved. {call.reached >= 5 ? "You reached this stage, so the next call has nothing of theirs to start from." : "The call ended before this stage."} <a href={`#/call/${id}`}>Go back and add it</a></p>}
      </section>

      <section aria-labelledby="outcome-h">
        <h2 id="outcome-h">Outcome</h2>
        {suggested && <p className="muted">Filled in from what you tapped. Change it if it is wrong.</p>}
        {GROUPS.map((g) => (
          <fieldset key={g} className="group">
            <legend>{g}</legend>
            {OUTCOMES.filter((o) => o.group === g).map((o) => (
              <label key={o.id} className={`choice ${outcome === o.id ? "is-on" : ""}`}>
                <input type="radio" name="outcome" checked={outcome === o.id} onChange={() => setOutcome(o.id)} />
                <span className="choice-label">{o.label}</span>
                <span className="choice-note">{o.note}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </section>

      <label className="field">
        <h2>Next step</h2>
        <input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="One thing, with a time or a channel. For example: report on WhatsApp today, call Thursday 3pm" />
      </label>

      <div className="actions stick">
        <button className="btn btn-primary" disabled={!outcome} onClick={() => save(outcome, nextStep.trim(), call.endedAt || new Date().toISOString(), seconds)}>
          Save call
        </button>
        <a className="btn btn-quiet" href={`#/call/${id}`}>Back to the call</a>
      </div>
    </main>
  );
}
