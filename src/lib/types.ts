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
  created_at: string;
};

export type Live = {
  id: string;
  dj_id: string;
  title: string;
  youtube_url: string | null;
  scheduled_at: string | null;
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
};
