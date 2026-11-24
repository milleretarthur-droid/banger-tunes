-- =====================================================================
-- Banger Tunes — lot 3 : cover des lives, photos, live à la une
-- À exécuter UNE SEULE FOIS, après schema.sql, billing.sql, lot1.sql et lot2.sql.
-- =====================================================================

-- ---------- Cover des lives ----------

alter table public.lives add column if not exists cover_url text;
alter table public.lives drop constraint if exists lives_cover_url_https;
alter table public.lives add constraint lives_cover_url_https
  check (cover_url is null or cover_url ~* '^https://');

-- ---------- Live mis à la une sur l'accueil (choisi par l'administrateur) ----------
-- Une seule ligne. Lecture publique ; écriture uniquement par le serveur (clé service_role).

create table if not exists public.site_settings (
  id                boolean primary key default true check (id),
  featured_live_id  uuid references public.lives(id) on delete set null,
  updated_at        timestamptz not null default now()
);
insert into public.site_settings (id) values (true) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

drop policy if exists "site_settings: lecture publique" on public.site_settings;
create policy "site_settings: lecture publique"
  on public.site_settings for select using (true);

-- ---------- Stockage des images (covers et photos de profil) ----------
-- Bucket public en lecture ; chaque compte n'écrit que dans son propre dossier (son identifiant).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "covers: ajout dans son dossier" on storage.objects;
create policy "covers: ajout dans son dossier"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "covers: modification dans son dossier" on storage.objects;
create policy "covers: modification dans son dossier"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "covers: suppression dans son dossier" on storage.objects;
create policy "covers: suppression dans son dossier"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
