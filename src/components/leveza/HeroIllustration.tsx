/** Ilustração original: nascer do sol sobre colinas (sem pessoas reais). */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 120"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDEEDF" />
          <stop offset="0.6" stopColor="#F9D3A8" />
          <stop offset="1" stopColor="#F6F3EC" />
        </linearGradient>
        <radialGradient id="hero-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF7EC" />
          <stop offset="0.5" stopColor="#F7B267" />
          <stop offset="1" stopColor="#F2994A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="120" fill="url(#hero-sky)" />
      <circle cx="250" cy="66" r="44" fill="url(#hero-sun)" />
      <circle cx="250" cy="66" r="14" fill="#FFF3E3" />
      <path
        d="M0 82C50 62 95 70 140 78C190 86 230 66 280 68C320 70 345 78 360 84V120H0Z"
        fill="#A3C9A8"
        opacity="0.9"
      />
      <path
        d="M0 96C60 82 110 90 170 96C230 102 290 86 360 92V120H0Z"
        fill="#2E7D6B"
        opacity="0.85"
      />
      <path d="M0 108C70 98 140 104 200 110C260 116 310 104 360 108V120H0Z" fill="#0F5132" />
      <g stroke="#0F5132" strokeWidth="1.4" fill="none" opacity="0.5">
        <path d="M60 40c4-3 8-3 12 0" />
        <path d="M76 34c3-2 6-2 9 0" />
        <path d="M300 30c3-2 6-2 9 0" />
      </g>
    </svg>
  );
}
