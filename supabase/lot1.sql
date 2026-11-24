-- =====================================================================
-- Banger Tunes — lot 1 : adresses de régie, ordre des disques, vendu, replay
-- À exécuter UNE SEULE FOIS, après schema.sql et billing.sql.
-- Supabase > SQL Editor > New query > coller > Run.
-- =====================================================================

-- ---------- Lives : adresse lisible, début réel, calage du replay ----------

alter table public.lives add column if not exists slug text;
alter table public.lives add column if not exists started_at timestamptz;
-- Décalage (en secondes) entre le clic "Démarrer" et le début de la vidéo YouTube.
alter table public.lives add column if not exists replay_offset integer not null default 0;

-- Adresse pour les lives déjà créés (ex. "disco-friday-session-aaaa").
update public.lives
   set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), ''), 'live')
              || '-' || substr(id::text, 1, 4)
 where slug is null;

alter table public.lives alter column slug set not null;
create unique index if not exists lives_slug_key on public.lives (slug);

-- Si un live est créé sans adresse (ex. depuis le SQL Editor), on en fabrique une.
create or replace function public.set_live_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g')), ''), 'live')
                || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end if;
  return new;
end;
$$;

drop trigger if exists lives_set_slug on public.lives;
create trigger lives_set_slug
  before insert on public.lives
  for each row execute function public.set_live_slug();

-- Heure réelle de démarrage : sert à caler le replay sur la vidéo.
create or replace function public.set_live_started_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'en_cours' and old.status is distinct from 'en_cours' and new.started_at is null then
    new.started_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists lives_set_started_at on public.lives;
create trigger lives_set_started_at
  before update on public.lives
  for each row execute function public.set_live_started_at();

-- ---------- Disques : heure de passage et statut vendu ----------

alter table public.tracklist add column if not exists played_at timestamptz;
alter table public.tracklist add column if not exists sold boolean not null default false;

-- ---------- Réorganiser la tracklist (glisser-déposer) ----------
-- Reçoit la liste COMPLÈTE des disques dans le nouvel ordre.
-- Les disques déjà passés restent verrouillés tant que le live est en cours.
-- Exécutée avec les droits de l'utilisateur : seul le propriétaire peut l'utiliser.

create or replace function public.reorder_tracklist(p_live_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur_index  integer;
  lstatus    text;
  existing   uuid[];
  prefix     uuid[];
  n          integer;
  k          integer;
  touched    integer;
begin
  select current_index, status into cur_index, lstatus
    from public.lives where id = p_live_id;
  if not found then
    raise exception 'REORDER_NOT_FOUND: live introuvable' using errcode = 'P0001';
  end if;
  if lstatus = 'termine' then
    raise exception 'REORDER_LOCKED: un live terminé ne peut plus être modifié' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id order by position), '{}') into existing
    from public.tracklist where live_id = p_live_id;
  n := coalesce(array_length(existing, 1), 0);

  if coalesce(array_length(p_ids, 1), 0) <> n or not (existing @> p_ids and p_ids @> existing) then
    raise exception 'REORDER_MISMATCH: la liste ne correspond pas à la tracklist' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id order by position), '{}') into prefix
    from public.tracklist where live_id = p_live_id and position <= cur_index;
  k := coalesce(array_length(prefix, 1), 0);

  if k > 0 and p_ids[1:k] is distinct from prefix then
    raise exception 'REORDER_PLAYED: les disques déjà passés ne peuvent pas être déplacés' using errcode = 'P0001';
  end if;

  -- Deux temps pour ne pas heurter la contrainte unique (live_id, position).
  update public.tracklist set position = position + 1000000 where live_id = p_live_id;
  update public.tracklist t
     set position = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where t.id = o.id and t.live_id = p_live_id;
  get diagnostics touched = row_count;

  if touched <> n then
    raise exception 'REORDER_FORBIDDEN: modification refusée' using errcode = 'P0001';
  end if;

  if cur_index > 0 then
    update public.lives set current_index = k where id = p_live_id;
  end if;
end;
$$;

revoke execute on function public.reorder_tracklist(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_tracklist(uuid, uuid[]) to authenticated;
