-- Add live market price tracking to tickers
alter table tickers
  add column current_price    numeric(10, 2),
  add column price_updated_at timestamptz;
