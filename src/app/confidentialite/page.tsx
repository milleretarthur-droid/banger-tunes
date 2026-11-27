import type { Metadata } from "next";
import LegalPage, { V } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function Confidentialite() {
  const mail = LEGAL.contactEmail;
  return (
    <LegalPage title="Politique de confidentialité" updatedAt={LEGAL.updatedAt}>
      <section>
        <h2>Qui est responsable de tes données ?</h2>
        <p>
          Le responsable du traitement est l’éditeur de {LEGAL.siteName}, identifié dans les{" "}
          <a href="/mentions-legales">mentions légales</a> (<V>{LEGAL.publisher.name}</V>). Pour toute question sur tes
          données : <a href={`mailto:${mail}`}>{mail}</a>.
        </p>
        <p>
          Nous ne collectons que ce dont le service a besoin, nous ne vendons pas tes données et nous n’utilisons ni
          publicité ni outil de mesure d’audience.
        </p>
      </section>

      <section>
        <h2>Quelles données, pourquoi, combien de temps ?</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Finalité</th>
                <th>Données</th>
                <th>Base légale</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Compte et connexion</td>
                <td>Email, mot de passe (stocké chiffré), type de profil, date de création</td>
                <td>Exécution du contrat</td>
                <td>Durée du compte, puis suppression (archivage limité si une obligation légale l’impose)</td>
              </tr>
              <tr>
                <td>Profil créateur (public)</td>
                <td>Nom, biographie, genre, ville, adresse du magasin, photo, liens, position sur la carte</td>
                <td>Exécution du contrat (ces informations sont publiques par nature)</td>
                <td>Durée du compte</td>
              </tr>
              <tr>
                <td>Lives et disques</td>
                <td>Titres, listes de disques, prix, images, liens, dates</td>
                <td>Exécution du contrat</td>
                <td>Durée du compte, ou jusqu’à suppression du live par le créateur</td>
              </tr>
              <tr>
                <td>Alertes email sans compte</td>
                <td>Adresse email, créateur suivi, historique des envois</td>
                <td>Consentement (confirmé par un lien envoyé à ton adresse)</td>
                <td>Jusqu’à ta désinscription (lien dans chaque email)</td>
              </tr>
              <tr>
                <td>Suivi de créateurs avec compte</td>
                <td>Créateurs suivis, préférences d’alerte</td>
                <td>Exécution du contrat</td>
                <td>Durée du compte</td>
              </tr>
              <tr>
                <td>Paiement et facturation</td>
                <td>
                  Identifiant client Stripe, offre, statut et dates d’abonnement, crédits de lives. Les numéros de carte sont
                  traités par Stripe et ne passent jamais par nos serveurs.
                </td>
                <td>Exécution du contrat ; obligation légale (comptabilité)</td>
                <td>Pièces comptables : 10 ans</td>
              </tr>
              <tr>
                <td>Emails de service</td>
                <td>Adresse email, contenu du message (confirmation de compte, alertes demandées)</td>
                <td>Exécution du contrat ; consentement pour les alertes</td>
                <td>Selon le prestataire d’envoi (journaux conservés quelques semaines)</td>
              </tr>
              <tr>
                <td>Sécurité et fonctionnement</td>
                <td>Adresse IP, journaux techniques, informations sur l’appareil</td>
                <td>Intérêt légitime (sécurité, prévention des abus)</td>
                <td>Durée courte fixée par nos hébergeurs</td>
              </tr>
              <tr>
                <td>Contact et signalements</td>
                <td>Email, contenu de ton message</td>
                <td>Intérêt légitime ; obligation légale pour les signalements</td>
                <td>Le temps du traitement, puis archivage limité</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Tu n’es jamais obligé de nous donner tes données, mais certaines sont nécessaires pour créer un compte ou recevoir
          des alertes.
        </p>
      </section>

      <section>
        <h2>Cookies et traceurs</h2>
        <ul>
          <li>
            <strong>Préférence de langue</strong> (cookie <code>bt_lang</code>, 12 mois) : mémorise le français ou l’anglais.
          </li>
          <li>
            <strong>Session de connexion</strong> : stockée dans ton navigateur pour te garder connecté.
          </li>
        </ul>
        <p>
          Ces deux éléments sont strictement nécessaires au fonctionnement du site et ne demandent pas de consentement. Nous
          n’utilisons aucun cookie publicitaire ni de mesure d’audience. Si cela change, cette page sera mise à jour et ton
          accord sera demandé quand la loi l’exige.
        </p>
        <h3>Services tiers intégrés</h3>
        <ul>
          <li>
            <strong>YouTube</strong> : les lives sont intégrés avec le mode de confidentialité renforcée de YouTube. Quand le
            lecteur est chargé ou lancé, des informations (adresse IP, appareil) sont transmises à YouTube (Google), qui peut
            utiliser des traceurs selon sa propre politique.
          </li>
          <li>
            <strong>OpenStreetMap</strong> : la carte de la page Explorer charge des fonds de carte depuis les serveurs
            d’OpenStreetMap, qui reçoivent ton adresse IP.
          </li>
        </ul>
      </section>

      <section>
        <h2>Avec qui sont partagées tes données ?</h2>
        <p>Uniquement avec les prestataires qui font fonctionner le service, dans le cadre de contrats :</p>
        <ul>
          <li>Vercel Inc. (États-Unis) : hébergement du site ;</li>
          <li>Supabase, Inc. : base de données, authentification et fichiers (région : <V>{LEGAL.supabaseRegion}</V>) ;</li>
          <li>Stripe Payments Europe, Ltd. (Irlande) : paiements et abonnements ;</li>
          <li>Resend (serveurs en Union européenne) : envoi des emails de service et d’alerte ;</li>
          <li>OVH SAS (France) : nom de domaine et boîte de contact ;</li>
          <li>Google (YouTube) et OpenStreetMap Foundation : voir ci-dessus.</li>
        </ul>
        <p>
          Les informations de ton profil créateur et de tes lives sont publiques, visibles de tous les visiteurs. Nous pouvons
          aussi communiquer des données si une autorité compétente l’exige légalement.
        </p>
        <p>
          Certains prestataires sont situés hors de l’Union européenne, notamment aux États-Unis. Les transferts sont encadrés
          par des garanties prévues par le RGPD (clauses contractuelles types ou cadre de protection des données
          UE-États-Unis).
        </p>
      </section>

      <section>
        <h2>Tes droits</h2>
        <p>
          Tu peux demander l’accès à tes données, leur rectification, leur effacement, la limitation ou l’opposition à leur
          traitement, leur portabilité, et retirer à tout moment un consentement donné (par exemple te désinscrire d’une
          alerte, en un clic depuis chaque email). Tu peux aussi définir des directives sur le sort de tes données après ton
          décès.
        </p>
        <p>
          Pour exercer ces droits ou supprimer ton compte, écris à <a href={`mailto:${mail}`}>{mail}</a> : nous répondons
          dans un délai d’un mois et pouvons te demander de prouver ton identité. Si tu estimes que tes droits ne sont pas
          respectés, tu peux introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr" rel="noopener noreferrer">cnil.fr</a>).
        </p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>
          Nous protégeons tes données par des mesures raisonnables : connexions chiffrées (HTTPS), mots de passe stockés de
          manière chiffrée, accès limités. Aucun système n’étant infaillible, nous te prévenons ainsi que la CNIL en cas de
          violation de données qui présente un risque pour toi.
        </p>
      </section>

      <section>
        <h2>Mineurs</h2>
        <p>
          Le site n’est pas destiné aux enfants de moins de 15 ans. La création d’un compte créateur est réservée aux
          personnes majeures.
        </p>
      </section>

      <section>
        <h2>Modifications</h2>
        <p>
          Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut de la page ; en cas de
          changement important, nous t’en informons.
        </p>
      </section>
    </LegalPage>
  );
}
