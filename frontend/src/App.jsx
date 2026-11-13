import { useEffect, useState } from "react";
import { flush, ping, subscribe } from "./api.js";
import { useHash } from "./active.js";
import Start from "./screens/Start.jsx";
import Live from "./screens/Live.jsx";
import Wrap from "./screens/Wrap.jsx";
import Calls from "./screens/Calls.jsx";
import CallDetail from "./screens/CallDetail.jsx";

function Sync() {
  const [s, setS] = useState({ server: "unknown", pending: 0 });
  useEffect(() => subscribe(setS), []);
  const text =
    s.pending > 0 ? `${s.pending} to save${s.server === "waking" ? ", server is waking up" : ""}`
    : s.server === "waking" ? "Waking the server"
    : s.server === "down" ? "Server not reachable"
    : s.server === "awake" ? "Saved" : "";
  return <span className={`sync sync-${s.pending > 0 ? "busy" : s.server}`} role="status">{text}</span>;
}

export default function App() {
  const hash = useHash();
  useEffect(() => { ping(); flush(); }, []); // wake Render and send anything left over from last time

  const [, a, b] = hash.split("/");
  let screen;
  if (a === "call" && b) screen = <Live id={b} />;
  else if (a === "wrap" && b) screen = <Wrap id={b} />;
  else if (a === "calls" && b) screen = <CallDetail id={b} />;
  else if (a === "calls") screen = <Calls />;
  else screen = <Start />;

  return (
    <>
      <header className="top">
        <a className="brand" href="#/">Call guide</a>
        <nav>
          <a href="#/" aria-current={!a ? "page" : undefined}>New call</a>
          <a href="#/calls" aria-current={a === "calls" ? "page" : undefined}>Past calls</a>
        </nav>
        <Sync />
      </header>
      {screen}
    </>
  );
}
