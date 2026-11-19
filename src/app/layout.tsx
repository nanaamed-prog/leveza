import type { Metadata, Viewport } from "next";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "./globals.css";
import { AppDataProvider } from "@/lib/data/provider";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "Leveza — Seu equilíbrio, todos os dias", template: "%s · Leveza" },
  description:
    "Diário de bem-estar para acompanhar alimentação, movimento, sono, água e hábitos com linguagem clara e gentil. Não é dispositivo médico.",
  applicationName: "Leveza",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Leveza",
    statusBarStyle: "default",
    startupImage: [{ url: "/icons/splash-1290x2796.png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0F5132",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppDataProvider>{children}</AppDataProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
