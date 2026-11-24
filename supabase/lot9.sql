-- =====================================================================
-- Banger Tunes — lot 9 : mode de vente de chaque disque
--   online     : lien d'achat en ligne (comportement actuel)
--   store      : achat uniquement en magasin (web to store)
--   unreleased : disque inédit, ni lien ni achat possible (pour créer du buzz)
-- À exécuter UNE SEULE FOIS, après les lots précédents.
-- =====================================================================

alter table public.tracklist add column if not exists sale_mode text not null default 'online';
alter table public.tracklist drop constraint if exists tracklist_sale_mode_check;
alter table public.tracklist add constraint tracklist_sale_mode_check
  check (sale_mode in ('online', 'store', 'unreleased'));

-- Un disque « unreleased » n'a ni lien ni prix.
alter table public.tracklist drop constraint if exists tracklist_unreleased_no_sale;
alter table public.tracklist add constraint tracklist_unreleased_no_sale
  check (sale_mode <> 'unreleased' or (discogs_url is null and price is null));

-- Un créateur peut supprimer ses lives (la politique « le DJ gère ses lives » couvre déjà la suppression) :
-- sa tracklist part avec le live ; ses compteurs d'offre ne sont pas modifiés.
