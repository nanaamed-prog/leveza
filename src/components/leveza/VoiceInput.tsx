"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Tipos mínimos da Web Speech API (não fazem parte do lib.dom padrão). */
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Ditado por voz (pt-BR) direto no navegador. O áudio é transcrito pelo reconhecimento de fala
 * do próprio aparelho/navegador; o Leveza não grava nem guarda o áudio.
 */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSupported(Boolean(getCtor())), 0);
    return () => {
      clearTimeout(t);
      rec.current?.stop();
    };
  }, []);

  function start() {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    try {
      const r = new Ctor();
      r.lang = "pt-BR";
      r.continuous = true;
      r.interimResults = false;
      r.onresult = (e) => {
        let text = "";
        for (let i = e.resultIndex; i < e.results.length; i++)
          if (e.results[i]!.isFinal) text += e.results[i]![0].transcript;
        if (text.trim()) onText(text.trim());
      };
      r.onerror = (e) =>
        setError(
          e.error === "not-allowed" || e.error === "service-not-allowed"
            ? "O microfone não foi liberado aqui. Use o microfone do teclado do celular para ditar."
            : e.error === "no-speech"
              ? "Não ouvi nada. Tente de novo, falando perto do celular."
              : "O ditado não funcionou agora. Use o microfone do teclado.",
        );
      r.onend = () => setListening(false);
      rec.current = r;
      r.start();
      setListening(true);
    } catch {
      setError("O ditado não está disponível aqui. Use o microfone do teclado do celular.");
    }
  }

  if (supported === false) {
    return (
      <p className="text-xs text-muted">
        Dica: toque no 🎤 do teclado do celular para ditar o que você comeu.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {listening ? (
        <Button variant="accent" block onClick={() => rec.current?.stop()}>
          <Square /> Parar de ouvir
        </Button>
      ) : (
        <Button variant="secondary" block onClick={start} disabled={supported === null}>
          <Mic /> Falar o que comi
        </Button>
      )}
      {listening && (
        <p role="status" className="text-center text-xs font-semibold text-orange-ink">
          Ouvindo… fale os alimentos e as quantidades.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
      {!listening && !error && (
        <p className="text-center text-xs text-muted">O áudio não é gravado nem guardado.</p>
      )}
    </div>
  );
}
