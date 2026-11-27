-- Lot 16 : textes des emails modifiables depuis l'administration.
-- Sans effet de bord : tant qu'aucune ligne n'existe, le site utilise les textes d'origine.

create table if not exists public.email_templates (
  key           text primary key check (key in ('subscribe_confirm', 'live_alert')),
  subject       text not null check (char_length(subject) between 1 and 200),
  subject_multi text check (subject_multi is null or char_length(subject_multi) <= 200),
  body          text not null check (char_length(body) between 1 and 5000),
  button_label  text check (button_label is null or char_length(button_label) <= 60),
  updated_at    timestamptz not null default now()
);

-- Aucune politique = personne ne peut lire/écrire avec la clé publique.
-- Seul le serveur du site (clé service_role) y accède.
alter table public.email_templates enable row level security;
