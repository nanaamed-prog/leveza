"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, compressImage } from "@/lib/image";

export function FoodPhotoCapture({
  onReady,
  disabled,
}: {
  onReady: (blob: Blob, previewUrl: string) => void;
  disabled?: boolean;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function handle(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.type && !ACCEPTED_TYPES.includes(file.type))
      return setError("Formato não suportado. Use JPG, PNG ou WEBP.");
    if (file.size > 20 * 1024 * 1024)
      return setError("Imagem muito grande (máx. 20 MB antes da compressão).");
    try {
      const blob = await compressImage(file);
      if (blob.size > MAX_UPLOAD_BYTES)
        return setError("Imagem muito grande mesmo após compressão.");
      const url = URL.createObjectURL(blob);
      setPreview(url);
      onReady(blob, url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler a imagem.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card border border-dashed border-sage bg-card">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Prévia da refeição" className="size-full object-cover" />
        ) : (
          <div className="text-center text-sm text-muted">
            <ImageOff className="mx-auto mb-2 size-8 text-sage" aria-hidden />
            Nenhuma foto selecionada
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => cam.current?.click()} disabled={disabled}>
          <Camera /> Tirar foto
        </Button>
        <Button variant="secondary" onClick={() => gal.current?.click()} disabled={disabled}>
          <Upload /> Da galeria
        </Button>
      </div>
      <input
        ref={cam}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <input
        ref={gal}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
