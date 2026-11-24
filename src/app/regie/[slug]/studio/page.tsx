"use client";

import { use, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Live } from "@/lib/types";
import LiveControl from "../../LiveControl";
import { useOwnedLive } from "../../useOwnedLive";

type Props = { params: Promise<{ slug: string }> };
type VideoSource = "camera" | "screen" | "none";
type Devices = { cams: MediaDeviceInfo[]; mics: MediaDeviceInfo[] };

export default function StudioPage({ params }: Props) {
  const { slug } = use(params);
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
      setError("Ton navigateur ne permet pas l'accès à la caméra et au micro (utilise Chrome, Edge ou Firefox récent, en https).");
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
        setError("Accès refusé. Clique sur l'icône caméra/cadenas à gauche de la barre d'adresse et autorise la caméra et le micro, puis relance.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("Appareil introuvable. Vérifie que la caméra ou l'interface audio est branchée, puis relance.");
      } else if (name === "NotReadableError") {
        setError("Cet appareil est déjà utilisé par une autre application (OBS, Zoom…). Ferme-la puis relance.");
      } else {
        setError(`Impossible de démarrer : ${e instanceof Error ? e.message : "erreur inconnue"}`);
      }
    }
  }

  async function saveYoutube(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setYtMsg(null);
    const sb = getSupabase();
    if (!sb || !live) return;
    const url = String(new FormData(e.currentTarget).get("youtube_url") ?? "").trim();
    if (url && !youtubeEmbedUrl(url)) {
      setYtMsg({ ok: false, text: "Lien non reconnu. Copie l'adresse depuis YouTube (youtube.com/watch…, youtube.com/live/… ou youtu.be/…)." });
      return;
    }
    const { data, error: err } = await sb.from("lives").update({ youtube_url: url || null }).eq("id", live.id).select().single();
    if (err) return setYtMsg({ ok: false, text: `Enregistrement impossible : ${err.message}` });
    setLive(data as Live);
    setYtMsg({ ok: true, text: url ? "Lien enregistré : les spectateurs verront ta vidéo sur la page du live." : "Lien retiré." });
  }

  if (!isSupabaseConfigured) return <div className="regie muted">Supabase n&apos;est pas connecté.</div>;
  if (!ready) return <div className="regie muted">Chargement…</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Studio</h1>
        <Link href={`/connexion?next=/regie/${slug}/studio`} className="btn">Se connecter</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">Chargement…</div>;
  if (state !== "ok" || !live) {
    return (
      <div className="regie">
        <h1 className="display">Live introuvable</h1>
        <Link href="/regie" className="btn-ghost">← Mes lives</Link>
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
      <Link href={`/regie/${live.slug}`} className="link">← Régie de « {live.title} »</Link>
      <h1 className="display" style={{ marginTop: 12 }}>Studio</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Teste ta caméra et ton son avant de lancer le live. Rien n&apos;est envoyé ni enregistré ici : c&apos;est un contrôle local.
      </p>

      <div className="studio-grid">
        <div className="panel">
          <div className="studio-video">
            <video ref={videoRef} muted playsInline autoPlay />
            {!active && <div className="studio-placeholder">Aperçu de ta caméra</div>}
          </div>
          <div className="meter" role="img" aria-label={`Niveau du micro : ${Math.round(db)} dB`}>
            <div className={`meter-bar${clipping ? " is-clip" : ""}`} style={{ width: `${pct}%` }} />
            <div className="meter-peak" style={{ left: `${peakPct}%` }} />
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            {!active && "Clique sur « Activer » pour voir le niveau du son."}
            {active && clipping && "Le son sature : baisse le gain de ta table ou de l'interface."}
            {active && !clipping && tooLow && "Signal très faible : monte le volume de sortie de ta table, ou vérifie le choix du micro."}
            {active && !clipping && !tooLow && "Niveau correct. Vise la zone verte, sans toucher le bout de la barre."}
          </p>
        </div>

        <div className="panel">
          <div className="field">
            <label htmlFor="src">Image</label>
            <select id="src" value={source} onChange={(e) => { const v = e.target.value as VideoSource; setSource(v); if (active) void start({ src: v }); }}>
              <option value="camera">Caméra (webcam ou caméra externe)</option>
              <option value="screen">Partage d&apos;écran (ex. logiciel DJ)</option>
              <option value="none">Aucune image (son seul)</option>
            </select>
          </div>
          {source === "camera" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="cam">Caméra</label>
              <select id="cam" value={camId} onChange={(e) => { setCamId(e.target.value); if (active) void start({ cam: e.target.value }); }}>
                <option value="">Par défaut</option>
                {devices.cams.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Caméra ${i + 1}`}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="mic">Entrée audio</label>
            <select id="mic" value={micId} onChange={(e) => { setMicId(e.target.value); if (active) void start({ mic: e.target.value }); }}>
              <option value="">Par défaut (micro de l&apos;ordinateur)</option>
              {devices.mics.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Entrée ${i + 1}`}</option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={rawAudio} onChange={(e) => setRawAudio(e.target.checked)} />
            Son brut pour la musique (sans réduction de bruit ni égalisation automatique)
          </label>
          <label className="check">
            <input type="checkbox" checked={stereo} onChange={(e) => setStereo(e.target.checked)} />
            Demander le stéréo
          </label>
          <div className="control-meta" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => void start()}>{active ? "Relancer avec ces réglages" : "Activer"}</button>
            {active && <button className="btn-ghost" onClick={stopAll}>Arrêter</button>}
          </div>
          {error && <p className="error">{error}</p>}
          <p className="hint" style={{ marginTop: 12 }}>
            Pour envoyer le son de ta table de mixage, branche-la en USB ou via une interface audio :
            elle apparaît alors dans « Entrée audio ». Le micro de l&apos;ordinateur ne capte que le bruit de la pièce.
          </p>
        </div>
      </div>

      <h2 className="display">Lancer le live sur YouTube</h2>
      <div className="panel">
        <p style={{ marginBottom: 14 }}>
          Banger Tunes affiche ton live YouTube à côté de tes vinyles. La diffusion elle-même se fait depuis YouTube :
          ce studio sert à vérifier ton image et ton son, puis tu choisis l&apos;une de ces deux méthodes.
        </p>
        <div className="method-grid">
          <div className="method">
            <strong>A · Depuis YouTube (le plus simple)</strong>
            <p>YouTube Studio → <em>Créer → Passer en direct → Webcam</em>. Choisis la même caméra et la même entrée audio que ci-dessus.</p>
            <a className="btn-ghost" href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer">Ouvrir YouTube Studio ↗</a>
          </div>
          <div className="method">
            <strong>B · Avec OBS Studio (plusieurs caméras, son de la table)</strong>
            <p>Ajoute tes sources dans OBS, colle la clé de diffusion de YouTube dans <em>Paramètres → Diffusion</em>, puis « Démarrer la diffusion ».</p>
            <Link className="btn-ghost" href="/guide#obs">Voir le tuto OBS →</Link>
          </div>
        </div>

        <form className="form-grid" onSubmit={saveYoutube} style={{ marginTop: 20 }}>
          <div className="field field-wide">
            <label htmlFor="yt">Colle ici le lien de ton live YouTube</label>
            <input id="yt" name="youtube_url" type="url" defaultValue={live.youtube_url ?? ""} placeholder="https://www.youtube.com/live/…" />
          </div>
          <button className="btn" type="submit">Brancher sur mon live</button>
        </form>
        {ytMsg && <p className={ytMsg.ok ? "info" : "error"}>{ytMsg.text}</p>}
        {embed && (
          <div className="player" style={{ marginTop: 16, maxWidth: 560 }}>
            <iframe src={embed} title="Aperçu côté spectateur" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          </div>
        )}
      </div>

      <h2 className="display">Pendant le live</h2>
      <LiveControl live={live} onLiveChange={setLive} compact />
    </div>
  );
}
