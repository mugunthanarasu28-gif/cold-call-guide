"""Storage behind the API. SupabaseStore talks to Supabase's REST interface (PostgREST).
MemoryStore is used when SUPABASE_URL is not set, so the app runs locally with nothing installed.
/health reports which one is active, so a production deploy that forgot its env vars is visible."""
import os
from datetime import datetime, timezone

import httpx


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryStore:
    kind = "memory"

    def __init__(self):
        self.calls: dict[str, dict] = {}
        self.stages: dict[tuple, dict] = {}

    def get_call(self, cid):
        return self.calls.get(cid)

    def create_call(self, row):
        return self.calls.setdefault(row["id"], row)

    def update_call(self, cid, patch):
        call = self.calls.get(cid)
        if call is not None:
            call.update(patch)
        return call

    def upsert_stage(self, cid, stage, taps, words):
        self.stages[(cid, stage)] = {
            "call_id": cid, "stage": stage, "taps": taps, "words": words, "updated_at": now_iso(),
        }

    def stages_for(self, cid):
        rows = [v for (c, _), v in self.stages.items() if c == cid]
        return sorted(rows, key=lambda r: r["stage"])

    def list_calls(self, limit, outcome=None):
        rows = sorted(self.calls.values(), key=lambda r: r["started_at"], reverse=True)
        if outcome:
            rows = [r for r in rows if r.get("outcome") == outcome]
        return rows[:limit]

    def words_for(self, ids):
        return [
            {"call_id": c, "stage": s, "words": v["words"]}
            for (c, s), v in self.stages.items()
            if c in ids and v["words"].strip()
        ]


class SupabaseStore:
    kind = "supabase"

    def __init__(self, url: str, key: str):
        # Legacy service_role keys are JWTs (start with "eyJ") and go in both headers.
        # New secret keys (sb_secret_...) are not JWTs and go in the apikey header only.
        headers = {"apikey": key, "Content-Type": "application/json"}
        if not key.startswith("sb_"):
            headers["Authorization"] = f"Bearer {key}"
        self.http = httpx.Client(base_url=url.rstrip("/") + "/rest/v1", headers=headers, timeout=10)

    def _rows(self, resp):
        resp.raise_for_status()
        return resp.json() if resp.content else []

    def get_call(self, cid):
        rows = self._rows(self.http.get("/calls", params={"id": f"eq.{cid}", "select": "*"}))
        return rows[0] if rows else None

    def create_call(self, row):
        rows = self._rows(self.http.post(
            "/calls", params={"on_conflict": "id"}, json=row,
            headers={"Prefer": "resolution=ignore-duplicates,return=representation"},
        ))
        return rows[0] if rows else self.get_call(row["id"])  # empty = it already existed

    def update_call(self, cid, patch):
        rows = self._rows(self.http.patch(
            "/calls", params={"id": f"eq.{cid}"}, json=patch,
            headers={"Prefer": "return=representation"},
        ))
        return rows[0] if rows else None

    def upsert_stage(self, cid, stage, taps, words):
        self._rows(self.http.post(
            "/stage_results", params={"on_conflict": "call_id,stage"},
            json={"call_id": cid, "stage": stage, "taps": taps, "words": words, "updated_at": now_iso()},
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        ))

    def stages_for(self, cid):
        return self._rows(self.http.get(
            "/stage_results", params={"call_id": f"eq.{cid}", "select": "*", "order": "stage.asc"}))

    def list_calls(self, limit, outcome=None):
        params = {"select": "*", "order": "started_at.desc", "limit": str(limit)}
        if outcome:
            params["outcome"] = f"eq.{outcome}"
        return self._rows(self.http.get("/calls", params=params))

    def words_for(self, ids):
        if not ids:
            return []
        return self._rows(self.http.get("/stage_results", params={
            "select": "call_id,stage,words", "call_id": f"in.({','.join(ids)})", "words": "neq.",
        }))


def make_store():
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
    return SupabaseStore(url, key) if url and key else MemoryStore()
