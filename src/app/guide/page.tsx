import type { Metadata } from "next";
import Link from "next/link";
import CreatorGate from "@/components/CreatorGate";
import { getLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Guide: create your first live" : "Guide : créer ton premier live",
    description: en
      ? "The step-by-step guide to prepare, launch and end a live on Banger Tunes."
      : "Le guide pas à pas pour préparer, lancer et terminer un live sur Banger Tunes, de A à Z.",
    // Réservé aux créateurs : jamais indexé, aucun lien dans le menu public.
    robots: { index: false, follow: false },
  };
}

const stepsFr = [
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

function GuideFr() {
  return (
    <div className="guide">
      <h1 className="display">Créer ton premier live</h1>
      <p className="muted lead">
        De la création du compte jusqu&apos;au replay : tout ce qu&apos;il faut faire, dans l&apos;ordre.
        Compte environ 45 minutes la première fois, hors activation de ta chaîne YouTube.
      </p>

      <nav className="panel guide-toc" aria-label="Sommaire">
        <ol>
          {stepsFr.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="avant">
        <h2 className="display">0 · Avant de commencer</h2>
        <p className="notice">
          <strong>Le plus simple :</strong> un micro (celui de l&apos;ordinateur suffit pour commencer) et une webcam. Pas besoin d&apos;OBS :
          le bouton <em>Lancer mon live</em> de ta régie te guide en 4 étapes. OBS reste une option pour améliorer l&apos;image et le son.
        </p>
        <p>Il te faut :</p>
        <ul>
          <li>un compte Banger Tunes (gratuit pour créer, ton premier live est offert) ;</li>
          <li>une <strong>chaîne YouTube</strong> avec les diffusions en direct activées (voir étape 3) ;</li>
          <li>ta <strong>table de mixage ou ton contrôleur</strong>, relié à l&apos;ordinateur en USB ou via une interface audio ;</li>
          <li>une <strong>caméra</strong> : webcam, caméra externe en USB, ou un téléphone utilisé comme webcam ;</li>
          <li>une connexion internet stable, idéalement en câble, avec au moins 5 Mbit/s en envoi ;</li>
          <li>les <strong>liens d&apos;achat</strong> des disques que tu vends (annonce du disque, page de ta boutique en ligne…).</li>
        </ul>
      </section>

      <section id="compte">
        <h2 className="display">1 · Compte et profil</h2>
        <ol>
          <li>Va sur <Link href="/connexion?mode=inscription" className="link">Créer un compte</Link>, saisis ton email et un mot de passe de 8 caractères minimum.</li>
          <li>Ouvre l&apos;email de confirmation et clique sur le lien (regarde dans les spams si besoin).</li>
          <li>Tu arrives dans l&apos;<Link href="/regie" className="link">Espace créateur</Link>. Tes informations (type de compte DJ ou magasin, nom, ville, adresse pour un magasin) ont été demandées à l'inscription ; tu peux les modifier dans <em>Mon profil</em>.</li>
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
          <li>Dans la régie, section <em>Tracklist</em> : saisis le titre, l&apos;artiste, le lien d&apos;achat et le prix de chaque disque, dans l&apos;ordre de passage prévu.</li>
          <li>Le lien d&apos;achat doit commencer par <code>https://</code> et peut mener où tu vends le disque (ta boutique en ligne, une place de marché…). Le mieux est l&apos;adresse de l&apos;annonce du disque : l&apos;acheteur arrive directement dessus.</li>
          <li><strong>Changer l&apos;ordre :</strong> attrape un disque par la poignée <code>⋮⋮</code> et glisse-le, ou utilise les boutons ▲ ▼ (utiles sur téléphone).</li>
          <li>Pendant le live, les disques déjà passés sont verrouillés ; tu peux réorganiser tous ceux qui restent.</li>
        </ol>
      </section>

      <section id="studio">
        <h2 className="display">7 · Tester image et son</h2>
        <ol>
          <li>Dans la régie du live, clique sur <strong>Lancer mon live</strong>.</li>
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
          <li>Pose le premier disque, clique sur <strong>NEXT</strong> : le vinyle s&apos;affiche chez tous les spectateurs avec son lien d&apos;achat (le caddie). À chaque nouveau disque, clique sur NEXT. <em>Précédent</em> corrige un clic trop rapide.</li>
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
  );
}

const stepsEn = [
  { id: "before", label: "Before you start" },
  { id: "account", label: "Account and profile" },
  { id: "plan", label: "Choose a plan" },
  { id: "youtube", label: "Your YouTube channel" },
  { id: "schedule", label: "Schedule the live on YouTube" },
  { id: "create", label: "Create the live here" },
  { id: "tracklist", label: "Prepare the tracklist" },
  { id: "studio", label: "Test picture and sound" },
  { id: "obs", label: "Option: OBS Studio" },
  { id: "dday", label: "On the day" },
  { id: "end", label: "Ending and replay" },
  { id: "trouble", label: "If it doesn't work" },
];

function GuideEn() {
  return (
    <div className="guide">
      <h1 className="display">Create your first live</h1>
      <p className="muted lead">
        From creating your account to the replay: everything to do, in order. Allow about 45 minutes the first time,
        not counting the activation of your YouTube channel.
      </p>

      <nav className="panel guide-toc" aria-label="Contents">
        <ol>
          {stepsEn.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="before">
        <h2 className="display">0 · Before you start</h2>
        <p className="notice">
          <strong>The simplest set-up:</strong> a microphone (your computer&apos;s is fine to begin with) and a webcam. No need for OBS:
          the <em>Start my live</em> button in your control room guides you in 4 steps. OBS remains an option to improve picture and sound.
        </p>
        <p>You will need:</p>
        <ul>
          <li>a Banger Tunes account (free to create, your first live is free);</li>
          <li>a <strong>YouTube channel</strong> with live streaming enabled (see step 3);</li>
          <li>your <strong>mixer or controller</strong>, connected to the computer by USB or through an audio interface;</li>
          <li>a <strong>camera</strong>: webcam, external USB camera, or a phone used as a webcam;</li>
          <li>a stable internet connection, ideally wired, with at least 5 Mbit/s upload;</li>
          <li>the <strong>purchase links</strong> of the records you sell (a record listing, your online shop page…).</li>
        </ul>
      </section>

      <section id="account">
        <h2 className="display">1 · Account and profile</h2>
        <ol>
          <li>Go to <Link href="/connexion?mode=inscription" className="link">Create an account</Link>, enter your email and a password of at least 8 characters.</li>
          <li>Open the confirmation email and click the link (check your spam folder if needed).</li>
          <li>You land in the <Link href="/regie" className="link">Creator space</Link>. Your details (DJ or shop account, name, city, address for a shop) were asked at sign-up; you can edit them under <em>My profile</em>.</li>
        </ol>
      </section>

      <section id="plan">
        <h2 className="display">2 · Choose a plan</h2>
        <p>
          Your <strong>first live is free</strong>. After that, on the <Link href="/tarifs" className="link">Pricing</Link> page:
          €5 per live, €15 per month for 5 lives, or €171 per year for unlimited lives.
          Your plan and balance are always shown at the top of your creator space.
        </p>
      </section>

      <section id="youtube">
        <h2 className="display">3 · Your YouTube channel</h2>
        <ol>
          <li>Sign in to YouTube with your channel&apos;s account.</li>
          <li>Verify your channel at <strong>youtube.com/verify</strong> (a code arrives by text or call).</li>
          <li>Open <strong>YouTube Studio</strong> and click <em>Create → Go live</em>. The first time, YouTube enables live streaming, which can take <strong>up to 24 hours</strong>. Do it the day before, not on the day.</li>
        </ol>
        <p className="notice">
          <strong>Music and rights.</strong> YouTube automatically scans lives. A set made of protected tracks
          may be muted, blocked or claimed, even on vinyl. Read up on YouTube&apos;s rules before your first live;
          you remain responsible for the rights of the tracks you broadcast.
        </p>
      </section>

      <section id="schedule">
        <h2 className="display">4 · Schedule the live on YouTube</h2>
        <ol>
          <li>In YouTube Studio: <em>Create → Go live</em>.</li>
          <li>Choose <strong>Schedule</strong>, give it a title and description and pick the visibility (<em>Public</em> or <em>Unlisted</em>). An unlisted live can still be shown on Banger Tunes.</li>
          <li>Pick the date and time, then save.</li>
          <li><strong>Copy the live&apos;s link</strong> (the “Share” button, or the page address). It looks like <code>https://www.youtube.com/live/xxxxxxxxxxx</code>. You will need it in the next step.</li>
        </ol>
      </section>

      <section id="create">
        <h2 className="display">5 · Create the live on Banger Tunes</h2>
        <ol>
          <li>In the <Link href="/regie" className="link">Creator space</Link>, go to the <em>New live</em> section.</li>
          <li>Enter the title, paste the YouTube link (you can also do it later) and choose the date and time with the picker (shortcuts such as “Tonight 9 pm”, “Saturday 9 pm”…).</li>
          <li>Click <strong>Create the live</strong>. You arrive in the <strong>control room of this live</strong>, at <code>/regie/your-live-name</code>. You can find it again by clicking the live under “My lives”.</li>
        </ol>
      </section>

      <section id="tracklist">
        <h2 className="display">6 · Prepare the tracklist</h2>
        <ol>
          <li>In the control room, <em>Tracklist</em> section: enter the title, artist, purchase link and price of each record, in the planned order.</li>
          <li>The purchase link must start with <code>https://</code> and can lead wherever you sell the record (your online shop, a marketplace…). The best choice is the address of the record&apos;s own listing: the buyer lands straight on it.</li>
          <li><strong>Reorder:</strong> grab a record by the <code>⋮⋮</code> handle and drag it, or use the ▲ ▼ buttons (handy on a phone).</li>
          <li>During the live, records already played are locked; you can reorder all those that remain.</li>
        </ol>
      </section>

      <section id="studio">
        <h2 className="display">7 · Test picture and sound</h2>
        <ol>
          <li>In the live&apos;s control room, click <strong>Start my live</strong>.</li>
          <li>Choose your picture source (camera, screen share or none) and your <strong>audio input</strong>: computer microphone, external microphone, or the mixer if it appears in the list.</li>
          <li>Click <strong>Enable</strong> and allow the browser to use your camera and microphone.</li>
          <li>Play a record: the level bar should move in the green zone without hitting the end. Red = the sound is clipping, lower your mixer&apos;s output volume.</li>
          <li>Leave <em>Raw sound for music</em> ticked: without it, the browser “cleans” the sound as for a video call and damages the music.</li>
        </ol>
        <p>
          The studio is a <strong>local check</strong>: nothing is sent or recorded. Broadcasting then goes through
          YouTube (method A or B below).
        </p>
        <h3>Method A · Straight from YouTube (the simplest)</h3>
        <ol>
          <li>Open your scheduled live in YouTube Studio and choose <strong>Webcam</strong>.</li>
          <li>Select the same camera and audio input as in the studio.</li>
          <li>Click <strong>Go live</strong> when you are ready.</li>
        </ol>
      </section>

      <section id="obs">
        <h2 className="display">8 · Option: OBS Studio</h2>
        <p>Choose this if you want several cameras, different shots or the direct sound from your mixer. OBS is free (obsproject.com).</p>
        <ol>
          <li>Install OBS. Under <em>Sources</em>, add <em>Video Capture Device</em> (your camera) and <em>Audio Input Capture</em> (your mixer or interface). Remove any other unneeded audio sources to avoid echo.</li>
          <li>In YouTube Studio, open your scheduled live in <em>Encoder software</em> mode and copy the <strong>stream key</strong> (keep it secret).</li>
          <li>In OBS: <em>Settings → Stream</em>, YouTube service, paste the key.</li>
          <li>Under <em>Settings → Output</em>: video bitrate 4,500 kbps for 720p or 6,000 kbps for 1080p, audio bitrate 160 to 192 kbps.</li>
          <li>Click <strong>Start Streaming</strong>. Check in YouTube Studio that the feed arrives, then click <em>Go live</em>.</li>
        </ol>
      </section>

      <section id="dday">
        <h2 className="display">9 · On the day</h2>
        <ol>
          <li><strong>30 minutes before:</strong> open the live&apos;s control room in one tab and the studio in another. Test picture and sound.</li>
          <li>Check that the YouTube link is connected (the “Connect to my live” field in the studio). The preview should show your video.</li>
          <li>Go live on YouTube (method A or B).</li>
          <li>On Banger Tunes, click <strong>Start the live</strong>: your live appears as “Live” on the home page.</li>
          <li>Put on the first record and click <strong>NEXT</strong>: the record appears for every viewer with its purchase link (the cart icon). For each new record, click NEXT. <em>Previous</em> fixes a click that came too soon.</li>
          <li>A record has been sold? Switch its button to <strong>Sold</strong> in the tracklist: viewers see it.</li>
        </ol>
      </section>

      <section id="end">
        <h2 className="display">10 · Ending and replay</h2>
        <ol>
          <li>In the control room, click <strong>End the live</strong> (final: an ended live cannot be reopened), then end the broadcast on YouTube too.</li>
          <li>The replay is automatic: the public page shows the video and the full tracklist. Clicking a record starts the video at the moment you played it.</li>
          <li>If the YouTube video starts before you clicked “Start the live”, set the <em>Replay offset</em> in the live&apos;s settings (for example 30 seconds).</li>
          <li>After the live, you can keep marking records <strong>Sold</strong> or <strong>Available</strong>.</li>
        </ol>
      </section>

      <section id="trouble">
        <h2 className="display">11 · If it doesn&apos;t work</h2>
        <ul>
          <li><strong>“Access denied” in the studio:</strong> click the padlock to the left of the site address and allow camera and microphone.</li>
          <li><strong>Device already in use:</strong> close OBS, Zoom or any other software using the camera.</li>
          <li><strong>The mixer doesn&apos;t show up in the audio inputs:</strong> plug it in before opening the studio, then reload the page.</li>
          <li><strong>The sound is weak or clipping:</strong> adjust your mixer&apos;s output volume, not the computer&apos;s.</li>
          <li><strong>The video doesn&apos;t show for viewers:</strong> check the YouTube link and that the live is “Public” or “Unlisted”.</li>
          <li><strong>“No live available”:</strong> choose a plan on the <Link href="/tarifs" className="link">Pricing</Link> page.</li>
        </ul>
      </section>
    </div>
  );
}

export default async function GuidePage() {
  const en = (await getLang()) === "en";
  return <CreatorGate what={en ? "Guide" : "Guide"}>{en ? <GuideEn /> : <GuideFr />}</CreatorGate>;
}
