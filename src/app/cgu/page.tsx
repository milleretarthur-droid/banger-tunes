import type { Metadata } from "next";
import LegalPage, { V } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";
import { PRICING, eur } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation et de vente",
  alternates: { canonical: "/cgu" },
};

export default function Cgu() {
  const mail = LEGAL.contactEmail;
  return (
    <LegalPage title="Conditions générales d’utilisation et de vente" updatedAt={LEGAL.updatedAt}>
      <section>
        <h2>1. Objet</h2>
        <p>
          {LEGAL.siteName} est un site qui permet d’écouter en direct des DJ et des magasins de vinyles, et de voir en temps
          réel le disque qui joue. Les présentes conditions encadrent l’utilisation du site ({LEGAL.siteUrl}) et la vente des
          offres de publication proposées aux créateurs. L’éditeur du site est identifié dans les{" "}
          <a href="/mentions-legales">mentions légales</a>.
        </p>
        <p>
          <strong>Visiteur</strong> : toute personne qui consulte le site. <strong>Créateur</strong> : toute personne qui crée
          un profil de DJ ou de magasin de vinyles pour publier des lives. <strong>Live</strong> : une session diffusée par un
          créateur sur sa chaîne YouTube et présentée sur le site avec la liste des disques joués.
        </p>
      </section>

      <section>
        <h2>2. Accès au site et compte</h2>
        <p>
          L’écoute des lives est gratuite et ne demande aucun compte. La création d’un profil et la publication de lives sont
          réservées aux créateurs inscrits, majeurs ou ayant la capacité de contracter. Chaque compte ne peut avoir qu’un seul
          profil créateur.
        </p>
        <p>
          Tu t’engages à fournir des informations exactes, à garder ton mot de passe confidentiel et à nous prévenir sans
          délai en cas d’utilisation non autorisée de ton compte. Tu es responsable de ce qui est fait depuis ton compte.
        </p>
      </section>

      <section>
        <h2>3. Rôle de {LEGAL.siteName}</h2>
        <p>
          {LEGAL.siteName} fournit un service technique de présentation : il intègre le live que le créateur diffuse sur
          YouTube, affiche la liste des disques et relie chaque disque à son annonce. {LEGAL.siteName} :
        </p>
        <ul>
          <li>ne diffuse pas lui-même la musique et n’est pas l’auteur des lives ;</li>
          <li>agit comme hébergeur des contenus publiés par les créateurs (fiches, descriptions, images, listes de disques) ;</li>
          <li>
            ne vend pas les disques et n’est pas partie aux ventes conclues entre un créateur et un acheteur, en ligne ou en
            magasin : les liens d’achat mènent vers des sites tiers, et chaque vente relève de la seule responsabilité du
            vendeur.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Engagements des créateurs</h2>
        <p>En publiant un profil, un live ou une annonce, le créateur garantit et s’engage à ce que :</p>
        <ul>
          <li>
            <strong>Droits sur la musique</strong> : il est seul responsable de l’autorisation de diffuser les œuvres et les
            enregistrements qu’il joue. Il diffuse ses lives sur sa chaîne YouTube dans le respect des conditions d’utilisation
            de YouTube et des droits des auteurs, éditeurs, producteurs et artistes-interprètes. {LEGAL.siteName} n’accorde
            aucune licence musicale.
          </li>
          <li>
            <strong>Droits sur les contenus</strong> : il détient les droits sur les textes, photos, pochettes et logos qu’il
            publie, ou en a obtenu l’autorisation.
          </li>
          <li>
            <strong>Exactitude des annonces</strong> : les prix, l’état des disques, leur disponibilité et leur mode de vente
            (en ligne, en magasin, inédit) sont exacts et mis à jour, notamment quand un disque est vendu.
          </li>
          <li>
            <strong>Contenus interdits</strong> : aucun contenu illicite, contrefaisant, trompeur, diffamatoire, haineux,
            violent, pornographique ou portant atteinte à la vie privée d’autrui ; aucun spam ni usage détourné du site.
          </li>
        </ul>
        <p>
          Le créateur garantit {LEGAL.siteName} contre toute réclamation de tiers liée aux contenus qu’il publie et prend en
          charge les frais et indemnités qui en résulteraient, dans les limites permises par la loi.
        </p>
      </section>

      <section id="signalement">
        <h2>5. Signalement et retrait de contenus</h2>
        <p>
          Toute personne qui estime qu’un contenu est illicite ou porte atteinte à ses droits peut le signaler par email à{" "}
          <a href={`mailto:${mail}`}>{mail}</a> en indiquant :
        </p>
        <ul>
          <li>son identité (nom, adresse, email) ;</li>
          <li>l’adresse précise (URL) du contenu concerné et sa description ;</li>
          <li>les raisons pour lesquelles le contenu doit être retiré, avec les justificatifs utiles (par exemple la preuve de ses droits) ;</li>
          <li>l’affirmation que les informations fournies sont exactes et de bonne foi.</li>
        </ul>
        <p>
          Après examen, {LEGAL.siteName} peut retirer ou masquer le contenu, avertir le créateur, et suspendre son profil. Le
          créateur concerné peut présenter ses observations par email. En cas de manquements répétés, le compte peut être
          suspendu ou supprimé. Une notification abusive peut engager la responsabilité de son auteur.
        </p>
      </section>

      <section>
        <h2>6. Offres, prix et paiement</h2>
        <p>La publication de lives est proposée aux créateurs selon les offres suivantes :</p>
        <ul>
          <li>un premier live offert à la création du premier profil créateur ;</li>
          <li>
            <strong>{eur(PRICING.liveCents)} par live</strong> : crédit de publication sans date d’expiration ;
          </li>
          <li>
            <strong>{eur(PRICING.monthlyCents)} par mois</strong> : {PRICING.monthlyLives} lives par période d’abonnement ;
          </li>
          <li>
            <strong>{eur(PRICING.annualCents)} par an</strong> : lives illimités.
          </li>
        </ul>
        <p>
          Les prix sont indiqués en euros. TVA : <V>{LEGAL.publisher.vat}</V>. Le paiement est effectué en ligne par carte
          bancaire via notre prestataire Stripe, qui traite les données de carte : {LEGAL.siteName} n’y a pas accès. Une
          facture ou un reçu est disponible auprès de Stripe. Les écoutes restent gratuites pour les visiteurs.
        </p>
        <p>
          Les abonnements (mensuel et annuel) se renouvellent automatiquement à chaque échéance jusqu’à résiliation. Tu peux
          les résilier à tout moment depuis « Gérer mon abonnement » dans ton espace créateur : la résiliation prend effet à la
          fin de la période en cours, déjà payée. Sauf droit de rétractation ou disposition légale contraire, aucune période
          commencée n’est remboursée.
        </p>
        <p>
          Les prix peuvent évoluer. Pour les abonnés, tout changement s’applique au renouvellement suivant et est annoncé au
          moins 30 jours avant.
        </p>
      </section>

      <section>
        <h2>7. Droit de rétractation</h2>
        <p>
          Si tu agis en tant que consommateur, tu disposes en principe d’un délai de 14 jours à compter de l’achat pour te
          rétracter, sans motif, en écrivant à <a href={`mailto:${mail}`}>{mail}</a>.
        </p>
        <p>
          Les offres étant des services numériques fournis immédiatement, tu demandes expressément, au moment de l’achat, que
          leur exécution commence sans attendre la fin du délai de rétractation. Si tu te rétractes ensuite, tu paies un
          montant proportionnel à ce qui t’a été fourni jusqu’à ta demande. Le droit de rétractation ne s’applique plus
          lorsque le service a été pleinement exécuté (par exemple un crédit de live utilisé) avec ton accord préalable
          exprès, après information sur la perte de ce droit.
        </p>
      </section>

      <section>
        <h2>8. Médiation de la consommation</h2>
        <p>
          En cas de litige avec un consommateur, une réclamation écrite peut d’abord être adressée à{" "}
          <a href={`mailto:${mail}`}>{mail}</a>. À défaut de solution amiable, le consommateur peut recourir gratuitement au
          médiateur de la consommation : <V>{LEGAL.mediator}</V>.
        </p>
      </section>

      <section>
        <h2>9. Disponibilité du service</h2>
        <p>
          Nous faisons au mieux pour que le site soit accessible en continu, sans garantie d’absence d’interruption ou
          d’erreur. Le service dépend de services tiers (YouTube, hébergeur, prestataire de paiement) : leurs pannes ou
          restrictions, y compris une coupure ou un blocage d’un live par YouTube, ne peuvent pas engager notre
          responsabilité.
        </p>
      </section>

      <section>
        <h2>10. Propriété intellectuelle</h2>
        <p>
          Le site, son nom, son logo et ses éléments graphiques appartiennent à l’éditeur. Le créateur reste titulaire des
          contenus qu’il publie et accorde à {LEGAL.siteName} une licence non exclusive, gratuite et mondiale, pour la durée de
          leur présence sur le site, afin de les héberger, de les afficher et de les reproduire dans le cadre du service et de
          sa promotion (par exemple dans les listes, les cartes de partage ou les aperçus de liens).
        </p>
      </section>

      <section>
        <h2>11. Responsabilité</h2>
        <p>
          {LEGAL.siteName} n’est pas responsable des contenus publiés par les créateurs, des transactions entre créateurs et
          acheteurs, de l’exactitude des annonces, ni du contenu des sites tiers vers lesquels le site renvoie. Dans la mesure
          permise par la loi, et sauf faute lourde ou dolosive, notre responsabilité est limitée aux dommages directs et, pour
          un créateur professionnel, au montant payé au cours des 12 derniers mois. Les droits légaux des consommateurs ne sont
          pas affectés.
        </p>
      </section>

      <section>
        <h2>12. Suspension et suppression de compte</h2>
        <p>
          En cas de manquement aux présentes conditions, nous pouvons masquer des contenus, suspendre un profil ou supprimer
          un compte, avec explication par email sauf impératif légal. Tu peux demander la suppression de ton compte à tout
          moment à <a href={`mailto:${mail}`}>{mail}</a> ; pense à résilier d’abord ton abonnement éventuel.
        </p>
      </section>

      <section>
        <h2>13. Données personnelles</h2>
        <p>
          Le traitement de tes données est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>14. Modification des conditions</h2>
        <p>
          Nous pouvons modifier ces conditions, notamment pour suivre l’évolution du service ou de la loi. La date de dernière
          mise à jour figure en haut de la page. Les créateurs inscrits sont informés des changements importants ; la
          poursuite de l’utilisation du site vaut acceptation de la version en vigueur.
        </p>
      </section>

      <section>
        <h2>15. Droit applicable et litiges</h2>
        <p>
          Les présentes conditions sont soumises au droit français. Un consommateur peut saisir le tribunal de son domicile.
          Pour tout litige avec un professionnel, les tribunaux de <V>{LEGAL.jurisdiction}</V> sont compétents.
        </p>
      </section>
    </LegalPage>
  );
}
