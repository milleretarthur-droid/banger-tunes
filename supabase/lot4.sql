-- =====================================================================
-- Banger Tunes — lot 4 : alertes sans compte (email)
-- À exécuter UNE SEULE FOIS, après schema, billing, lot1, lot2 et lot3.
-- =====================================================================

-- Une ligne = une personne qui veut être prévenue par email des lives d'un DJ ou d'un magasin.
-- Aucun compte n'est nécessaire. La personne doit confirmer son adresse (lien reçu par email).
-- Table lue et écrite UNIQUEMENT par le serveur (clé service_role) : aucune règle d'accès publique.

create table if not exists public.subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null
                   check (char_length(email) <= 254 and email = lower(email) and position('@' in email) > 1),
  dj_id            uuid not null references public.djs(id) on delete cascade,
  token            uuid not null unique default gen_random_uuid(),  -- sert à confirmer et à se désinscrire
  confirmed_at     timestamptz,
  confirm_sent_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (email, dj_id)
);
create index if not exists subscribers_dj_confirmed_idx on public.subscribers (dj_id) where confirmed_at is not null;
create index if not exists subscribers_email_idx on public.subscribers (email, created_at);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

-- Évite d'envoyer deux fois la même alerte à la même personne.
create table if not exists public.subscriber_alert_log (
  subscriber_id  uuid not null references public.subscribers(id) on delete cascade,
  live_id        uuid not null references public.lives(id) on delete cascade,
  sent_at        timestamptz not null default now(),
  primary key (subscriber_id, live_id)
);
alter table public.subscriber_alert_log enable row level security;
revoke all on public.subscriber_alert_log from anon, authenticated;
