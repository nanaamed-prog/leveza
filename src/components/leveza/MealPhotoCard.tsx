"use client";

import Link from "next/link";
import { Camera, ImageIcon } from "lucide-react";
import { SignedPhoto } from "./SignedPhoto";

/** Ilustração original de um prato equilibrado (usada quando não há foto). */
function PlateArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="mp-table" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C98A56" />
          <stop offset="1" stopColor="#9C6337" />
        </linearGradient>
        <radialGradient id="mp-plate" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9E4DA" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#mp-table)" />
      <g opacity="0.18" stroke="#5A3418" strokeWidth="2">
        <path d="M0 40 Q160 30 320 46" fill="none" />
        <path d="M0 120 Q160 110 320 128" fill="none" />
        <path d="M0 170 Q160 162 320 178" fill="none" />
      </g>
      <ellipse cx="160" cy="106" rx="112" ry="86" fill="#00000022" />
      <ellipse cx="160" cy="100" rx="110" ry="84" fill="url(#mp-plate)" />
      <ellipse cx="160" cy="100" rx="88" ry="66" fill="#F4F1EA" />
      {/* folhas */}
      {[
        [110, 62, -20],
        [132, 48, 10],
        [160, 44, -5],
        [188, 50, 25],
        [206, 66, 40],
        [120, 80, -40],
      ].map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="20"
          ry="11"
          transform={`rotate(${r} ${x} ${y})`}
          fill={i % 2 ? "#5E9E3A" : "#3F7F2A"}
        />
      ))}
      {/* tomates */}
      {[
        [104, 96],
        [146, 60],
        [178, 64],
        [216, 88],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="11" fill="#D9412B" />
          <circle cx={(x ?? 0) - 3} cy={(y ?? 0) - 3} r="3" fill="#F7A38F" />
        </g>
      ))}
      {/* frango grelhado */}
      <g transform="rotate(-12 150 112)">
        <rect x="104" y="90" width="92" height="48" rx="22" fill="#D8A15E" />
        {[118, 134, 150, 166, 182].map((x) => (
          <path key={x} d={`M${x} 92 L${x - 10} 136`} stroke="#8A5523" strokeWidth="5" />
        ))}
      </g>
      {/* abacate */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${206 + i * 10} ${100 + i * 8} q22 6 26 28 q-22 2 -30 -20 z`}
          fill="#B9D36A"
          stroke="#5E7D2A"
          strokeWidth="2"
        />
      ))}
      {/* cenoura ralada */}
      <g stroke="#F0882E" strokeWidth="3" strokeLinecap="round">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${196 + i * 4} ${62 + i * 3} l14 10`} />
        ))}
      </g>
    </svg>
  );
}

function Corners() {
  const c = "absolute size-7 border-white/95";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-4">
      <span className={`${c} left-0 top-0 rounded-tl-lg border-l-[3px] border-t-[3px]`} />
      <span className={`${c} right-0 top-0 rounded-tr-lg border-r-[3px] border-t-[3px]`} />
      <span className={`${c} bottom-0 left-0 rounded-bl-lg border-b-[3px] border-l-[3px]`} />
      <span className={`${c} bottom-0 right-0 rounded-br-lg border-b-[3px] border-r-[3px]`} />
    </div>
  );
}

/** Cartão grande com a foto da última refeição e o botão de câmera. */
export function MealPhotoCard({ photoPath, alt }: { photoPath: string | null; alt: string }) {
  return (
    <div className="relative aspect-[16/11] overflow-hidden rounded-card bg-[#B07A4B] shadow-card">
      {photoPath ? (
        <SignedPhoto path={photoPath} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <PlateArt />
      )}
      <Corners />
      <Link
        href="/app/alimentacao/nova?modo=foto"
        aria-label="Fotografar refeição"
        className="absolute bottom-3 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-forest text-white shadow-lg"
      >
        <Camera className="size-6" aria-hidden />
      </Link>
      <Link
        href="/app/alimentacao/nova?modo=foto"
        aria-label="Escolher foto da galeria"
        className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-xl bg-white/90 text-forest"
      >
        <ImageIcon className="size-5" aria-hidden />
      </Link>
    </div>
  );
}
