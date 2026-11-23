# Live Banger

Streaming de DJ en direct (YouTube Live) avec affichage en temps réel du vinyle en cours, en vente sur Discogs.

- **Site** : Next.js, hébergé sur Vercel
- **Base de données, login DJ et temps réel** : Supabase
- **Fonctionnement** : le DJ prépare sa tracklist à l'avance, puis clique sur **NEXT** à chaque disque. Les spectateurs voient le changement instantanément.

## Mise en route

### 1. Supabase

1. Ouvrir le projet Supabase, puis **SQL Editor > New query**.
2. Coller le contenu de `supabase/schema.sql` et cliquer **Run**. Cela crée les tables, les droits d'accès, le temps réel et quelques données d'exemple.
3. Récupérer l'URL et la clé `anon public` dans **Project Settings > API**.

### 2. Variables d'environnement

En local, copier `.env.example` vers `.env.local` et renseigner les deux valeurs.

Sur Vercel : **Project > Settings > Environment Variables**, ajouter les mêmes deux variables (`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`), puis redéployer.

### 3. Créer un compte DJ

Les comptes sont créés à la main (pas d'inscription libre).

1. Supabase > **Authentication > Users > Add user** : email + mot de passe.
2. Copier l'UUID du compte, puis dans le SQL Editor :

```sql
update public.djs
   set user_id = 'UUID-DU-COMPTE'
 where slug = 'theo-manivel';
```

Le DJ se connecte ensuite sur `/regie`.

### 4. Lancer en local

```bash
npm install
npm run dev
```

## Pages

| Adresse | Rôle |
|---|---|
| `/` | Accueil : live en cours, lives à venir et terminés |
| `/live/[id]` | Page publique du live : vidéo + vinyle en cours en temps réel |
| `/regie` | Espace DJ : créer un live, préparer la tracklist, bouton NEXT |

## Sécurité

- La lecture est publique ; l'écriture est limitée au DJ propriétaire par les règles RLS de Supabase.
- Les liens saisis par les DJ ne sont affichés que s'ils sont en `https` ; les liens de disques doivent pointer vers `discogs.com`.

## À venir

- Accès payant pour les DJ (Stripe), gratuit pour les premiers lives
- Pages profil DJ
