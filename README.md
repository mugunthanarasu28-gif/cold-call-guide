# Call guide

The screen a caller keeps open beside a cold call. It holds the caller on the structure of the call: which of the eight stages they are in, what that stage is for, what prospects tend to say there, a tap for what happened, a box for the prospect's own words, then the next stage and the outcome. Every call is saved, and a second screen lists past calls with the stage each one reached.

| | |
|---|---|
| Live app (Vercel) | https://cold-call-guide-pi.vercel.app |
| Backend (Render) | https://cold-call-guide-1.onrender.com |
| Health check | https://cold-call-guide-1.onrender.com/health |
| LLM in the app | Groq, `openai/gpt-oss-20b` (free key). Used once per call, after it is saved, to check the logged outcome: see "Where the LLM is" |
| LLM used to build it | Claude (Anthropic) helped write the code and read the transcripts with me. Every number on the screen was checked against the transcripts |

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

The model is `openai/gpt-oss-20b`. The first model I picked, `llama-3.3-70b-versatile`, was no longer on Groq's list while I was building, so the code asks Groq which models are live and falls back down a short preferred list; the real Groq error is shown on the screen if all of them fail. The model is read only. It never changes a saved call by itself; the caller taps "Change to ..." if they agree.

## Decisions

1. **The call never waits on the server.** Render's free tier sleeps and wakes in up to a minute. So stage content ships inside the frontend, the call is created on the device with its own id, and every write goes into a localStorage outbox sent in order with retries. A caller can start, move through all eight stages and end a call while the server is still waking. The top bar shows `Saved`, `n to save` or `Waking the server`.
2. **Outcome is pre-filled from the taps, but only where the calls agree.** Each tap can point to an outcome (for example "Document on WhatsApp" points to report agreed). At the end the outcome is already selected and the caller confirms or changes it. This is aimed at the callers who log nothing; 13 of the 100 calls are `not_logged`. After reading the calls I removed the pre-fill from "Not the right person": of 16 calls where that came up, only 2 were logged wrong person and 10 were logged not interested or do not call, so any guess would have been wrong more often than right.
3. **Stages can be jumped to, not only stepped through.** Real calls do not run in order. In 71 calls the caller asked "is this a good time?" before saying why they called, and 39 prospects answered with a question (who is this, what is it regarding), so permission and purpose swap places. The rail on the left is clickable; the screen records the furthest stage reached.
4. **One free-text box per stage, in the prospect's typeface.** Everything else is a tap. The box is set in a serif, the same as the "They may say" lines, so the page reads sans for the caller and serif for the prospect.
5. **The pace line uses the real numbers.** The timer shows how this call compares with the hundred: 68 of 100 ended before 2:00; the median is 1:34. Past 2:00 it says that 17 of the 32 longer calls ended well, against 15 of the 68 shorter ones, and tells the caller not to rush a call that is going well. A call that is going well also runs longer, so it is a note, not a target.

## Reading the transcripts

I read all 100 calls and counted patterns in them. Numbers marked "about" are keyword counts that I checked by reading the matching lines. The rest are exact. Every stage on the screen has a "What the 100 calls show here" line and a few call numbers to read.

**What I found**

1. **Calls are short and most end early.** Median length is 94 seconds. 68 of 100 ended before 2:00 and 25 before one minute. 17 calls were logged wrong person (8), left the company (5) or call again for language or a bad line (4), and those were the shortest, 45 to 71 seconds in the middle.
2. **Permission comes before purpose.** 71 callers asked "is this a good time?" before saying why they called. 30 prospects said go ahead, 39 answered with a question (who is this, regarding what) and only 2 clearly said no. So the screen lets the caller jump between stages 2 and 3, and the purpose line has to be ready first.
3. **The logged outcome does not follow from what the prospect says.** "Do not call" is logged 10 times and no prospect says anything like it. Of 16 calls where the prospect said "not the right person" or pointed elsewhere, 2 were logged wrong person and 10 were logged not interested or do not call. So a tap pre-fills the outcome only where the calls agree with each other, and the caller picks the rest.
4. **Yes or no growth questions get a bare yes.** 10 calls used the scripted questions (people's growth, trying new things, regular review) and the answers were mostly "yes" or "of course". 5 calls asked what the one challenge in their way is, and 2 got a real need back (T089, T098). Stage 5 therefore tells the caller to ask open questions and write the exact words.
5. **Objections.** About 6 prospects already had a consultant, agency or internal team, about 15 were not the right person or pointed elsewhere, about 12 said a plain no. Asked who to talk to instead, 2 gave a name (T025, T030) and 4 refused (T029, T041, T070, T075).
6. **Next step.** About 41 prospects said to send something and 22 of those calls were logged as report agreed, next step agreed or interested. Some of those yeses were polite (T043, T091). 12 prospects asked for our website, clients or samples first. Only 5 calls were callbacks, and 2 of them ended in a next step agreed (against 9 of the 95 first calls). That is a small number.
7. **Longer calls end better, but do not read it as "talk longer".** 15 of the 68 calls under 2:00 ended well (report agreed, next step or interested) against 17 of the 32 that ran longer. A call that is going well also runs longer.

**What I changed after reading:** the stage content in `src/content/stages.js` is rewritten from these calls. Each stage has a "What the 100 calls show here" line and the transcript ids it came from. I dropped a tap nobody used ("said it is a sales call"), added taps for what did happen (asked who we are, asked about cost, asked for our website or clients, would not give a colleague's contact), and put the open-question advice on stage 5.

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

1. **Supabase.** New project, SQL editor, paste `supabase/schema.sql`, run. Project Settings, API: copy the project URL and the secret (service) key.
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
