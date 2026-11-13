-- Cold-call guide: schema for Supabase (Postgres). Paste into the SQL editor and run once.

create extension if not exists pgcrypto;

create table if not exists calls (
  id               uuid primary key default gen_random_uuid(),  -- the app sends its own id so a call can start while the server wakes
  prospect_name    text not null,
  prospect_role    text,
  company          text not null,
  company_kind     text,
  caller_name      text,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds integer,
  status           text not null default 'open' check (status in ('open', 'closed')),
  current_stage    smallint not null default 1 check (current_stage between 1 and 8),
  stage_reached    smallint not null default 1 check (stage_reached between 1 and 8),
  outcome          text check (outcome in (
                     'agreed_to_receive_report', 'next_step_agreed', 'interested', 'follow_up',
                     'call_again', 'not_interested', 'do_not_call', 'wrong_person',
                     'moved_company', 'not_logged')),
  next_step        text,
  review           jsonb                                          -- rule flags + LLM second read, written after close
);

create table if not exists stage_results (
  id         uuid primary key default gen_random_uuid(),
  call_id    uuid not null references calls(id) on delete cascade,
  stage      smallint not null check (stage between 1 and 8),
  taps       text[] not null default '{}',                        -- what happened, in the order tapped
  words      text not null default '',                            -- the prospect's own words
  updated_at timestamptz not null default now(),
  unique (call_id, stage)
);

create index if not exists calls_started_at_idx on calls (started_at desc);
create index if not exists stage_results_call_idx on stage_results (call_id);

-- The browser never talks to Supabase. Only the Render backend does, with the service key.
-- RLS on with no policies = the public (anon) key can read and write nothing.
alter table calls enable row level security;
alter table stage_results enable row level security;
