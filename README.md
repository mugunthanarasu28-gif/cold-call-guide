# Call guide

The screen a caller keeps open beside a cold call. It holds the caller on the structure of the call: which of the eight stages they are in, what that stage is for, what prospects tend to say there, a tap for what happened, a box for the prospect's own words, then the next stage and the outcome. Every call is saved, and a second screen lists past calls with the stage each one reached.

| | |
|---|---|
| Live app (Vercel) | **TODO: paste URL** |
| Backend (Render) | **TODO: paste URL** |
| Health check | **TODO: paste URL**`/health` |
| LLM | Groq, `llama-3.3-70b-versatile` (free key). Used once per call, after it is saved: see "Where the LLM is" |

## How it is built

```
Vercel (React + Vite)  ──►  Render (FastAPI)  ──►  Supabase (Postgres)
  stage content lives          validates, saves,        calls, stage_results
  in the app, not the API      asks the LLM             RLS on, no public policies
```

- `frontend/`: React + Vite. `src/content/stages.js` is the product: what each stage shows. The rest renders it.
- `backend/`: FastAPI. `store.py` talks to Supabase over its REST interface with the service key; `review.py` is the post-call check.
- `supabase/schema.sql`: the two tables. Run it once in the Supabase SQL editor.
- `render.yaml`: the Render blueprint.

### Endpoints

| | |
|---|---|
| `GET /health` | Up check. Also says whether storage is Supabase or in-memory, and whether an LLM key is set |
| `POST /calls` | Start a call. The screen supplies the id, so retrying is safe |
| `PUT /calls/{id}/stages/{n}` | Save a stage: the taps and the prospect's words. Also moves the call's current stage |
| `POST /calls/{id}/close` | Close a call with its outcome and next step |
| `GET /calls` | List calls, newest first, with the stage reached and a line of the prospect's words |
| `GET /calls/{id}` | One call with every stage |
| `POST /calls/{id}/review` | Rule checks plus the LLM second read |

## Where the LLM is

After a call is closed and saved, one request goes to Groq. It reads what the caller tapped at each stage, the prospect's words, and the outcome the caller logged, and answers in JSON: does the outcome fit the evidence, what would fit better, a one-line summary for the log, and a note on how to open the next call from the prospect's own words.

Why there: the dataset README says the outcome a caller logs "does not always match what you read in the call". A model is slow and unreliable mid-call, and it would pull the caller's eyes off the prospect. After the call there is time, and the check is where it earns something. Before it, `review.py` runs plain rule checks that need no model (an outcome with no next step written, stage 5 reached with no words saved, "not interested" with no reason recorded). If the key is missing or Groq is down, the call is already saved and the rule checks still show.

The model is read only. It never changes a saved call by itself; the caller taps "Change to ..." if they agree.

## Decisions

1. **The call never waits on the server.** Render's free tier sleeps and wakes in up to a minute. So stage content ships inside the frontend, the call is created on the device with its own id, and every write goes into a localStorage outbox sent in order with retries. A caller can start, move through all eight stages and end a call while the server is still waking. The top bar shows `Saved`, `n to save` or `Waking the server`.
2. **Outcome is pre-filled from the taps.** Each tap can point to an outcome (for example "Pointed us to a colleague" points to wrong person). At the end the outcome is already selected and the caller confirms or changes it. This is aimed at the callers who log nothing; 13 of the 100 calls are `not_logged`.
3. **Stages can be jumped to, not only stepped through.** Real calls do not run in order: an objection can come at stage 2. The rail on the left is clickable; the screen records the furthest stage reached.
4. **One free-text box per stage, in the prospect's typeface.** Everything else is a tap. The box is set in a serif, the same as the "They may say" lines, so the page reads sans for the caller and serif for the prospect.
5. **The pace line uses the real numbers.** The timer shows how this call compares with the hundred: 68 of 100 ended before 2:00; the median is 1:34.

## Reading the transcripts

> **TODO before you submit: fill this in from your own reading.** The first version of `src/content/stages.js` was drafted from the task's structure page and the dataset README. Replace the "They may say" lines and the taps with what you found in the calls, and list the transcript ids in each stage's `evidence`.

- Where calls end, and at which stage: **TODO**
- What prospects say at stages 2, 3 and 6: **TODO**
- Stage 5, in their words: did the caller write it down? **TODO**
- What I changed after reading: **TODO**

`scripts/skim.py` is a helper for reading faster. It counts phrasings and prints the last lines of every call. It reads only; it writes next to the transcripts, not into this repo.

## Run it locally

```bash
# backend (uses in-memory storage until SUPABASE_* are set)
cd backend && pip install -r requirements.txt
uvicorn main:app --reload            # http://localhost:8000/health
python -m pytest -q

# frontend
cd frontend && npm install
cp .env.example .env                 # VITE_API_URL=http://localhost:8000
npm run dev                          # http://localhost:5173
```

## Deploy

1. **Supabase.** New project, SQL editor, paste `supabase/schema.sql`, run. Project Settings, API: copy the project URL and the `service_role` key.
2. **Render.** New web service from this repo (or Blueprint, which reads `render.yaml`). Root directory `backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`, plan Free, health check path `/health`. Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `ALLOWED_ORIGINS` (your Vercel URL).
3. **Vercel.** Import the repo, root directory `frontend`, environment variable `VITE_API_URL` = the Render URL, no trailing slash. Deploy. Then put the Vercel URL into `ALLOWED_ORIGINS` on Render.
4. Open `<render-url>/health`. It should say `"store": "supabase"`. If it says `memory`, the Supabase variables did not reach Render and calls will be lost when the server sleeps.

## Limits, said plainly

- There is no login. Anyone with the URL can see the list. Enter only made-up or test prospects.
- Calls open only on the device that started them (the live call is kept in that browser). Saved calls can be read from anywhere.
- The first request after a sleep takes up to a minute. Saving is queued so the call is not held up; the past-calls list shows the last list it loaded while it waits.
- Free tiers change. Check the Groq console for the current model and rate limits, and the Supabase dashboard if a project has paused for inactivity.

## Data

The 100 call transcripts and their index are for this task only and are not in this repo.
