-- CONFEITARIA SWEET • estado compartilhado em nuvem
-- Rode este arquivo no SQL Editor do projeto Supabase da confeitaria.
-- Nesta versão, vocês usam o MESMO login nos dois celulares/PCs.

create table if not exists public.sweet_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sweet_app_state enable row level security;

drop policy if exists "owner can read sweet state" on public.sweet_app_state;
drop policy if exists "owner can insert sweet state" on public.sweet_app_state;
drop policy if exists "owner can update sweet state" on public.sweet_app_state;

create policy "owner can read sweet state"
on public.sweet_app_state for select
to authenticated
using (auth.uid() = user_id);

create policy "owner can insert sweet state"
on public.sweet_app_state for insert
to authenticated
with check (auth.uid() = user_id);

create policy "owner can update sweet state"
on public.sweet_app_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_sweet_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sweet_app_state_updated_at on public.sweet_app_state;
create trigger sweet_app_state_updated_at
before update on public.sweet_app_state
for each row execute function public.set_sweet_updated_at();

-- Necessário para atualização instantânea entre os aparelhos.
do $$
begin
  alter publication supabase_realtime add table public.sweet_app_state;
exception
  when duplicate_object then null;
end $$;
