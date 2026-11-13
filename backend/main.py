import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from review import OUTCOMES, review_call
from store import make_store

store = make_store()
app = FastAPI(title="Cold-call guide API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

Outcome = Literal[tuple(OUTCOMES)]  # type: ignore[valid-type]


@app.exception_handler(httpx.HTTPError)
async def storage_down(_, exc):
    # Supabase unreachable or erroring. 502 tells the screen to keep the write and retry.
    return JSONResponse({"detail": f"Storage error: {type(exc).__name__}"}, status_code=502)


class CallStart(BaseModel):
    id: Optional[uuid.UUID] = None          # the screen generates it, so starting a call is safe to retry
    prospect_name: str = Field(min_length=1, max_length=120)
    prospect_role: Optional[str] = Field(default=None, max_length=120)
    company: str = Field(min_length=1, max_length=160)
    company_kind: Optional[str] = Field(default=None, max_length=80)
    caller_name: Optional[str] = Field(default=None, max_length=80)
    started_at: Optional[datetime] = None


class StageSave(BaseModel):
    taps: list[str] = Field(default_factory=list, max_length=12)
    words: str = Field(default="", max_length=2000)
    current_stage: Optional[int] = Field(default=None, ge=1, le=8)   # where the caller is going next


class CallClose(BaseModel):
    outcome: Outcome
    next_step: Optional[str] = Field(default=None, max_length=300)
    ended_at: Optional[datetime] = None          # the screen measured these; a queued close may arrive late
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=86400)


def _must_get(call_id: str):
    call = store.get_call(call_id)
    if call is None:
        raise HTTPException(404, "No such call")
    return call


@app.get("/health")
def health():
    return {
        "status": "ok",
        "store": store.kind,
        "llm_configured": bool(os.getenv("GROQ_API_KEY")),
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/calls", status_code=201)
def start_call(body: CallStart):
    cid = str(body.id or uuid.uuid4())
    row = {
        "id": cid,
        "prospect_name": body.prospect_name.strip(),
        "prospect_role": (body.prospect_role or "").strip() or None,
        "company": body.company.strip(),
        "company_kind": body.company_kind,
        "caller_name": (body.caller_name or "").strip() or None,
        "started_at": (body.started_at or datetime.now(timezone.utc)).isoformat(),
        "status": "open",
        "current_stage": 1,
        "stage_reached": 1,
        "ended_at": None, "duration_seconds": None, "outcome": None, "next_step": None, "review": None,
    }
    return store.create_call(row)


@app.put("/calls/{call_id}/stages/{stage}")
def save_stage(body: StageSave, call_id: uuid.UUID, stage: int = Path(ge=1, le=8)):
    cid = str(call_id)
    call = _must_get(cid)
    taps = [t.strip()[:60] for t in body.taps if t.strip()]
    store.upsert_stage(cid, stage, taps, body.words)
    moved_to = body.current_stage or stage
    store.update_call(cid, {
        "current_stage": moved_to,
        "stage_reached": max(call.get("stage_reached") or 1, stage, moved_to),
    })
    return {"ok": True, "stage": stage}


@app.post("/calls/{call_id}/close")
def close_call(body: CallClose, call_id: uuid.UUID):
    cid = str(call_id)
    _must_get(cid)
    patch = {
        "status": "closed",
        "outcome": body.outcome,
        "next_step": (body.next_step or "").strip() or None,
        "ended_at": (body.ended_at or datetime.now(timezone.utc)).isoformat(),
        "duration_seconds": body.duration_seconds,
    }
    return store.update_call(cid, patch)


@app.post("/calls/{call_id}/review")
def review(call_id: uuid.UUID, force: bool = False):
    cid = str(call_id)
    call = _must_get(cid)
    if call.get("review") and not force:
        return call["review"]
    result = review_call(call, store.stages_for(cid))
    store.update_call(cid, {"review": result})
    return result


@app.get("/calls")
def list_calls(limit: int = Query(100, ge=1, le=500), outcome: Optional[str] = None):
    calls = store.list_calls(limit, outcome)
    words = store.words_for([c["id"] for c in calls])
    by_call: dict[str, dict[int, str]] = {}
    for w in words:
        by_call.setdefault(w["call_id"], {})[w["stage"]] = w["words"].strip()
    out = []
    for c in calls:
        said = by_call.get(c["id"], {})
        # Prefer the stage 5 words; otherwise the latest words the caller wrote.
        snippet = said.get(5) or (said[max(said)] if said else "")
        out.append({**c, "snippet": snippet[:160]})
    return out


@app.get("/calls/{call_id}")
def get_call(call_id: uuid.UUID):
    cid = str(call_id)
    return {**_must_get(cid), "stages": store.stages_for(cid)}
