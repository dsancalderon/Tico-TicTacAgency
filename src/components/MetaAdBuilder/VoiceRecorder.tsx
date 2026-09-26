import { useEffect, useRef, useState } from 'react';

export function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => Promise<void> }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; clearTimeout(timer.current); if (recorder.current) recorder.current.onstop = null; stream.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function start() {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Tu navegador no permite grabar. Puedes responder las preguntas por escrito.');
      const mime = ['audio/webm','audio/mp4','audio/ogg'].find(m => MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error('El navegador no ofrece un formato de audio compatible.');
      const device = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { device.getTracks().forEach(t => t.stop()); return; }
      stream.current = device;
      const active = new MediaRecorder(device, { mimeType: mime }); recorder.current = active;
      const chunks: Blob[] = [];
      active.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      active.onstop = async () => {
        clearTimeout(timer.current); device.getTracks().forEach(t => t.stop()); setRecording(false); setBusy(true);
        const blob = new Blob(chunks, { type: mime }); setPreview(URL.createObjectURL(blob));
        try { await onRecorded(new File([blob], `nota-de-voz.${mime.split('/')[1]}`, { type: mime })); }
        catch (e) { setError((e as Error).message); } finally { if (mounted.current) setBusy(false); }
      };
      active.start(); setRecording(true);
      timer.current = setTimeout(() => { if (active.state === 'recording') active.stop(); }, 60000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); setError((e as Error).message); }
  }
  return <div className="space-y-3"><p>Cuéntame qué vendes, a quién, dónde, qué te hace diferente y tu oferta. Tienes un minuto.</p>
    <button type="button" className="rounded-xl bg-indigo-600 px-5 py-3 text-white" disabled={busy} onClick={() => recording ? recorder.current?.stop() : void start()}>{recording ? 'Detener grabación' : busy ? 'Guardando tu voz…' : 'Grabar mi negocio'}</button>
    {recording && <p role="status">Grabando… se detiene al minuto.</p>}{preview && <audio controls src={preview} aria-label="Tu nota de voz" />}{error && <p role="alert">{error}</p>}
  </div>;
}
