"""After a call is closed: (1) deterministic checks on the record, (2) an LLM second read.
The data this was built from has a known problem: the outcome a caller logs does not always match
what was said on the call. The rule checks catch the mechanical mismatches without any model;
the LLM reads the taps and the prospect's words and says whether the logged outcome fits."""
import json
import os

import httpx

STAGES = ["Opening", "Purpose", "Permission", "Their business", "Their need", "Objection", "Next step", "Close"]

OUTCOMES = {
    "agreed_to_receive_report": "the prospect agreed to receive a document, on WhatsApp or email",
    "next_step_agreed": "a meeting, a call at a set time, or a report plus a follow-up call was agreed",
    "interested": "the prospect said they were interested, without a fixed next step",
    "follow_up": "the caller is to call again",
    "call_again": "the number is to be called again, often because of language or line quality",
    "not_interested": "the prospect declined",
    "do_not_call": "the prospect asked not to be called, or the caller judged it so",
    "wrong_person": "the person reached was not the person listed, or not the right person",
    "moved_company": "the person no longer works at the listed company",
    "not_logged": "the caller logged nothing for this call",
}
NEEDS_NEXT_STEP = {"next_step_agreed", "agreed_to_receive_report"}


def _by_stage(stages):
    return {s["stage"]: s for s in stages}


def rule_flags(call: dict, stages: list[dict]) -> list[str]:
    st = _by_stage(stages)
    outcome = call.get("outcome")
    reached = call.get("stage_reached") or 1
    flags = []
    if not outcome or outcome == "not_logged":
        flags.append("No outcome was logged for this call.")
    if outcome in NEEDS_NEXT_STEP and not any(st.get(n, {}).get("taps") or (st.get(n, {}).get("words") or "").strip() for n in (3, 6, 7)):
        flags.append(f"Logged as {outcome.replace('_', ' ')}, but nothing was recorded at stage 3, 6 or 7 to show where it was agreed.")
    if outcome in NEEDS_NEXT_STEP and not (call.get("next_step") or "").strip():
        flags.append("A next step was agreed but none is written down. The next call has nothing to start from.")
    if reached >= 5 and not (st.get(5, {}).get("words") or "").strip():
        flags.append("Stage 5 was reached but the prospect's own words were not saved.")
    s6 = st.get(6, {})
    if outcome == "not_interested" and reached >= 6 and not s6.get("taps") and not (s6.get("words") or "").strip():
        flags.append("Logged as not interested, but no reason for the no was recorded at stage 6.")
    return flags


def _evidence(call, stages):
    lines = [f"Stage reached: {call.get('stage_reached')} of 8. Duration: {call.get('duration_seconds')} seconds."]
    for s in stages:
        if s["taps"] or s["words"].strip():
            lines.append(f"Stage {s['stage']} ({STAGES[s['stage'] - 1]}): what happened = {s['taps']}; prospect's words = {s['words'].strip()!r}")
    lines.append(f"Next step written by caller: {(call.get('next_step') or '').strip() or '(none)'}")
    lines.append(f"Outcome the caller logged: {call.get('outcome')}")
    return "\n".join(lines)


SYSTEM = (
    "You check one logged cold call made by a growth-consulting company in India. "
    "You are given what the caller tapped at each stage, the prospect's words as the caller wrote them, and the outcome the caller logged. "
    "Decide whether the logged outcome fits that evidence. Use only the evidence. Never invent quotes. "
    "If a stage has no words, say so rather than guessing.\n\nOutcome meanings:\n"
    + "\n".join(f"- {k}: {v}" for k, v in OUTCOMES.items())
    + '\n\nReply with JSON only: {"suggested_outcome": one of the outcome keys, "matches": true or false, '
    '"reason": under 25 words, "summary": one line of under 30 words for the call log, '
    '"next_call_note": under 25 words on how to open the next call, built from the prospect\'s own words, or "" if there are none}'
)

GROQ = "https://api.groq.com/openai/v1"
# Groq retires and adds models often (llama-3.3-70b-versatile is gone from the list as of Nov 2026).
# The first live one of these is used when the configured model fails. Set LLM_MODEL to pin one.
PREFERRED = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]


def _reason(e: Exception) -> str:
    """Say what actually went wrong, so the screen can show it instead of a class name."""
    if isinstance(e, httpx.HTTPStatusError):
        code = e.response.status_code
        try:
            msg = e.response.json()["error"]["message"]
        except Exception:
            msg = e.response.text[:160]
        hint = {
            401: " The key was refused. Create a new key in the Groq console and paste it again with no spaces or quotes.",
            429: " Rate limit. Try again in a minute.",
        }.get(code, "")
        return f"Groq answered {code}: {msg}{hint}"[:300]
    if isinstance(e, (ValueError, KeyError, IndexError)):
        return "The model answered in a format the app could not read."
    return f"The model could not be reached ({type(e).__name__})."


def _parse(content) -> dict:
    """The reply should be one JSON object. Take the first {...} in case the model added words around it."""
    if not content:
        raise ValueError("empty reply")
    start, end = content.find("{"), content.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON in reply")
    return json.loads(content[start:end + 1])


def _chat(key: str, model: str, call: dict, stages: list[dict]) -> dict:
    body = {
        "model": model,
        "temperature": 0.2,
        "max_tokens": 1500,  # room for the model's own reasoning as well as the short JSON answer
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": _evidence(call, stages)}],
    }
    if model.startswith("openai/gpt-oss"):
        body["reasoning_effort"] = "low"      # a quick check does not need long reasoning
        body["include_reasoning"] = False
    else:
        body["response_format"] = {"type": "json_object"}
    r = httpx.post(f"{GROQ}/chat/completions", headers={"Authorization": f"Bearer {key}"}, json=body, timeout=20)
    r.raise_for_status()
    return _parse(r.json()["choices"][0]["message"]["content"])


def _live_models(key: str, skip: str) -> list[str]:
    r = httpx.get(f"{GROQ}/models", headers={"Authorization": f"Bearer {key}"}, timeout=8)
    r.raise_for_status()
    live = {m["id"] for m in r.json().get("data", [])}
    return [m for m in PREFERRED if m in live and m != skip]


def llm_review(call: dict, stages: list[dict]) -> dict:
    key = (os.getenv("GROQ_API_KEY") or "").strip().strip("\"'")
    if not key:
        return {"available": False, "reason": "No LLM key is set on the server."}
    first = (os.getenv("LLM_MODEL") or PREFERRED[0]).strip()
    queue, looked, model, data, last = [first], False, first, None, None
    while queue and data is None:
        model = queue.pop(0)
        try:
            data = _chat(key, model, call, stages)
            break
        except httpx.HTTPStatusError as e:
            last = e
            if e.response.status_code not in (400, 404):   # 401, 429, 5xx: another model will not help
                break
        except (KeyError, ValueError, IndexError) as e:     # unreadable reply: another model might do better
            last = e
        except httpx.HTTPError as e:                        # network trouble
            last = e
            break
        if not looked:                                      # the model may be retired: ask Groq what is live
            looked = True
            try:
                queue = _live_models(key, skip=first)[:2]
            except httpx.HTTPError as e:
                last = e
    if data is None:
        return {"available": False, "reason": _reason(last)}
    suggested = data.get("suggested_outcome")
    if suggested not in OUTCOMES:
        suggested = call.get("outcome")
    return {
        "available": True,
        "model": model,
        "suggested_outcome": suggested,
        "matches": bool(data.get("matches")) and suggested == call.get("outcome"),
        "reason": str(data.get("reason", ""))[:240],
        "summary": str(data.get("summary", ""))[:240],
        "next_call_note": str(data.get("next_call_note", ""))[:240],
    }


def review_call(call, stages):
    return {"flags": rule_flags(call, stages), "llm": llm_review(call, stages)}
