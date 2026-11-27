-- =====================================================================
-- Banger Tunes — lot 18 : les mixes (lien Mixcloud / SoundCloud / YouTube + tracklist horodatée)
-- À exécuter UNE SEULE FOIS. Aucun fichier audio n'est hébergé : seul le lien est enregistré.
-- =====================================================================

create table if not exists public.mixes (
  id          uuid primary key default gen_random_uuid(),
  dj_id       uuid not null references public.djs(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  slug        text not null unique check (char_length(slug) between 1 and 80),
  url         text not null check (char_length(url) <= 500 and url like 'https://%'),
  platform    text not null check (platform in ('youtube', 'mixcloud', 'soundcloud')),
  cover_url   text check (cover_url is null or cover_url like 'https://%'),
  created_at  timestamptz not null default now()
);
create index if not exists mixes_dj_id_idx on public.mixes (dj_id);
create index if not exists mixes_created_idx on public.mixes (created_at desc);

create table if not exists public.mix_tracks (
  id             uuid primary key default gen_random_uuid(),
  mix_id         uuid not null references public.mixes(id) on delete cascade,
  position       integer not null check (position > 0),
  title          text not null check (char_length(title) between 1 and 160),
  artist         text not null check (char_length(artist) between 1 and 160),
  discogs_url    text,
  price          numeric(8, 2) check (price is null or price >= 0),
  cover_url      text,
  sold           boolean not null default false,
  sale_mode      text not null default 'online' check (sale_mode in ('online', 'store', 'unreleased')),
  -- moment du mix (en secondes) où le disque démarre ; facultatif
  start_seconds  integer check (start_seconds is null or start_seconds between 0 and 86400),
  constraint mix_tracks_unreleased_no_sale check (sale_mode <> 'unreleased' or (discogs_url is null and price is null)),
  -- vérifiée en fin d'opération : permet de réordonner toute la liste en une seule requête
  constraint mix_tracks_pos unique (mix_id, position) deferrable initially deferred
);
create index if not exists mix_tracks_mix_idx on public.mix_tracks (mix_id);

-- ---------- Droits d'accès (Row Level Security) ----------
alter table public.mixes enable row level security;
alter table public.mix_tracks enable row level security;

drop policy if exists "mixes: lecture publique" on public.mixes;
create policy "mixes: lecture publique" on public.mixes for select using (true);

drop policy if exists "mixes: le créateur gère ses mixes" on public.mixes;
create policy "mixes: le créateur gère ses mixes" on public.mixes for all to authenticated
  using (exists (select 1 from public.djs d where d.id = mixes.dj_id and d.user_id = (select auth.uid())))
  with check (exists (select 1 from public.djs d where d.id = mixes.dj_id and d.user_id = (select auth.uid())));

drop policy if exists "mix_tracks: lecture publique" on public.mix_tracks;
create policy "mix_tracks: lecture publique" on public.mix_tracks for select using (true);

drop policy if exists "mix_tracks: le créateur gère ses disques" on public.mix_tracks;
create policy "mix_tracks: le créateur gère ses disques" on public.mix_tracks for all to authenticated
  using (exists (
    select 1 from public.mixes m join public.djs d on d.id = m.dj_id
    where m.id = mix_tracks.mix_id and d.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.mixes m join public.djs d on d.id = m.dj_id
    where m.id = mix_tracks.mix_id and d.user_id = (select auth.uid())
  ));

-- ---------- Changer l'ordre des disques d'un mix ----------
create or replace function public.reorder_mix_tracks(p_mix_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing uuid[];
begin
  if not exists (select 1 from public.mixes where id = p_mix_id) then
    raise exception 'REORDER_NOT_FOUND: mix introuvable' using errcode = 'P0001';
  end if;
  select coalesce(array_agg(id), '{}') into existing from public.mix_tracks where mix_id = p_mix_id;
  if coalesce(array_length(p_ids, 1), 0) <> coalesce(array_length(existing, 1), 0)
     or not (existing @> p_ids and p_ids @> existing) then
    raise exception 'REORDER_MISMATCH: la liste ne correspond pas à la tracklist' using errcode = 'P0001';
  end if;
  update public.mix_tracks t set position = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
    where t.id = o.id and t.mix_id = p_mix_id;
  if not found and coalesce(array_length(p_ids, 1), 0) > 0 then
    raise exception 'REORDER_FORBIDDEN: modification refusée' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.reorder_mix_tracks(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_mix_tracks(uuid, uuid[]) to authenticated;
