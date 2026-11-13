import { useEffect, useRef, useState } from "react";
import { CALL_LENGTH, STAGES, tapLabel } from "../content/stages.js";
import { fmt, loadActive, saveActive, useElapsed } from "../active.js";
import { saveStage } from "../api.js";

export default function Live({ id }) {
  const [call, setCall] = useState(() => {
    const c = loadActive();
    return c && c.id === id ? { ...c, endedAt: null } : null; // coming back from the wrap-up resumes the call
  });
  const ref = useRef(call);
  const debounce = useRef();
  const elapsed = useElapsed(call?.startedAt);

  const commit = (next) => { ref.current = next; saveActive(next); setCall(next); };
  const push = (c, n, moveTo) => {
    const r = c.results[n] || { taps: [], words: "" };
    saveStage(c.id, n, { taps: r.taps.map((t) => tapLabel(n, t)), words: r.words, current_stage: moveTo ?? c.stage });
  };

  const toggle = (tapId) => {
    const c = structuredClone(ref.current);
    const r = (c.results[c.stage] ||= { taps: [], words: "" });
    r.taps = r.taps.includes(tapId) ? r.taps.filter((t) => t !== tapId) : [...r.taps, tapId];
    commit(c);
    push(c, c.stage);
  };

  const type = (words) => {
    const c = structuredClone(ref.current);
    (c.results[c.stage] ||= { taps: [], words: "" }).words = words;
    commit(c);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(ref.current, ref.current.stage), 700);
  };

  const goTo = (m) => {
    const c = structuredClone(ref.current);
    if (m === c.stage) return;
    clearTimeout(debounce.current);
    push(c, c.stage, m);
    c.stage = m;
    c.reached = Math.max(c.reached, m);
    commit(c);
    window.scrollTo({ top: 0 });
  };

  const end = () => {
    const c = structuredClone(ref.current);
    clearTimeout(debounce.current);
    push(c, c.stage);
    c.endedAt = new Date().toISOString();
    commit(c);
    location.hash = `#/wrap/${c.id}`;
  };

  // Keys 1 to 9 tap what happened, unless the caller is typing.
  useEffect(() => {
    const on = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      const t = STAGES[ref.current.stage - 1].taps[i];
      if (t) toggle(t.id);
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  if (!call) {
    return (
      <main className="page narrow">
        <h1>This call is not on this device</h1>
        <p className="lede">Calls open only on the device that started them. <a href="#/">Start a call</a> or <a href="#/calls">see past calls</a>.</p>
      </main>
    );
  }

  const stage = STAGES[call.stage - 1];
  const here = call.results[call.stage] || { taps: [], words: "" };
  const next = STAGES[call.stage];
  const pace = elapsed < 120
    ? `${CALL_LENGTH.shorterThan120} of ${CALL_LENGTH.of} calls in the transcripts ended before 2:00.`
    : `Past 2:00. Only ${CALL_LENGTH.of - CALL_LENGTH.shorterThan120} of ${CALL_LENGTH.of} calls in the transcripts ran this long.`;

  const railNote = (n) => {
    const r = call.results[n];
    if (!r) return n < call.reached ? "skipped" : "";
    const bits = r.taps.map((t) => tapLabel(n, t));
    if (r.words.trim()) bits.push("words saved");
    return bits.join(", ");
  };

  return (
    <main className="live">
      <nav className="rail" aria-label="Stages of the call">
        <ol>
          {STAGES.map((s) => (
            <li key={s.n}>
              <button
                className={`rail-item ${s.n === call.stage ? "is-now" : s.n <= call.reached ? "is-seen" : ""}`}
                aria-current={s.n === call.stage ? "step" : undefined}
                onClick={() => goTo(s.n)}
              >
                <span className="rail-n">{s.n}</span>
                <span className="rail-name">{s.name}</span>
                <span className="rail-note">{railNote(s.n)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="stage" aria-labelledby="stage-title">
        <div className="who">
          <div>
            <b>{call.prospect_name}</b>
            <span className="who-sub">{[call.prospect_role, call.company].filter(Boolean).join(", ")}</span>
          </div>
          <div className="clock" aria-label="Call time">{fmt(elapsed)}</div>
        </div>
        <p className="pace">{pace}</p>

        <h1 id="stage-title">
          <span className="stage-of">Stage {stage.n} of 8</span>
          {stage.name}
        </h1>
        <p className="purpose">{stage.purpose}</p>

        <h2>They may say</h2>
        <ul className="says">
          {stage.says.map((q) => <li key={q}>{q.startsWith("(") ? q : `\u201C${q}\u201D`}</li>)}
        </ul>

        <h2>What happened</h2>
        <div className="taps">
          {stage.taps.map((t, i) => (
            <button key={t.id} className="tap" aria-pressed={here.taps.includes(t.id)} onClick={() => toggle(t.id)}>
              <kbd>{i + 1}</kbd>{t.label}
            </button>
          ))}
        </div>

        <label htmlFor="words"><h2>Their words</h2></label>
        <textarea
          id="words"
          rows={stage.n === 5 ? 5 : 3}
          value={here.words}
          onChange={(e) => type(e.target.value)}
          placeholder={stage.wordsHint || "Only if they said something worth keeping."}
        />

        <div className="actions">
          {next
            ? <button className="btn btn-primary" onClick={() => goTo(call.stage + 1)}>Next: {next.name}</button>
            : <button className="btn btn-primary" onClick={end}>Finish the call</button>}
          {next && <button className="btn btn-quiet" onClick={end}>End call</button>}
        </div>
      </section>
    </main>
  );
}
