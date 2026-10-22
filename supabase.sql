-- Run once in Supabase → SQL Editor
create table if not exists crm_data (
  key  text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- No auth yet: allow the anon key to read/write this one table.
-- WARNING: anyone who has your site URL + anon key can read and edit this data.
alter table crm_data enable row level security;
drop policy if exists "anon full access" on crm_data;
create policy "anon full access" on crm_data
  for all to anon using (true) with check (true);
