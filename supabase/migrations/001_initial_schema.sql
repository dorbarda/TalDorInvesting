-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enum for ticker status
create type ticker_status as enum ('holding', 'watching', 'passed', 'exited');

-- ─── tickers ───────────────────────────────────────────────────────────────
create table tickers (
  id                  uuid primary key default gen_random_uuid(),
  symbol              text not null,
  company_name        text not null,
  status              ticker_status not null default 'watching',
  confidence_score    int check (confidence_score between 1 and 10),
  price_score         int check (price_score between 1 and 10),
  five_pillars_score  int check (five_pillars_score between 1 and 10),
  last_earnings_date  date,
  next_earnings_date  date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickers_updated_at
  before update on tickers
  for each row execute procedure set_updated_at();

-- ─── writeups ──────────────────────────────────────────────────────────────
create table writeups (
  id          uuid primary key default gen_random_uuid(),
  ticker_id   uuid not null references tickers(id) on delete cascade,
  title       text not null,
  content_md  text not null default '',
  version     int not null default 1,
  created_at  timestamptz not null default now()
);

-- auto-increment version per ticker
create or replace function set_writeup_version()
returns trigger language plpgsql as $$
begin
  select coalesce(max(version), 0) + 1
  into new.version
  from writeups
  where ticker_id = new.ticker_id;
  return new;
end;
$$;

create trigger writeups_version
  before insert on writeups
  for each row execute procedure set_writeup_version();

-- ─── earnings_summaries ────────────────────────────────────────────────────
create table earnings_summaries (
  id             uuid primary key default gen_random_uuid(),
  ticker_id      uuid not null references tickers(id) on delete cascade,
  earnings_date  date not null,
  content_md     text not null default '',
  created_at     timestamptz not null default now()
);

-- ─── attachments ───────────────────────────────────────────────────────────
create table attachments (
  id            uuid primary key default gen_random_uuid(),
  ticker_id     uuid not null references tickers(id) on delete cascade,
  filename      text not null,
  storage_path  text not null,
  file_type     text not null,
  created_at    timestamptz not null default now()
);

-- ─── RLS: disabled (no auth) ───────────────────────────────────────────────
alter table tickers          disable row level security;
alter table writeups         disable row level security;
alter table earnings_summaries disable row level security;
alter table attachments      disable row level security;

-- ─── Indexes ───────────────────────────────────────────────────────────────
create index on tickers (status);
create index on tickers (next_earnings_date);
create index on writeups (ticker_id, version desc);
create index on earnings_summaries (ticker_id, earnings_date desc);
create index on attachments (ticker_id);

-- ─── Grants (required for PostgREST schema cache) ──────────────────────────
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on table public.tickers             to anon, authenticated;
grant select, insert, update, delete
  on table public.writeups            to anon, authenticated;
grant select, insert, update, delete
  on table public.earnings_summaries  to anon, authenticated;
grant select, insert, update, delete
  on table public.attachments         to anon, authenticated;
