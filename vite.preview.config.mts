// Prévia em ARQUIVO ÚNICO (HTML com JS, CSS e fontes embutidos), em Modo demonstração.
// Uso: npm run preview:single  →  dist-preview/index.html
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "preview"),
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(__dirname, "preview/next-link.tsx") },
      { find: "next/navigation", replacement: path.resolve(__dirname, "preview/next-navigation.ts") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(""),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: { outDir: path.resolve(__dirname, "dist-preview"), emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
