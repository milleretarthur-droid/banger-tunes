-- =====================================================================
-- Live Banger — schéma Supabase
-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- Peut être relancé sur un projet vierge uniquement.
-- =====================================================================

-- ---------- Tables ----------

create table public.djs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique references auth.users(id) on delete set null,
  name           text not null,
  slug           text not null unique,
  bio            text,
  genre          text,
  discogs_url    text,
  instagram_url  text,
  photo_url      text,
  access_status  text not null default 'gratuit'
                 check (access_status in ('gratuit', 'payant')),
  created_at     timestamptz not null default now()
);

create table public.lives (
  id             uuid primary key default gen_random_uuid(),
  dj_id          uuid not null references public.djs(id) on delete cascade,
  title          text not null,
  youtube_url    text,
  scheduled_at   timestamptz,
  status         text not null default 'a_venir'
                 check (status in ('a_venir', 'en_cours', 'termine')),
  -- position du disque en cours dans la tracklist (0 = aucun disque lancé)
  current_index  integer not null default 0 check (current_index >= 0),
  created_at     timestamptz not null default now()
);
create index lives_dj_id_idx on public.lives (dj_id);
create index lives_status_idx on public.lives (status);

create table public.tracklist (
  id           uuid primary key default gen_random_uuid(),
  live_id      uuid not null references public.lives(id) on delete cascade,
  position     integer not null check (position > 0),
  title        text not null,
  artist       text not null,
  discogs_url  text,
  price        numeric(8, 2) check (price is null or price >= 0),
  cover_url    text,
  unique (live_id, position)
);

-- ---------- Droits d'accès (Row Level Security) ----------
-- Lecture publique pour tous les visiteurs.
-- Écriture réservée au DJ propriétaire (compte relié via djs.user_id).

alter table public.djs       enable row level security;
alter table public.lives     enable row level security;
alter table public.tracklist enable row level security;

create policy "djs: lecture publique"
  on public.djs for select using (true);

create policy "djs: le DJ modifie son profil"
  on public.djs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "lives: lecture publique"
  on public.lives for select using (true);

create policy "lives: le DJ gère ses lives"
  on public.lives for all to authenticated
  using (exists (
    select 1 from public.djs d
    where d.id = lives.dj_id and d.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.djs d
    where d.id = lives.dj_id and d.user_id = (select auth.uid())
  ));

create policy "tracklist: lecture publique"
  on public.tracklist for select using (true);

create policy "tracklist: le DJ gère ses disques"
  on public.tracklist for all to authenticated
  using (exists (
    select 1 from public.lives l
    join public.djs d on d.id = l.dj_id
    where l.id = tracklist.live_id and d.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.lives l
    join public.djs d on d.id = l.dj_id
    where l.id = tracklist.live_id and d.user_id = (select auth.uid())
  ));

-- ---------- Temps réel ----------
-- Le clic sur "Next" arrive instantanément chez tous les spectateurs.

alter publication supabase_realtime add table public.lives;
alter publication supabase_realtime add table public.tracklist;

-- ---------- Données d'exemple (facultatif, supprimables) ----------
-- Les liens Discogs sont des recherches, les prix sont fictifs.

insert into public.djs (id, name, slug, bio, genre, access_status) values
  ('11111111-1111-4111-8111-111111111111', 'Théo Manivel', 'theo-manivel',
   'Disco, boogie et rééditions rares.', 'Disco · Boogie', 'gratuit'),
  ('22222222-2222-4222-8222-222222222222', 'Nadia Kore', 'nadia-kore',
   'House et sons afro, sélection 100 % vinyle.', 'House · Afro', 'gratuit');

insert into public.lives (id, dj_id, title, scheduled_at, status, current_index) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'Disco Friday Session', now(), 'en_cours', 2),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222',
   'Afro House Sunset', now() + interval '2 days', 'a_venir', 0);

insert into public.tracklist (live_id, position, title, artist, discogs_url, price) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'Good Times', 'Chic',
   'https://www.discogs.com/search/?q=Chic+Good+Times&type=release', 12.00),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, 'Supernature', 'Cerrone',
   'https://www.discogs.com/search/?q=Cerrone+Supernature&type=release', 18.50),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3, 'You Make Me Feel (Mighty Real)', 'Sylvester',
   'https://www.discogs.com/search/?q=Sylvester+Mighty+Real&type=release', 15.00),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 4, 'A Lover''s Holiday', 'Change',
   'https://www.discogs.com/search/?q=Change+A+Lover%27s+Holiday&type=release', 14.00),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 5, 'I''m Ready', 'Kano',
   'https://www.discogs.com/search/?q=Kano+I%27m+Ready&type=release', 22.00);

-- ---------- Relier un compte DJ ----------
-- 1. Supabase > Authentication > Users > Add user (email + mot de passe).
-- 2. Copier l'UUID du compte créé, puis lancer (en remplaçant l'UUID) :
--
--    update public.djs
--       set user_id = '00000000-0000-0000-0000-000000000000'
--     where slug = 'theo-manivel';
