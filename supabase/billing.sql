-- =====================================================================
-- Live Banger — facturation et inscription ouverte
-- À exécuter UNE SEULE FOIS, après supabase/schema.sql.
-- Supabase > SQL Editor > New query > coller > Run.
--
-- Offres :
--   - 5 € par live (crédit de publication, sans expiration)
--   - 15 € par mois : 5 lives par période d'abonnement
--   - 171 € par an (15 € x 12, -5 %) : lives illimités
--   - 1 live offert à la création du premier profil créateur
-- Mêmes tarifs pour les DJ et les magasins de vinyles.
-- =====================================================================

-- ---------- Type de profil créateur ----------

alter table public.djs
  add column if not exists kind text not null default 'dj'
  check (kind in ('dj', 'store'));

-- Tout compte connecté peut créer SON profil créateur (un seul par compte).
create policy "djs: création de son propre profil"
  on public.djs for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ---------- Tables de facturation ----------
-- Écrites uniquement par le serveur (webhook Stripe, clé service_role)
-- et par les déclencheurs ci-dessous. Lisibles par leur propriétaire.

create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text not null unique,
  plan                    text not null check (plan in ('monthly', 'annual')),
  status                  text not null,
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  updated_at              timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id);

create table public.live_credits (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  source             text not null check (source in ('free_first_live', 'purchase')),
  stripe_session_id  text,
  unit_index         integer,
  used_at            timestamptz,
  live_id            uuid references public.lives(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (stripe_session_id, unit_index)
);
create index live_credits_available_idx on public.live_credits (user_id) where used_at is null;

-- Journal des publications : supprimer un live ne rend pas le quota.
create table public.live_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  live_id     uuid references public.lives(id) on delete set null,
  source      text not null check (source in ('annual', 'monthly', 'free_first_live', 'purchase')),
  created_at  timestamptz not null default now()
);
create index live_usage_user_idx on public.live_usage (user_id, source, created_at);

-- Un seul live offert par compte, même si le profil est supprimé puis recréé.
create table public.free_live_grants (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  granted_at  timestamptz not null default now()
);

alter table public.subscriptions     enable row level security;
alter table public.live_credits      enable row level security;
alter table public.live_usage        enable row level security;
alter table public.free_live_grants  enable row level security; -- aucune policy : invisible côté site

create policy "subscriptions: lecture par le propriétaire"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "live_credits: lecture par le propriétaire"
  on public.live_credits for select to authenticated
  using (user_id = (select auth.uid()));

create policy "live_usage: lecture par le propriétaire"
  on public.live_usage for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- 1er live offert ----------
-- Déclenché à la création d'un profil, ou quand un compte est relié à un profil existant.

create or replace function public.grant_free_live()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.user_id is not distinct from new.user_id then
      return new;
    end if;
  end if;

  insert into public.free_live_grants (user_id) values (new.user_id)
  on conflict do nothing;

  if found then
    insert into public.live_credits (user_id, source)
    values (new.user_id, 'free_first_live');
  end if;

  return new;
end;
$$;

create trigger djs_grant_free_live
  after insert or update of user_id on public.djs
  for each row execute function public.grant_free_live();

-- ---------- Contrôle des droits à la création d'un live ----------
-- Ordre : abonnement annuel (illimité) > abonnement mensuel (5 par période)
--         > live offert > lives achetés à l'unité.
-- Sans droit valide, la création est refusée (message NO_ENTITLEMENT).
-- Les écritures faites depuis le SQL Editor ou le service_role ne sont pas facturées.

create or replace function public.consume_live_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  dj_owner  uuid;
  sub       public.subscriptions%rowtype;
  used      integer;
  cred      public.live_credits%rowtype;
begin
  if uid is null then
    return new;
  end if;

  select user_id into dj_owner from public.djs where id = new.dj_id;
  if dj_owner is distinct from uid then
    return new; -- les règles RLS refuseront cette écriture
  end if;

  -- Évite deux créations simultanées qui dépasseraient le quota.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select * into sub
    from public.subscriptions
   where user_id = uid
     and status in ('active', 'trialing')
     and current_period_end + interval '1 day' > now()
   order by (plan = 'annual') desc, current_period_end desc
   limit 1;

  if found and sub.plan = 'annual' then
    insert into public.live_usage (user_id, live_id, source)
    values (uid, new.id, 'annual');
    return new;
  end if;

  if found and sub.plan = 'monthly' then
    select count(*) into used
      from public.live_usage
     where user_id = uid
       and source = 'monthly'
       and created_at >= sub.current_period_start;
    if used < 5 then
      insert into public.live_usage (user_id, live_id, source)
      values (uid, new.id, 'monthly');
      return new;
    end if;
  end if;

  select * into cred
    from public.live_credits
   where user_id = uid and used_at is null
   order by (source = 'free_first_live') desc, created_at
   limit 1
   for update;

  if found then
    update public.live_credits
       set used_at = now(), live_id = new.id
     where id = cred.id;
    insert into public.live_usage (user_id, live_id, source)
    values (uid, new.id, cred.source);
    return new;
  end if;

  raise exception 'NO_ENTITLEMENT: aucun live disponible, choisis une offre'
    using errcode = 'P0001';
end;
$$;

create trigger lives_consume_allowance
  after insert on public.lives
  for each row execute function public.consume_live_allowance();

-- ---------- Un live ne revient pas en arrière ----------
-- a_venir -> en_cours -> termine, jamais l'inverse : un live payé ne sert qu'une fois.

create or replace function public.prevent_live_reopen()
returns trigger
language plpgsql
as $$
declare
  old_rank integer := case old.status when 'a_venir' then 1 when 'en_cours' then 2 else 3 end;
  new_rank integer := case new.status when 'a_venir' then 1 when 'en_cours' then 2 else 3 end;
begin
  if new_rank < old_rank and auth.uid() is not null then
    raise exception 'LIVE_STATUS: un live ne peut pas revenir en arrière'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger lives_prevent_reopen
  before update on public.lives
  for each row execute function public.prevent_live_reopen();
