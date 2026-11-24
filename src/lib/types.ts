export type LiveStatus = "a_venir" | "en_cours" | "termine";

export type Dj = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  /** Type de profil : DJ ou magasin de vinyles (mêmes tarifs). */
  kind: "dj" | "store";
  bio: string | null;
  genre: string | null;
  discogs_url: string | null;
  instagram_url: string | null;
  photo_url: string | null;
  access_status: "gratuit" | "payant";
  /** Compte suspendu par l'administration : profil et lives masqués. */
  suspended: boolean;
  city: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type Live = {
  id: string;
  dj_id: string;
  title: string;
  youtube_url: string | null;
  /** Image de présentation du live (https), affichée sur les cartes. */
  cover_url: string | null;
  scheduled_at: string | null;
  /** Adresse lisible de la régie : /regie/<slug>. */
  slug: string;
  /** Heure réelle du démarrage (sert à caler le replay). */
  started_at: string | null;
  /** Décalage en secondes entre le démarrage et le début de la vidéo. */
  replay_offset: number;
  status: LiveStatus;
  /** Position du disque en cours (0 = aucun disque lancé). */
  current_index: number;
  created_at: string;
};

export type LiveWithDj = Live & { dj: Dj | null };

export type Track = {
  id: string;
  live_id: string;
  position: number;
  title: string;
  artist: string;
  discogs_url: string | null;
  price: number | null;
  cover_url: string | null;
  /** Heure à laquelle le DJ a lancé ce disque (null = pas encore passé). */
  played_at: string | null;
  /** Le DJ indique que le disque est vendu. */
  sold: boolean;
};
