import { useState } from "react";
import { startCall } from "../api.js";
import { COMPANY_KINDS } from "../content/stages.js";
import { loadActive, newCall, saveActive, clearActive } from "../active.js";

export default function Start() {
  const open = loadActive();
  const [f, setF] = useState({
    prospect_name: "", prospect_role: "", company: "", company_kind: "",
    caller_name: localStorage.getItem("cg.caller") || "",
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!f.prospect_name.trim() || !f.company.trim()) return;
    localStorage.setItem("cg.caller", f.caller_name);
    const call = newCall(f);
    saveActive(call);
    startCall({
      id: call.id, prospect_name: f.prospect_name, prospect_role: f.prospect_role || null,
      company: f.company, company_kind: f.company_kind || null, caller_name: f.caller_name || null,
      started_at: call.startedAt,
    });
    location.hash = `#/call/${call.id}`;
  };

  return (
    <main className="page narrow">
      {open && (
        <div className="resume">
          <p>
            A call with <b>{open.prospect_name}</b> at {open.company} is still open on this device,
            at stage {open.stage}.
          </p>
          <a className="btn" href={`#/call/${open.id}`}>Go back to the call</a>
          <button className="btn btn-quiet" onClick={() => { clearActive(); location.reload(); }}>Discard it</button>
        </div>
      )}
      <h1>Start a call</h1>
      <p className="lede">The guide opens at stage 1 and keeps the clock. Fill in what the list tells you; you can leave the role empty.</p>
      <form onSubmit={submit} className="form">
        <label>Prospect <input required value={f.prospect_name} onChange={set("prospect_name")} autoComplete="off" /></label>
        <label>Role <input value={f.prospect_role} onChange={set("prospect_role")} autoComplete="off" /></label>
        <label>Company <input required value={f.company} onChange={set("company")} autoComplete="off" /></label>
        <label>
          Kind of company
          <select value={f.company_kind} onChange={set("company_kind")}>
            <option value="">Not known</option>
            {COMPANY_KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label>Your name <input value={f.caller_name} onChange={set("caller_name")} autoComplete="off" /></label>
        <button className="btn btn-primary" type="submit">Start call</button>
      </form>
    </main>
  );
}
