-- ─── kpis ──────────────────────────────────────────────────────────────────
-- Per-ticker tracked KPIs. Many per ticker.
create table kpis (
  id            uuid primary key default gen_random_uuid(),
  ticker_id     uuid not null references tickers(id) on delete cascade,
  name          text not null,
  reason        text not null default '',
  target        text not null default '',
  unit          text not null default '',
  direction     text not null default 'higher_better'
                  check (direction in ('higher_better', 'lower_better', 'neutral')),
  display_order int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger kpis_updated_at
  before update on kpis
  for each row execute procedure set_updated_at();

create index on kpis (ticker_id, display_order);

-- ─── kpi_observations ──────────────────────────────────────────────────────
-- Quarterly readings for each KPI.
create table kpi_observations (
  id             uuid primary key default gen_random_uuid(),
  kpi_id         uuid not null references kpis(id) on delete cascade,
  fiscal_period  text not null,                  -- e.g. "Q1 2026"
  period_sort    date not null,                  -- first day of the period, for ordering
  value          numeric,                        -- nullable: sometimes only a note
  note           text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (kpi_id, fiscal_period)
);

create trigger kpi_observations_updated_at
  before update on kpi_observations
  for each row execute procedure set_updated_at();

create index on kpi_observations (kpi_id, period_sort desc);

-- ─── valuation_methods ─────────────────────────────────────────────────────
-- One row per ticker. Captures the entry/exit multiple thesis.
create table valuation_methods (
  id               uuid primary key default gen_random_uuid(),
  ticker_id        uuid not null unique references tickers(id) on delete cascade,
  multiple_type    text not null default 'pe'
                     check (multiple_type in ('pe','ev_ebitda','ev_ebit','ps','ev_sales','p_fcf','pb','other')),
  multiple_type_other text not null default '',
  entry_multiple   numeric,
  entry_rationale  text not null default '',
  exit_multiple    numeric,
  exit_rationale   text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger valuation_methods_updated_at
  before update on valuation_methods
  for each row execute procedure set_updated_at();

create index on valuation_methods (ticker_id);

-- ─── RLS off, grants for PostgREST ─────────────────────────────────────────
alter table kpis              disable row level security;
alter table kpi_observations  disable row level security;
alter table valuation_methods disable row level security;

grant select, insert, update, delete
  on table public.kpis              to anon, authenticated;
grant select, insert, update, delete
  on table public.kpi_observations  to anon, authenticated;
grant select, insert, update, delete
  on table public.valuation_methods to anon, authenticated;
