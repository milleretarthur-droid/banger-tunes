"use client";

import { use, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Live } from "@/lib/types";
import LiveControl from "../../LiveControl";
import { useOwnedLive } from "../../useOwnedLive";
import { useT } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };
type VideoSource = "camera" | "screen" | "none";
type Devices = { cams: MediaDeviceInfo[]; mics: MediaDeviceInfo[] };

export default function StudioPage({ params }: Props) {
  const { slug } = use(params);
  const tt = useT();
  const { session, ready, live, setLive, state } = useOwnedLive(slug);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const [devices, setDevices] = useState<Devices>({ cams: [], mics: [] });
  const [camId, setCamId] = useState("");
  const [micId, setMicId] = useState("");
  const [source, setSource] = useState<VideoSource>("camera");
  const [rawAudio, setRawAudio] = useState(true);
  const [stereo, setStereo] = useState(true);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState({ rms: 0, peak: 0 });
  const [ytMsg, setYtMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tested, setTested] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (active) setTested(true);
  }, [active]);

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setLevel({ rms: 0, peak: 0 });
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cams: all.filter((d) => d.kind === "videoinput"),
      mics: all.filter((d) => d.kind === "audioinput"),
    });
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  function startMeter(stream: MediaStream) {
    if (stream.getAudioTracks().length === 0) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let peakHold = 0;
    let last = 0;
    const tick = (ts: number) => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      let peak = 0;
      for (const v of buf) {
        sum += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      peakHold = Math.max(peak, peakHold * 0.95);
      if (ts - last > 66) {
        last = ts;
        setLevel({ rms: Math.sqrt(sum / buf.length), peak: peakHold });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start(opts?: { cam?: string; mic?: string; src?: VideoSource }) {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(tt("Ton navigateur ne permet pas l'accès à la caméra et au micro (utilise Chrome, Edge ou Firefox récent, en https).", "Your browser does not allow access to the camera and microphone (use a recent Chrome, Edge or Firefox, over https)."));
      return;
    }
    stopAll();
    const src = opts?.src ?? source;
    const cam = opts?.cam ?? camId;
    const mic = opts?.mic ?? micId;

    try {
      const audio: MediaTrackConstraints = {
        echoCancellation: !rawAudio,
        noiseSuppression: !rawAudio,
        autoGainControl: !rawAudio,
        ...(stereo ? { channelCount: { ideal: 2 } } : {}),
        ...(mic ? { deviceId: { exact: mic } } : {}),
      };
      const mediaStream = new MediaStream();

      const mic$ = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      mic$.getAudioTracks().forEach((t) => mediaStream.addTrack(t));

      if (src === "camera") {
        const cam$ = await navigator.mediaDevices.getUserMedia({
          video: { ...(cam ? { deviceId: { exact: cam } } : {}), width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        cam$.getVideoTracks().forEach((t) => mediaStream.addTrack(t));
      } else if (src === "screen") {
        const scr = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        scr.getVideoTracks().forEach((t) => {
          t.addEventListener("ended", stopAll);
          mediaStream.addTrack(t);
        });
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        void videoRef.current.play().catch(() => {});
      }
      startMeter(mediaStream);
      setActive(true);
      await refreshDevices(); // les noms des appareils ne sont visibles qu'après l'autorisation

      const usedMic = mediaStream.getAudioTracks()[0]?.getSettings().deviceId;
      if (usedMic && !mic) setMicId(usedMic);
      const usedCam = mediaStream.getVideoTracks()[0]?.getSettings().deviceId;
      if (usedCam && src === "camera" && !cam) setCamId(usedCam);
    } catch (e) {
      stopAll();
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError") {
        setError(tt("Accès refusé. Clique sur l'icône caméra/cadenas à gauche de la barre d'adresse et autorise la caméra et le micro, puis relance.", "Access denied. Click the camera/padlock icon to the left of the address bar, allow the camera and microphone, then restart."));
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError(tt("Appareil introuvable. Vérifie que la caméra ou l'interface audio est branchée, puis relance.", "Device not found. Check that the camera or audio interface is plugged in, then restart."));
      } else if (name === "NotReadableError") {
        setError(tt("Cet appareil est déjà utilisé par une autre application (OBS, Zoom…). Ferme-la puis relance.", "This device is already in use by another application (OBS, Zoom…). Close it, then restart."));
      } else {
        setError(`${tt("Impossible de démarrer", "Could not start")} : ${e instanceof Error ? e.message : tt("erreur inconnue", "unknown error")}`);
      }
    }
  }

  async function saveYoutubeUrl(raw: string) {
    setYtMsg(null);
    const sb = getSupabase();
    if (!sb || !live) return;
    const url = raw.trim();
    if (url && !youtubeEmbedUrl(url)) {
      setYtMsg({ ok: false, text: tt("Lien non reconnu. Copie l'adresse depuis YouTube (youtube.com/watch…, youtube.com/live/… ou youtu.be/…).", "Link not recognised. Copy the address from YouTube (youtube.com/watch…, youtube.com/live/… or youtu.be/…).") });
      return;
    }
    const { data, error: err } = await sb.from("lives").update({ youtube_url: url || null }).eq("id", live.id).select().single();
    if (err) return setYtMsg({ ok: false, text: `Enregistrement impossible : ${err.message}` });
    setLive(data as Live);
    setYtMsg({ ok: true, text: url ? tt("Lien enregistré : les spectateurs verront ta vidéo sur la page du live.", "Link saved: viewers will see your video on the live page.") : tt("Lien retiré.", "Link removed.") });
  }

  function saveYoutube(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void saveYoutubeUrl(String(new FormData(e.currentTarget).get("youtube_url") ?? ""));
  }

  async function pasteYoutube() {
    try {
      const text = await navigator.clipboard.readText();
      const input = document.getElementById("yt") as HTMLInputElement | null;
      if (input) input.value = text.trim();
      await saveYoutubeUrl(text);
    } catch {
      setYtMsg({ ok: false, text: tt("Le navigateur n'a pas autorisé l'accès au presse-papiers : colle le lien dans le champ (Ctrl+V ou ⌘+V).", "The browser did not allow clipboard access: paste the link into the field (Ctrl+V or ⌘+V).") });
    }
  }

  if (!isSupabaseConfigured) return <div className="regie muted">{tt("Supabase n'est pas connecté.", "Supabase is not connected.")}</div>;
  if (!ready) return <div className="regie muted">{tt("Chargement…", "Loading…")}</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Studio</h1>
        <Link href={`/connexion?next=/regie/${slug}/studio`} className="btn">{tt("Se connecter", "Log in")}</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">{tt("Chargement…", "Loading…")}</div>;
  if (state !== "ok" || !live) {
    return (
      <div className="regie">
        <h1 className="display">{tt("Live introuvable", "Live not found")}</h1>
        <Link href="/regie" className="btn-ghost">← {tt("Mes lives", "My lives")}</Link>
      </div>
    );
  }

  const db = level.rms > 0 ? 20 * Math.log10(level.rms) : -100;
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  const peakPct = Math.max(0, Math.min(100, ((20 * Math.log10(level.peak || 1e-5) + 60) / 60) * 100));
  const clipping = level.peak > 0.98;
  const tooLow = active && db < -45;
  const embed = youtubeEmbedUrl(live.youtube_url);

  return (
    <div className="regie">
      <Link href={`/regie/${live.slug}`} className="link">← {tt("Régie de", "Control room of")} « {live.title} »</Link>
      <h1 className="display" style={{ marginTop: 12 }}>{tt("Lancer mon live", "Start my live")}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {tt("Un micro et une webcam suffisent : pas besoin de logiciel. Suis les 4 étapes ci-dessous.", "A microphone and a webcam are enough: no software needed. Follow the 4 steps below.")}
      </p>

      <ol className="launch-steps" aria-label={tt("Progression", "Progress")}>
        <li className={tested ? "is-done" : ""}><a href="#etape-1">{tt("1 · Tester micro et caméra", "1 · Test microphone and camera")}</a></li>
        <li className={opened || live.status === "en_cours" ? "is-done" : ""}><a href="#etape-2">{tt("2 · Passer en direct sur YouTube", "2 · Go live on YouTube")}</a></li>
        <li className={live.youtube_url ? "is-done" : ""}><a href="#etape-3">{tt("3 · Coller le lien", "3 · Paste the link")}</a></li>
        <li className={live.status === "en_cours" ? "is-done" : ""}><a href="#etape-4">{tt("4 · Lancer sur Banger Tunes", "4 · Start on Banger Tunes")}</a></li>
      </ol>

      <p className="notice">
        <strong>{tt("Première fois ?", "First time?")}</strong> {tt("YouTube doit activer les directs sur ta chaîne, ce qui peut prendre jusqu'à 24 h : fais-le dès aujourd'hui", "YouTube has to enable live streaming on your channel, which can take up to 24 hours: do it today")}
        (<a href="https://www.youtube.com/verify" target="_blank" rel="noopener noreferrer" className="link">{tt("vérifier ma chaîne", "verify my channel")} ↗</a>, {tt("puis dans YouTube Studio", "then in YouTube Studio")} : <em>{tt("Créer → Passer en direct", "Create → Go live")}</em>).
      </p>

      <h2 className="display" id="etape-1">{tt("1 · Teste ton micro et ta caméra", "1 · Test your microphone and camera")}</h2>

      <div className="studio-grid">
        <div className="panel">
          <div className="studio-video">
            <video ref={videoRef} muted playsInline autoPlay />
            {!active && <div className="studio-placeholder">{tt("Aperçu de ta caméra", "Your camera preview")}</div>}
          </div>
          <div className="meter" role="img" aria-label={`${tt("Niveau du micro", "Microphone level")} : ${Math.round(db)} dB`}>
            <div className={`meter-bar${clipping ? " is-clip" : ""}`} style={{ width: `${pct}%` }} />
            <div className="meter-peak" style={{ left: `${peakPct}%` }} />
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {!active && tt("Clique sur « Activer » pour voir le niveau du son.", "Click “Enable” to see the sound level.")}
            {active && clipping && tt("Le son sature : baisse le gain de ta table ou de l'interface.", "The sound is clipping: lower the gain on your mixer or interface.")}
            {active && !clipping && tooLow && tt("Signal très faible : monte le volume de sortie de ta table, ou vérifie le choix du micro.", "Very weak signal: raise your mixer's output volume, or check the microphone selection.")}
            {active && !clipping && !tooLow && tt("Niveau correct. Vise la zone verte, sans toucher le bout de la barre.", "Level is fine. Aim for the green zone, without hitting the end of the bar.")}
          </p>
        </div>

        <div className="panel">
          <div className="field">
            <label htmlFor="src">{tt("Image", "Picture")}</label>
            <select id="src" value={source} onChange={(e) => { const v = e.target.value as VideoSource; setSource(v); if (active) void start({ src: v }); }}>
              <option value="camera">{tt("Caméra (webcam ou caméra externe)", "Camera (webcam or external camera)")}</option>
              <option value="screen">{tt("Partage d'écran (ex. logiciel DJ)", "Screen share (e.g. DJ software)")}</option>
              <option value="none">{tt("Aucune image (son seul)", "No picture (sound only)")}</option>
            </select>
          </div>
          {source === "camera" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="cam">{tt("Caméra", "Camera")}</label>
              <select id="cam" value={camId} onChange={(e) => { setCamId(e.target.value); if (active) void start({ cam: e.target.value }); }}>
                <option value="">{tt("Par défaut", "Default")}</option>
                {devices.cams.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>{d.label || `${tt("Caméra", "Camera")} ${i + 1}`}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="mic">{tt("Entrée audio", "Audio input")}</label>
            <select id="mic" value={micId} onChange={(e) => { setMicId(e.target.value); if (active) void start({ mic: e.target.value }); }}>
              <option value="">{tt("Par défaut (micro de l'ordinateur)", "Default (computer microphone)")}</option>
              {devices.mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `${tt("Entrée", "Input")} ${i + 1}`}</option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={rawAudio} onChange={(e) => setRawAudio(e.target.checked)} />
            {tt("Son brut pour la musique (sans réduction de bruit ni égalisation automatique)", "Raw sound for music (no noise reduction or automatic equalisation)")}
          </label>
          <label className="check">
            <input type="checkbox" checked={stereo} onChange={(e) => setStereo(e.target.checked)} />
            {tt("Demander le stéréo", "Request stereo")}
          </label>
          <div className="control-meta" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => void start()}>{active ? tt("Relancer avec ces réglages", "Restart with these settings") : tt("Activer", "Enable")}</button>
            {active && <button className="btn-ghost" onClick={stopAll}>{tt("Arrêter", "Stop")}</button>}
          </div>
          {error && <p className="error">{error}</p>}
          <p className="hint" style={{ marginTop: 12 }}>
            {tt("Pour envoyer le son de ta table de mixage, branche-la en USB ou via une interface audio : elle apparaît alors dans « Entrée audio ». Le micro de l'ordinateur ne capte que le bruit de la pièce.", "To send the sound of your mixer, connect it by USB or through an audio interface: it will then appear under “Audio input”. The computer's microphone only picks up the sound of the room.")}
          </p>
        </div>
      </div>

      <h2 className="display" id="etape-2">{tt("2 · Passe en direct sur YouTube", "2 · Go live on YouTube")}</h2>
      <div className="panel">
        <ol className="steps-short">
          <li>{tt("Clique sur le bouton ci-dessous : YouTube Studio s'ouvre dans un nouvel onglet.", "Click the button below: YouTube Studio opens in a new tab.")}</li>
          <li>{tt("Clique sur", "Click")} <strong>{tt("Créer → Passer en direct → Webcam", "Create → Go live → Webcam")}</strong>.</li>
          <li>{tt("Choisis la", "Choose the")} <strong>{tt("même caméra et le même micro", "same camera and microphone")}</strong> {tt("que ci-dessus, un titre, et la visibilité", "as above, a title, and the visibility")} <em>Public</em> {tt("ou", "or")} <em>{tt("Non répertorié", "Unlisted")}</em>.</li>
          <li>{tt("Clique sur", "Click")} <strong>{tt("Passer en direct", "Go live")}</strong> {tt("quand tu es prêt.", "when you are ready.")}</li>
        </ol>
        <div className="control-meta" style={{ marginTop: 14 }}>
          <a className="btn" href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>
            {tt("Ouvrir YouTube Studio", "Open YouTube Studio")} ↗
          </a>
        </div>
        <details className="advanced">
          <summary>{tt("Pour aller plus loin : OBS (plusieurs caméras, son direct de ta table)", "Going further: OBS (several cameras, direct sound from your mixer)")}</summary>
          <p>
            {tt("Avec OBS Studio, tu ajoutes tes sources, tu colles la clé de diffusion de YouTube dans Paramètres → Diffusion, puis « Démarrer la diffusion ». L'image et le son sont meilleurs, mais l'installation demande plus de réglages.", "With OBS Studio, you add your sources, paste YouTube's stream key in Settings → Stream, then “Start Streaming”. Picture and sound are better, but set-up takes more tweaking.")}
          </p>
          <Link className="btn-ghost" href="/guide#obs">{tt("Voir le tuto OBS", "See the OBS tutorial")} →</Link>
        </details>
      </div>

      <h2 className="display" id="etape-3">{tt("3 · Colle le lien de ton live", "3 · Paste your live's link")}</h2>
      <div className="panel">
        <p style={{ marginBottom: 12 }}>
          {tt("Dans YouTube, copie l'adresse de ton live (bouton Partager ou barre d'adresse), puis clique sur le bouton « Coller le lien ».", "In YouTube, copy your live's address (the Share button or the address bar), then click the “Paste the link” button.")}
        </p>
        <form className="form-grid" onSubmit={saveYoutube}>
          <div className="field field-wide">
            <label htmlFor="yt">{tt("Lien de ton live YouTube", "Your YouTube live link")}</label>
            <input id="yt" name="youtube_url" type="url" defaultValue={live.youtube_url ?? ""} placeholder="https://www.youtube.com/live/…" onPaste={(e) => { const pasted = e.clipboardData.getData("text"); if (pasted) setTimeout(() => void saveYoutubeUrl(pasted), 0); }} />
          </div>
          <div className="control-meta">
            <button className="btn" type="button" onClick={() => void pasteYoutube()}>{tt("Coller le lien", "Paste the link")}</button>
            <button className="btn-ghost" type="submit">{tt("Enregistrer", "Save")}</button>
          </div>
        </form>
        {ytMsg && <p className={ytMsg.ok ? "info" : "error"}>{ytMsg.text}</p>}
        {embed && (
          <div className="player" style={{ marginTop: 16, maxWidth: 560 }}>
            <iframe src={embed} title={tt("Aperçu côté spectateur", "Viewer's preview")} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        )}
      </div>

      <h2 className="display" id="etape-4">{tt("4 · Lance sur Banger Tunes et enchaîne les disques", "4 · Start on Banger Tunes and run through the records")}</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        {tt("Quand tu es en direct sur YouTube, clique sur « Démarrer » ci-dessous : le public voit alors ton live et chaque disque que tu passes.", "Once you are live on YouTube, click “Start” below: the audience then sees your live and every record you play.")}
      </p>
      <LiveControl live={live} onLiveChange={setLive} compact />
    </div>
  );
}
