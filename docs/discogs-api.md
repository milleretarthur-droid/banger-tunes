# Étude : brancher Banger Tunes sur l'API Discogs

État au 23/11/2026. Sources : conditions d'utilisation de l'API Discogs (support.discogs.com, article 360009334593) et documentation tierce de l'API (apis.io). La page développeurs de Discogs n'a pas pu être consultée directement : les chiffres sont à confirmer sur https://www.discogs.com/developers.

## Ce que l'API permet

| Besoin | Endpoint | Remarque |
|---|---|---|
| Lire une annonce (prix, état, statut) | `GET /marketplace/listings/{id}` | Authentification requise |
| Lister l'inventaire d'un vendeur | `GET /users/{pseudo}/inventory` | Seules les annonces « For Sale » sont visibles pour un tiers |
| Fiche d'un disque (titre, artistes, label) | `GET /releases/{id}` | |
| Prix le plus bas, nombre de copies | `GET /releases/{id}/stats` | |
| Recherche | `GET /database/search` | Authentifiée |

Authentification : jeton personnel, clé + secret, ou OAuth 1.0a (pour agir au nom d'un vendeur).
Limites : 60 requêtes/minute authentifié, 25 sans compte. Un `User-Agent` descriptif est obligatoire. Les images exigent des requêtes signées OAuth (environ 1 000/jour).

## Ce que cela apporterait

1. **Saisie automatique** : le DJ colle le lien de son annonce, le titre, l'artiste et le prix se remplissent seuls.
2. **« Vendu » automatique** : une annonce qui n'est plus « For Sale » est marquée vendue sans action du DJ.
3. **Importer l'inventaire d'un magasin** pour préparer une tracklist en quelques clics.

## Contraintes des conditions d'utilisation (à lire avant de coder)

- **Facturation** : charger un tarif pour accéder à une partie d'une application qui utilise l'API exige l'**autorisation écrite de Discogs**. Banger Tunes est payant pour les créateurs : il faut demander cette autorisation (api@discogs.com) **avant** d'intégrer l'API.
- **Fraîcheur** : il est interdit d'afficher des données vieilles de plus de 6 heures ; il ne faut pas les conserver plus que nécessaire.
- **Images** : ce sont des données restreintes (usage limité, pas de transfert à un tiers). Les pochettes ne doivent pas être recopiées dans notre base.
- **Mentions obligatoires** : « This application uses Discogs' API but is not affiliated with, sponsored or endorsed by Discogs. » sur le site, et « Data provided by Discogs. » à côté des données, avec un lien vers la page Discogs, sans `nofollow`.
- Discogs se réserve le droit de rendre l'accès payant plus tard.

## Recommandation

Rester sur les **liens manuels** pour le lancement (aucune dépendance, aucune contrainte légale). Écrire à Discogs pour obtenir l'accord sur le modèle payant. En cas d'accord, commencer par la saisie automatique à partir de l'URL d'annonce, avec un jeton côté serveur, sans stocker les données au-delà de 6 h et sans pochette.
