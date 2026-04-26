-- Grant PostgREST visibility: the anon/authenticated roles must have explicit
-- table-level permissions for Supabase to include the tables in its schema
-- cache, even when RLS is disabled.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on table public.tickers             to anon, authenticated;
grant select, insert, update, delete
  on table public.writeups            to anon, authenticated;
grant select, insert, update, delete
  on table public.earnings_summaries  to anon, authenticated;
grant select, insert, update, delete
  on table public.attachments         to anon, authenticated;
