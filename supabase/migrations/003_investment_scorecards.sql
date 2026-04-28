-- ─── investment_scorecards ─────────────────────────────────────────────────
-- One row per ticker; upsert on save. All sub-criteria are 0–3.
create table investment_scorecards (
  id          uuid primary key default gen_random_uuid(),
  ticker_id   uuid not null unique references tickers(id) on delete cascade,

  -- Pillar 1: Management Quality (max 15)
  p1_capital_allocation  int not null default 0 check (p1_capital_allocation  between 0 and 3),
  p1_insider_ownership   int not null default 0 check (p1_insider_ownership   between 0 and 3),
  p1_investor_relations  int not null default 0 check (p1_investor_relations  between 0 and 3),
  p1_founder_involvement int not null default 0 check (p1_founder_involvement between 0 and 3),
  p1_ceo_quality         int not null default 0 check (p1_ceo_quality         between 0 and 3),
  p1_notes               text not null default '',

  -- Pillar 2: Business Quality (max 12)
  p2_competitive_moat    int not null default 0 check (p2_competitive_moat   between 0 and 3),
  p2_pricing_power       int not null default 0 check (p2_pricing_power      between 0 and 3),
  p2_reinvestment_runway int not null default 0 check (p2_reinvestment_runway between 0 and 3),
  p2_balance_sheet       int not null default 0 check (p2_balance_sheet      between 0 and 3),
  p2_notes               text not null default '',

  -- Pillar 3: Growing Business Fundamentals (max 12)
  p3_roic_trend          int not null default 0 check (p3_roic_trend         between 0 and 3),
  p3_margin_expansion    int not null default 0 check (p3_margin_expansion   between 0 and 3),
  p3_visible_catalysts   int not null default 0 check (p3_visible_catalysts  between 0 and 3),
  p3_under_followed      int not null default 0 check (p3_under_followed     between 0 and 3),
  p3_notes               text not null default '',

  -- Pillar 4: Valuation (max 12)
  p4_absolute_valuation  int not null default 0 check (p4_absolute_valuation between 0 and 3),
  p4_relative_valuation  int not null default 0 check (p4_relative_valuation between 0 and 3),
  p4_downside_protection int not null default 0 check (p4_downside_protection between 0 and 3),
  p4_risk_reward         int not null default 0 check (p4_risk_reward        between 0 and 3),
  p4_notes               text not null default '',

  -- Pillar 5: Business Simplicity (max 9)
  -- KNOCKOUT: if p5_accounting_clarity = 0, entire Pillar 5 score = 0
  p5_accounting_clarity  int not null default 0 check (p5_accounting_clarity between 0 and 3),
  p5_capital_structure   int not null default 0 check (p5_capital_structure  between 0 and 3),
  p5_debt_structure      int not null default 0 check (p5_debt_structure     between 0 and 3),
  p5_notes               text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger scorecards_updated_at
  before update on investment_scorecards
  for each row execute procedure set_updated_at();

create index on investment_scorecards (ticker_id);

alter table investment_scorecards disable row level security;

grant select, insert, update, delete
  on table public.investment_scorecards to anon, authenticated;
