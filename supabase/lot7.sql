-- =====================================================================
-- Banger Tunes — lot 7 : adresse des magasins
-- À exécuter UNE SEULE FOIS, après schema, billing, lot1 à lot4.
-- =====================================================================

alter table public.djs add column if not exists address text;
alter table public.djs drop constraint if exists djs_address_length;
alter table public.djs add constraint djs_address_length
  check (address is null or char_length(address) <= 200);
