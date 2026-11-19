import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leveza — Seu equilíbrio, todos os dias",
    short_name: "Leveza",
    description: "Acompanhe alimentação, movimento, sono, água e hábitos com gentileza.",
    lang: "pt-BR",
    start_url: "/app/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F3EC",
    theme_color: "#0F5132",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
