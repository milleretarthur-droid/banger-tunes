import type { Metadata } from "next";
import Link from "next/link";
import CreatorGate from "@/components/CreatorGate";

export const metadata: Metadata = {
  title: "Guide : créer ton premier live",
  description: "Le guide pas à pas pour préparer, lancer et terminer un live sur Banger Tunes, de A à Z.",
  // Réservé aux créateurs : jamais indexé, aucun lien dans le menu public.
  robots: { index: false, follow: false },
};

const steps = [
  { id: "avant", label: "Avant de commencer" },
  { id: "compte", label: "Compte et profil" },
  { id: "offre", label: "Choisir une offre" },
  { id: "youtube", label: "Ta chaîne YouTube" },
  { id: "programmer", label: "Programmer le live sur YouTube" },
  { id: "creer", label: "Créer le live ici" },
  { id: "tracklist", label: "Préparer la tracklist" },
  { id: "studio", label: "Tester image et son" },
  { id: "obs", label: "Option : OBS Studio" },
  { id: "jourj", label: "Le jour J" },
  { id: "fin", label: "Terminer et replay" },
  { id: "pannes", label: "Si ça ne marche pas" },
];

export default function GuidePage() {
  return (
    <CreatorGate>
    <div className="guide">
      <h1 className="display">Créer ton premier live</h1>
      <p className="muted lead">
        De la création du compte jusqu&apos;au replay : tout ce qu&apos;il faut faire, dans l&apos;ordre.
        Compte environ 45 minutes la première fois, hors activation de ta chaîne YouTube.
      </p>

      <nav className="panel guide-toc" aria-label="Sommaire">
        <ol>
          {steps.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="avant">
        <h2 className="display">0 · Avant de commencer</h2>
        <p>Il te faut :</p>
        <ul>
          <li>un compte Banger Tunes (gratuit pour créer, ton premier live est offert) ;</li>
          <li>une <strong>chaîne YouTube</strong> avec les diffusions en direct activées (voir étape 3) ;</li>
          <li>ta <strong>table de mixage ou ton contrôleur</strong>, relié à l&apos;ordinateur en USB ou via une interface audio ;</li>
          <li>une <strong>caméra</strong> : webcam, caméra externe en USB, ou un téléphone utilisé comme webcam ;</li>
          <li>une connexion internet stable, idéalement en câble, avec au moins 5 Mbit/s en envoi ;</li>
          <li>les <strong>liens Discogs</strong> des disques que tu vends (annonce ou fiche du disque).</li>
        </ul>
      </section>

      <section id="compte">
        <h2 className="display">1 · Compte et profil</h2>
        <ol>
          <li>Va sur <Link href="/connexion?mode=inscription" className="link">Créer un compte</Link>, saisis ton email et un mot de passe de 8 caractères minimum.</li>
          <li>Ouvre l&apos;email de confirmation et clique sur le lien (regarde dans les spams si besoin).</li>
          <li>Tu arrives dans l&apos;<Link href="/regie" className="link">Espace créateur</Link>. Choisis <em>DJ</em> ou <em>Magasin de vinyles</em>, ton nom, ton style, et le lien de ta boutique Discogs si tu en as une.</li>
        </ol>
      </section>

      <section id="offre">
        <h2 className="display">2 · Choisir une offre</h2>
        <p>
          Ton <strong>premier live est offert</strong>. Ensuite, sur la page <Link href="/tarifs" className="link">Tarifs</Link> :
          5 € par live, 15 € par mois pour 5 lives, ou 171 € par an pour des lives illimités.
          Ton offre et ton solde restent visibles en haut de ton espace créateur.
        </p>
      </section>

      <section id="youtube">
        <h2 className="display">3 · Ta chaîne YouTube</h2>
        <ol>
          <li>Connecte-toi à YouTube avec le compte de ta chaîne.</li>
          <li>Vérifie ta chaîne sur <strong>youtube.com/verify</strong> (un code arrive par SMS ou appel).</li>
          <li>Ouvre <strong>YouTube Studio</strong>, clique sur <em>Créer → Passer en direct</em>. À la première utilisation, YouTube active les diffusions en direct : cela peut prendre <strong>jusqu&apos;à 24 heures</strong>. Fais-le la veille, pas le jour même.</li>
        </ol>
        <p className="notice">
          <strong>Musique et droits.</strong> YouTube analyse automatiquement les lives. Un set composé de morceaux protégés
          peut être coupé, bloqué ou faire l&apos;objet d&apos;une réclamation, même en vinyle. Renseigne-toi sur les règles de YouTube
          avant ton premier live ; tu restes responsable des droits des morceaux que tu diffuses.
        </p>
      </section>

      <section id="programmer">
        <h2 className="display">4 · Programmer le live sur YouTube</h2>
        <ol>
          <li>Dans YouTube Studio : <em>Créer → Passer en direct</em>.</li>
          <li>Choisis <strong>Programmer</strong>, donne un titre, une description et choisis la visibilité (<em>Public</em> ou <em>Non répertorié</em>). Un live non répertorié reste affichable sur Banger Tunes.</li>
          <li>Choisis la date et l&apos;heure, puis enregistre.</li>
          <li><strong>Copie le lien du live</strong> (bouton « Partager », ou l&apos;adresse de la page). Il ressemble à <code>https://www.youtube.com/live/xxxxxxxxxxx</code>. Tu en auras besoin à l&apos;étape suivante.</li>
        </ol>
      </section>

      <section id="creer">
        <h2 className="display">5 · Créer le live sur Banger Tunes</h2>
        <ol>
          <li>Dans <Link href="/regie" className="link">Espace créateur</Link>, section <em>Nouveau live</em>.</li>
          <li>Saisis le titre, colle le lien YouTube (tu peux aussi le faire plus tard) et choisis la date et l&apos;heure avec le sélecteur (raccourcis « Ce soir 21 h », « Samedi 21 h »…).</li>
          <li>Clique sur <strong>Créer le live</strong>. Tu arrives sur la <strong>régie de ce live</strong>, à l&apos;adresse <code>/regie/nom-de-ton-live</code>. Tu la retrouves ensuite en cliquant sur le live dans « Mes lives ».</li>
        </ol>
      </section>

      <section id="tracklist">
        <h2 className="display">6 · Préparer la tracklist</h2>
        <ol>
          <li>Dans la régie, section <em>Tracklist</em> : saisis le titre, l&apos;artiste, le lien Discogs et le prix de chaque disque, dans l&apos;ordre de passage prévu.</li>
          <li>Le lien Discogs doit commencer par <code>https://www.discogs.com/</code>. Le mieux est l&apos;adresse de ton annonce (<code>discogs.com/sell/item/…</code>) : l&apos;acheteur arrive directement sur ton disque.</li>
          <li><strong>Changer l&apos;ordre :</strong> attrape un disque par la poignée <code>⋮⋮</code> et glisse-le, ou utilise les boutons ▲ ▼ (utiles sur téléphone).</li>
          <li>Pendant le live, les disques déjà passés sont verrouillés ; tu peux réorganiser tous ceux qui restent.</li>
        </ol>
      </section>

      <section id="studio">
        <h2 className="display">7 · Tester image et son</h2>
        <ol>
          <li>Dans la régie du live, clique sur <strong>Ouvrir le studio</strong>.</li>
          <li>Choisis ta source d&apos;image (caméra, partage d&apos;écran ou aucune) et ton <strong>entrée audio</strong> : micro de l&apos;ordinateur, micro externe, ou la table de mixage si elle apparaît dans la liste.</li>
          <li>Clique sur <strong>Activer</strong> et autorise le navigateur à utiliser caméra et micro.</li>
          <li>Joue un disque : la barre de niveau doit bouger dans la zone verte, sans toucher le bout. Rouge = le son sature, baisse le volume de sortie de ta table.</li>
          <li>Laisse cochée l&apos;option <em>Son brut pour la musique</em> : sans elle, le navigateur « nettoie » le son comme pour une visioconférence et abîme la musique.</li>
        </ol>
        <p>
          Le studio est un <strong>contrôle local</strong> : rien n&apos;est envoyé ni enregistré. La diffusion se fait ensuite
          par YouTube (méthode A ou B ci-dessous).
        </p>
        <h3>Méthode A · Directement depuis YouTube (la plus simple)</h3>
        <ol>
          <li>Ouvre ton live programmé dans YouTube Studio, choisis <strong>Webcam</strong>.</li>
          <li>Sélectionne la même caméra et la même entrée audio qu&apos;au studio.</li>
          <li>Clique sur <strong>Passer en direct</strong> au moment voulu.</li>
        </ol>
      </section>

      <section id="obs">
        <h2 className="display">8 · Option : OBS Studio</h2>
        <p>À choisir si tu veux plusieurs caméras, des plans différents ou le son direct de ta table. OBS est gratuit (obsproject.com).</p>
        <ol>
          <li>Installe OBS. Dans <em>Sources</em>, ajoute <em>Capture de périphérique vidéo</em> (ta caméra) et <em>Capture d&apos;entrée audio</em> (ta table ou interface). Retire les autres sources audio inutiles pour éviter l&apos;écho.</li>
          <li>Dans YouTube Studio, ouvre ton live programmé en mode <em>Logiciel d&apos;encodage</em> et copie la <strong>clé de stream</strong> (garde-la secrète).</li>
          <li>Dans OBS : <em>Paramètres → Diffusion</em>, service YouTube, colle la clé.</li>
          <li>Dans <em>Paramètres → Sortie</em> : débit vidéo 4 500 kbit/s pour du 720p ou 6 000 kbit/s pour du 1080p, débit audio 160 à 192 kbit/s.</li>
          <li>Clique sur <strong>Démarrer la diffusion</strong>. Vérifie dans YouTube Studio que le flux arrive, puis clique sur <em>Passer en direct</em>.</li>
        </ol>
      </section>

      <section id="jourj">
        <h2 className="display">9 · Le jour J</h2>
        <ol>
          <li><strong>30 minutes avant :</strong> ouvre la régie du live dans un onglet et le studio dans un autre. Teste image et son.</li>
          <li>Vérifie que le lien YouTube est bien branché (champ « Brancher sur mon live » du studio). L&apos;aperçu doit afficher ta vidéo.</li>
          <li>Passe en direct sur YouTube (méthode A ou B).</li>
          <li>Sur Banger Tunes, clique sur <strong>Démarrer le live</strong> : ton live apparaît « En direct » sur l&apos;accueil.</li>
          <li>Pose le premier disque, clique sur <strong>NEXT</strong> : le vinyle s&apos;affiche chez tous les spectateurs avec son lien Discogs. À chaque nouveau disque, clique sur NEXT. <em>Précédent</em> corrige un clic trop rapide.</li>
          <li>Un disque est vendu ? Bascule son bouton sur <strong>Vendu</strong> dans la tracklist : les spectateurs le voient.</li>
        </ol>
      </section>

      <section id="fin">
        <h2 className="display">10 · Terminer et replay</h2>
        <ol>
          <li>Dans la régie, clique sur <strong>Terminer le live</strong> (définitif : un live terminé ne se rouvre pas), puis termine aussi la diffusion sur YouTube.</li>
          <li>Le replay est automatique : la page publique affiche la vidéo et la tracklist complète. Un clic sur un disque lance la vidéo au moment où tu l&apos;as joué.</li>
          <li>Si la vidéo YouTube commence avant ton clic « Démarrer le live », règle le <em>Décalage du replay</em> dans les réglages du live (par exemple 30 secondes).</li>
          <li>Après le live, tu peux continuer à marquer les disques <strong>Vendu</strong> ou <strong>Disponible</strong>.</li>
        </ol>
      </section>

      <section id="pannes">
        <h2 className="display">11 · Si ça ne marche pas</h2>
        <ul>
          <li><strong>« Accès refusé » au studio :</strong> clique sur le cadenas à gauche de l&apos;adresse du site et autorise caméra et micro.</li>
          <li><strong>Appareil déjà utilisé :</strong> ferme OBS, Zoom ou tout autre logiciel qui utilise la caméra.</li>
          <li><strong>La table n&apos;apparaît pas dans les entrées audio :</strong> branche-la avant d&apos;ouvrir le studio, puis recharge la page.</li>
          <li><strong>Le son est faible ou saturé :</strong> règle le volume de sortie de la table, pas celui de l&apos;ordinateur.</li>
          <li><strong>La vidéo n&apos;apparaît pas chez les spectateurs :</strong> vérifie le lien YouTube et que le live est bien « Public » ou « Non répertorié ».</li>
          <li><strong>« Aucun live disponible » :</strong> choisis une offre sur la page <Link href="/tarifs" className="link">Tarifs</Link>.</li>
        </ul>
      </section>
    </div>
    </CreatorGate>
  );
}
