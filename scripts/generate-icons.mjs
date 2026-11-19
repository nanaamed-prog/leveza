// Gera PNGs a partir dos SVGs originais. Uso: npm run icons
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const jobs = [
  ["public/icons/icon.svg", "public/icons/icon-192.png", 192, 192],
  ["public/icons/icon.svg", "public/icons/icon-512.png", 512, 512],
  ["public/icons/maskable.svg", "public/icons/maskable-512.png", 512, 512],
  ["public/icons/icon.svg", "public/icons/apple-touch-icon.png", 180, 180],
  ["public/icons/splash.svg", "public/icons/splash-1290x2796.png", 1290, 2796],
  ["public/brand/leveza-horizontal.svg", "public/brand/leveza-horizontal.png", 960, 256],
];
for (const [src, out, w, h] of jobs) {
  const svg = await readFile(src);
  await sharp(svg, { density: 384 }).resize(w, h).png().toFile(out);
  console.log("✓", out);
}
