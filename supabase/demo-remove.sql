-- Supprime toutes les données de test (créateurs « demo- », leurs lives et tracklists).
delete from public.djs where slug like 'demo-%';
