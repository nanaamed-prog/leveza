"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/** Mostra uma foto privada usando URL assinada que expira em 5 minutos. */
export function SignedPhoto({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let alive = true;
    sb.storage
      .from("food-photos")
      .createSignedUrl(path, 300)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="skeleton size-16 rounded-xl" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      className="size-16 rounded-xl object-cover"
      referrerPolicy="no-referrer"
    />
  );
}
