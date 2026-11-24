-- =====================================================================
-- Banger Tunes — DONNÉES DE TEST (lives à venir, en direct et passés)
-- À exécuter après lot9.sql. Tout est repérable par le préfixe « demo- »
-- et se supprime d'un coup avec supabase/demo-remove.sql.
-- Les images de couverture viennent du site (dossier public/demo) :
-- elles s'affichent après le déploiement du lot 9 sur Vercel.
-- =====================================================================

-- Créateurs fictifs (sans compte)
insert into public.djs (id, name, slug, kind, bio, genre, city, lat, lng, address) values
  ('d0000000-0000-4000-8000-000000000001', 'Léa Vinyle',        'demo-lea-vinyle',   'dj',    'Disco, boogie et rééditions rares, 100 % vinyle.', 'Disco · Boogie', 'Nantes', 47.2184, -1.5536, null),
  ('d0000000-0000-4000-8000-000000000002', 'Marco Groove',      'demo-marco-groove', 'dj',    'House chaude et sons afro depuis Lyon.',            'House · Afro',  'Lyon',   45.7640,  4.8357, null),
  ('d0000000-0000-4000-8000-000000000003', 'Studio Sillon',     'demo-studio-sillon','dj',    'Techno et ambient, des sets longs et hypnotiques.', 'Techno · Ambient','Bruxelles', 50.8503, 4.3517, null),
  ('d0000000-0000-4000-8000-000000000004', 'Disques du Port',   'demo-disques-du-port','store','Magasin de vinyles d''occasion : soul, jazz, funk.',  'Soul · Jazz · Funk','Nantes', 47.2130, -1.5570, '12 rue des Disques, 44000 Nantes'),
  ('d0000000-0000-4000-8000-000000000005', 'Crate Diggers Paris','demo-crate-diggers','store','Le bac à disques le plus profond de Paris 11e.',   'Hip-hop · Rare groove','Paris', 48.8566, 2.3522, '8 rue de la Roquette, 75011 Paris'),
  ('d0000000-0000-4000-8000-000000000006', 'Radio Cave',        'demo-radio-cave',   'dj',    'Dub, reggae et raretés jamaïcaines.',               'Dub · Reggae',  'Marseille', 43.2965, 5.3698, null)
on conflict (id) do nothing;

-- Lives : 2 en direct, 6 à venir, 8 passés
insert into public.lives (id, dj_id, title, slug, status, scheduled_at, started_at, current_index, cover_url, created_at) values
  -- en direct
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','Disco Friday Session','demo-disco-friday-session','en_cours', now() - interval '40 minutes', now() - interval '40 minutes', 3, 'https://banger-tunes.vercel.app/demo/cover-1.svg', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004','Les trouvailles du jeudi','demo-les-trouvailles-du-jeudi','en_cours', now() - interval '15 minutes', now() - interval '15 minutes', 2, 'https://banger-tunes.vercel.app/demo/cover-3.svg', now() - interval '1 day'),
  -- à venir
  ('e0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000002','Afro House Sunset','demo-afro-house-sunset','a_venir', now() + interval '1 day 3 hours', null, 0, 'https://banger-tunes.vercel.app/demo/cover-2.svg', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000012','d0000000-0000-4000-8000-000000000005','Nouveautés rare groove','demo-nouveautes-rare-groove','a_venir', now() + interval '2 days 5 hours', null, 0, 'https://banger-tunes.vercel.app/demo/cover-4.svg', now() - interval '3 days'),
  ('e0000000-0000-4000-8000-000000000013','d0000000-0000-4000-8000-000000000003','Nuit ambient','demo-nuit-ambient','a_venir', now() + interval '3 days 2 hours', null, 0, 'https://banger-tunes.vercel.app/demo/cover-5.svg', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000014','d0000000-0000-4000-8000-000000000006','Dub Station','demo-dub-station','a_venir', now() + interval '4 days', null, 0, 'https://banger-tunes.vercel.app/demo/cover-6.svg', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000015','d0000000-0000-4000-8000-000000000001','Boogie Brunch','demo-boogie-brunch','a_venir', now() + interval '5 days 15 hours', null, 0, 'https://banger-tunes.vercel.app/demo/cover-7.svg', now() - interval '1 day'),
  ('e0000000-0000-4000-8000-000000000016','d0000000-0000-4000-8000-000000000004','Soul du samedi','demo-soul-du-samedi','a_venir', now() + interval '6 days 12 hours', null, 0, 'https://banger-tunes.vercel.app/demo/cover-8.svg', now() - interval '1 day'),
  -- passés
  ('e0000000-0000-4000-8000-000000000021','d0000000-0000-4000-8000-000000000001','Disco Inferno','demo-disco-inferno','termine', now() - interval '3 days', now() - interval '3 days', 5, 'https://banger-tunes.vercel.app/demo/cover-1.svg', now() - interval '9 days'),
  ('e0000000-0000-4000-8000-000000000022','d0000000-0000-4000-8000-000000000002','Deep House Garden','demo-deep-house-garden','termine', now() - interval '5 days', now() - interval '5 days', 5, 'https://banger-tunes.vercel.app/demo/cover-2.svg', now() - interval '10 days'),
  ('e0000000-0000-4000-8000-000000000023','d0000000-0000-4000-8000-000000000003','Techno Basement','demo-techno-basement','termine', now() - interval '7 days', now() - interval '7 days', 5, 'https://banger-tunes.vercel.app/demo/cover-3.svg', now() - interval '12 days'),
  ('e0000000-0000-4000-8000-000000000024','d0000000-0000-4000-8000-000000000005','Hip-hop Crates Vol. 1','demo-hip-hop-crates-1','termine', now() - interval '8 days', now() - interval '8 days', 5, 'https://banger-tunes.vercel.app/demo/cover-4.svg', now() - interval '13 days'),
  ('e0000000-0000-4000-8000-000000000025','d0000000-0000-4000-8000-000000000006','Roots & Dub','demo-roots-and-dub','termine', now() - interval '10 days', now() - interval '10 days', 5, 'https://banger-tunes.vercel.app/demo/cover-6.svg', now() - interval '14 days'),
  ('e0000000-0000-4000-8000-000000000026','d0000000-0000-4000-8000-000000000004','Jazz du dimanche','demo-jazz-du-dimanche','termine', now() - interval '12 days', now() - interval '12 days', 5, 'https://banger-tunes.vercel.app/demo/cover-5.svg', now() - interval '16 days'),
  ('e0000000-0000-4000-8000-000000000027','d0000000-0000-4000-8000-000000000001','Boogie Nights','demo-boogie-nights','termine', now() - interval '15 days', now() - interval '15 days', 5, 'https://banger-tunes.vercel.app/demo/cover-7.svg', now() - interval '19 days'),
  ('e0000000-0000-4000-8000-000000000028','d0000000-0000-4000-8000-000000000002','Afro Groove Classics','demo-afro-groove-classics','termine', now() - interval '20 days', now() - interval '20 days', 5, 'https://banger-tunes.vercel.app/demo/cover-8.svg', now() - interval '24 days')
on conflict (id) do nothing;

-- Tracklists : 5 disques par live (modes : en ligne, en magasin, unreleased)
with pool(idx, title, artist) as (values
  (0,'Good Times','Chic'), (1,'Supernature','Cerrone'), (2,'Mighty Real','Sylvester'), (3,'A Lover''s Holiday','Change'),
  (4,'I''m Ready','Kano'), (5,'Cantaloupe Island','Herbie Hancock'), (6,'Papa Was a Rolling Stone','The Temptations'), (7,'Watermelon Man','Mongo Santamaria')
)
insert into public.tracklist (live_id, position, title, artist, discogs_url, price, sold, sale_mode, played_at)
select l.id, g.n, p.title, p.artist,
       case when m.mode = 'online' then 'https://www.discogs.com/search/?q=' || replace(p.artist || ' ' || p.title, ' ', '+') || '&type=release' end,
       case when m.mode = 'unreleased' then null else (8 + ((g.n * 7 + p.idx * 3) % 22))::numeric end,
       (m.mode <> 'unreleased' and g.n = 1 and l.status = 'termine'),
       m.mode,
       case when l.status = 'termine' or (l.status = 'en_cours' and g.n <= l.current_index)
            then l.started_at + g.n * interval '9 minutes' end
from public.lives l
join public.djs d on d.id = l.dj_id
cross join generate_series(1, 5) g(n)
join pool p on p.idx = ((abs(hashtext(l.slug)) % 8) + g.n) % 8
cross join lateral (select case
    when d.kind = 'store' and g.n in (2, 4) then 'store'
    when g.n = 5 and abs(hashtext(l.slug)) % 2 = 0 then 'unreleased'
    else 'online' end as mode) m
where l.slug like 'demo-%'
on conflict do nothing;
