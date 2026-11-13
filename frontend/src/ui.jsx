import { OUTCOME_LABEL, STAGES } from "./content/stages.js";

export function StagePips({ reached, total = 8 }) {
  return (
    <span className="pips" role="img" aria-label={`Reached stage ${reached} of ${total}, ${STAGES[reached - 1]?.name}`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i + 1 < reached ? "on" : i + 1 === reached ? "now" : ""} />
      ))}
    </span>
  );
}

export function OutcomePill({ call }) {
  if (call.status !== "closed") return <span className="pill pill-open">Not closed</span>;
  return <span className={`pill pill-${call.outcome || "not_logged"}`}>{OUTCOME_LABEL[call.outcome] || "No outcome"}</span>;
}

// Rule checks plus the LLM second read. `onApply` changes the outcome to the one the model suggests.
export function ReviewCard({ review, outcome, onApply }) {
  if (!review) return null;
  const { flags = [], llm } = review;
  return (
    <section className="review" aria-label="Review of this call">
      <h2>Review</h2>
      {flags.length > 0 && (
        <ul className="flags">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
      )}
      {llm?.available ? (
        <div className="llm">
          <p className="summary">{llm.summary}</p>
          <p className={llm.matches ? "verdict ok" : "verdict warn"}>
            {llm.matches
              ? `The words fit the outcome you logged, ${OUTCOME_LABEL[outcome] || outcome}.`
              : `The words point to ${OUTCOME_LABEL[llm.suggested_outcome] || llm.suggested_outcome}, not ${OUTCOME_LABEL[outcome] || "the outcome you logged"}.`}{" "}
            {llm.reason}
          </p>
          {!llm.matches && onApply && llm.suggested_outcome !== outcome && (
            <button className="btn btn-quiet" onClick={() => onApply(llm.suggested_outcome)}>
              Change to {OUTCOME_LABEL[llm.suggested_outcome]}
            </button>
          )}
          {llm.next_call_note && <p className="note"><b>Next call:</b> {llm.next_call_note}</p>}
        </div>
      ) : (
        <p className="muted">The model read is not available. {llm?.reason}</p>
      )}
      {flags.length === 0 && !llm?.available && <p className="muted">No problems found by the rule checks.</p>}
    </section>
  );
}
