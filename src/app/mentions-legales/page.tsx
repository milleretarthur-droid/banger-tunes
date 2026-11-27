import type { Metadata } from "next";
import LegalPage, { V } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function MentionsLegales() {
  const p = LEGAL.publisher;
  return (
    <LegalPage title="Mentions légales" updatedAt={LEGAL.updatedAt}>
      <section>
        <h2>Éditeur du site</h2>
        <p>Le site {LEGAL.siteName} ({LEGAL.siteUrl}) est édité par :</p>
        <ul>
          <li>Nom / dénomination : <V>{p.name}</V></li>
          <li>Statut : <V>{p.status}</V></li>
          <li>Adresse : <V>{p.address}</V></li>
          <li>Immatriculation : <V>{p.registration}</V></li>
          <li>TVA : <V>{p.vat}</V></li>
          <li>Email : <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></li>
          <li>Téléphone : <V>{p.phone}</V></li>
          <li>Directeur de la publication : <V>{p.director}</V></li>
        </ul>
      </section>

      <section>
        <h2>Hébergement</h2>
        <ul>
          <li>
            Site web : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis ·{" "}
            <a href="https://vercel.com" rel="noopener noreferrer">vercel.com</a>
          </li>
          <li>
            Base de données, authentification et fichiers : Supabase, Inc. · région : <V>{LEGAL.supabaseRegion}</V> ·{" "}
            <a href="https://supabase.com" rel="noopener noreferrer">supabase.com</a>
          </li>
          <li>
            Nom de domaine et messagerie : OVH SAS, 2 rue Kellermann, 59100 Roubaix, France ·{" "}
            <a href="https://www.ovhcloud.com" rel="noopener noreferrer">ovhcloud.com</a>
          </li>
        </ul>
      </section>

      <section>
        <h2>Vidéos et lecteur</h2>
        <p>
          Les lives sont diffusés par les créateurs sur leur propre chaîne YouTube (Google Ireland Limited) et intégrés dans
          ce site. {LEGAL.siteName} ne diffuse ni n’héberge ces vidéos.
        </p>
      </section>

      <section>
        <h2>Signaler un contenu</h2>
        <p>
          Pour signaler un contenu qui te paraît illicite ou qui porte atteinte à tes droits, suis la procédure décrite à
          l’article « Signalement et retrait de contenus » des <a href="/cgu#signalement">conditions générales</a>, ou écris à{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom {LEGAL.siteName}, le logo, la charte graphique et les textes du site sont protégés. Les contenus publiés par
          les créateurs (descriptions, images, listes de disques) restent la propriété de leurs auteurs.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Voir la <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>
    </LegalPage>
  );
}
