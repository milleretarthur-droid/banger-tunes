# Banger Tunes

Streaming de DJ en direct (YouTube Live) avec affichage en temps réel du vinyle en cours, en vente sur Discogs.

- **Site** : Next.js, hébergé sur Vercel
- **Base de données, comptes et temps réel** : Supabase
- **Paiements** : Stripe (Checkout + portail client)
- **Fonctionnement** : le créateur (DJ ou magasin de vinyles) prépare sa tracklist, puis clique sur **NEXT** à chaque disque. Les spectateurs voient le changement instantanément.

## Modèle économique

Écouter est gratuit, sans compte. Publier un live est payant, mêmes prix pour DJ et magasins :

| Offre | Prix | Lives |
|---|---|---|
| Au live | 5 € | 1 (achat de 1 à 10) |
| Mensuel | 15 €/mois | 5 par période |
| Annuel | 171 €/an (−5 %) | illimités |

Le **premier live de chaque compte est offert**. Ordre de consommation : annuel > mensuel > live offert > lives achetés.
Les quotas sont appliqués **dans la base** (trigger `consume_live_allowance`), pas seulement dans l'interface.

## Mise en route

### 1. Supabase
SQL Editor, dans cet ordre : `supabase/schema.sql`, `supabase/billing.sql`, `supabase/lot1.sql` (adresses de régie, ordre des disques, vendu, replay), puis `supabase/lot2.sql` (admin, suivis, alertes, carte).

Pour te nommer admin : `insert into public.admins (user_id) select id from auth.users where email = 'TON-EMAIL';` puis ouvre `/admin`.

Variables Vercel du lot 2 : `CRON_SECRET`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (voir `.env.example`). Le cron quotidien (`vercel.json`, 07:00 UTC) envoie les alertes. Étude Discogs : `docs/discogs-api.md`.
Authentication > Sign In / Providers : « Allow new users to sign up » activé, « Confirm email » activé.
Authentication > URL Configuration : Site URL et Redirect URLs = domaine Vercel.

### 2. Stripe
Créer 3 prix en EUR : 5 € paiement unique ; 15 € récurrent mensuel ; 171 € récurrent annuel.
Webhook vers `https://<domaine>/api/stripe/webhook` avec les événements :
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
Configurer le portail client (Settings > Billing > Customer portal).

### 3. Variables d'environnement
Voir `.env.example` (local : `.env.local` ; Vercel : Settings > Environment Variables), puis redéployer.

### 4. Lancer en local
```bash
npm install
npm run dev
```

## Pages

| Adresse | Rôle |
|---|---|
| `/` | Accueil : lives en cours, à venir, terminés |
| `/live/[id]` | Page publique du live : vidéo + vinyle en cours en temps réel |
| `/tarifs` | Offres et achat |
| `/connexion` | Connexion / inscription |
| `/regie` | Espace créateur : profil, offre, liste des lives, création d'un live |
| `/regie/[slug]` | Régie d'un live : tracklist (glisser-déposer), NEXT, vendu, réglages |
| `/regie/[slug]/studio` | Test caméra/micro, branchement du lien YouTube |
| `/guide` | Tuto de A à Z pour créer un live |
| `/api/checkout`, `/api/portal`, `/api/stripe/webhook` | Stripe |

## Sécurité

- Lecture publique ; écriture limitée au propriétaire (RLS). Abonnements et crédits : écriture uniquement par le serveur (webhook).
- Liens en `https` uniquement ; liens de disques sur `discogs.com`.
- La clé `service_role` n'est utilisée que côté serveur.

## Limites connues

- Pas de « mot de passe oublié » ; remboursements/litiges Stripe non gérés automatiquement.
- Un live laissé « en cours » indéfiniment occupe son crédit.
