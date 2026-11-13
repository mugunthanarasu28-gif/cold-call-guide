import uuid
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_flow():
    assert client.get("/health").json()["status"] == "ok"
    cid = str(uuid.uuid4())
    body = {"id": cid, "prospect_name": "A. Rao", "company": "Kalyx (fictional)", "prospect_role": "Director"}
    assert client.post("/calls", json=body).status_code == 201
    assert client.post("/calls", json=body).status_code == 201          # retry is safe
    assert len(client.get("/calls").json()) == 1
    r = client.put(f"/calls/{cid}/stages/2", json={"taps": ["asked_source"], "words": "who gave you this number", "current_stage": 3})
    assert r.status_code == 200
    client.put(f"/calls/{cid}/stages/3", json={"taps": [], "words": "", "current_stage": 3})
    assert client.put(f"/calls/{cid}/stages/9", json={}).status_code == 422
    c = client.get(f"/calls/{cid}").json()
    assert c["stage_reached"] == 3 and len(c["stages"]) == 2
    assert client.post(f"/calls/{cid}/close", json={"outcome": "nope"}).status_code == 422
    r = client.post(f"/calls/{cid}/close", json={"outcome": "next_step_agreed", "duration_seconds": 80})
    assert r.json()["status"] == "closed"
    rv = client.post(f"/calls/{cid}/review").json()
    assert any("nothing was recorded at stage 3, 6 or 7" in f for f in rv["flags"])
    assert rv["llm"]["available"] is False                               # no key in tests
    row = client.get("/calls").json()[0]
    assert row["snippet"] == "who gave you this number"
    assert client.put(f"/calls/{uuid.uuid4()}/stages/1", json={}).status_code == 404


def test_llm_parsing(monkeypatch):
    import json, review

    class Fake:
        def raise_for_status(self): pass
        def json(self):
            return {"choices": [{"message": {"content": json.dumps({
                "suggested_outcome": "not_interested", "matches": True, "reason": "They declined twice.",
                "summary": "Has an agency, declined.", "next_call_note": "",
            })}}]}

    monkeypatch.setenv("GROQ_API_KEY", "test")
    monkeypatch.setattr(review.httpx, "post", lambda *a, **k: Fake())
    call = {"outcome": "not_interested", "stage_reached": 6, "duration_seconds": 70, "next_step": None}
    out = review.llm_review(call, [{"stage": 6, "taps": ["Already have an agency or team"], "words": "we have an agency"}])
    assert out["available"] and out["matches"] and out["suggested_outcome"] == "not_interested"
    call["outcome"] = "interested"                      # model says not_interested, caller logged interested
    assert review.llm_review(call, [])["matches"] is False


def test_llm_down(monkeypatch):
    import review, httpx
    monkeypatch.setenv("GROQ_API_KEY", "test")
    def boom(*a, **k): raise httpx.ConnectError("nope")
    monkeypatch.setattr(review.httpx, "post", boom)
    assert review.llm_review({"outcome": "follow_up"}, [])["available"] is False
