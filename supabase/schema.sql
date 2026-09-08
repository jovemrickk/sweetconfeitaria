-- Sweet Dreams Gestão - sincronização cloud (etapa seguinte)
-- Rode no SQL Editor de um projeto Supabase NOVO/SEPARADO para a confeitaria.

create table if not exists public.sweet_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sweet_app_state enable row level security;

create policy "owner can read sweet state"
on public.sweet_app_state for select
using (auth.uid() = user_id);

create policy "owner can insert sweet state"
on public.sweet_app_state for insert
with check (auth.uid() = user_id);

create policy "owner can update sweet state"
on public.sweet_app_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sweet_app_state_updated_at on public.sweet_app_state;
create trigger sweet_app_state_updated_at
before update on public.sweet_app_state
for each row execute procedure public.set_updated_at();
