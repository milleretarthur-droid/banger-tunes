-- =====================================================================
-- Banger Tunes — lot 2 : admin, localisation, suivis et alertes
-- À exécuter UNE SEULE FOIS, après schema.sql, billing.sql et lot1.sql.
-- =====================================================================

-- ---------- Administrateurs ----------
-- Une ligne = un compte administrateur. Géré uniquement depuis le SQL Editor.

create table public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;

-- Un compte connecté peut savoir s'il est administrateur (et seulement lui).
create policy "admins: lecture de sa propre ligne"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Profils : suspension et localisation ----------

alter table public.djs add column if not exists suspended boolean not null default false;
alter table public.djs add column if not exists city text;
alter table public.djs add column if not exists lat double precision;
alter table public.djs add column if not exists lng double precision;

-- Un créateur suspendu ne peut plus créer de live.
create or replace function public.block_suspended_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.djs where id = new.dj_id and suspended) then
    raise exception 'SUSPENDED: ce compte est suspendu' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists lives_block_suspended on public.lives;
create trigger lives_block_suspended
  before insert on public.lives
  for each row execute function public.block_suspended_creator();

-- Le créateur ne peut pas lever lui-même sa suspension.
create or replace function public.protect_suspended_flag()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.suspended is distinct from old.suspended then
    raise exception 'SUSPENDED_FLAG: modification interdite' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists djs_protect_suspended on public.djs;
create trigger djs_protect_suspended
  before update on public.djs
  for each row execute function public.protect_suspended_flag();

-- ---------- Crédits offerts par l'administrateur ----------

alter table public.live_credits drop constraint if exists live_credits_source_check;
alter table public.live_credits add constraint live_credits_source_check
  check (source in ('free_first_live', 'purchase', 'admin_grant'));

alter table public.live_usage drop constraint if exists live_usage_source_check;
alter table public.live_usage add constraint live_usage_source_check
  check (source in ('annual', 'monthly', 'free_first_live', 'purchase', 'admin_grant'));

-- ---------- Suivre un DJ ou un magasin ----------

create table public.follows (
  user_id     uuid not null references auth.users(id) on delete cascade,
  dj_id       uuid not null references public.djs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, dj_id)
);
create index follows_dj_idx on public.follows (dj_id);
alter table public.follows enable row level security;

create policy "follows: lecture de ses suivis"
  on public.follows for select to authenticated
  using (user_id = (select auth.uid()));
create policy "follows: suivre"
  on public.follows for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "follows: ne plus suivre"
  on public.follows for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Préférences et journal des alertes ----------

create table public.alert_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  email_enabled  boolean not null default true,
  updated_at     timestamptz not null default now()
);
alter table public.alert_prefs enable row level security;

create policy "alert_prefs: lecture"
  on public.alert_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "alert_prefs: création"
  on public.alert_prefs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "alert_prefs: modification"
  on public.alert_prefs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Évite d'envoyer deux fois la même alerte. Écrit uniquement par le serveur.
create table public.alert_log (
  user_id  uuid not null references auth.users(id) on delete cascade,
  live_id  uuid not null references public.lives(id) on delete cascade,
  kind     text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, live_id, kind)
);
alter table public.alert_log enable row level security;
