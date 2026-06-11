/** Subtle Big 5 wildlife silhouettes for the lower half of KIGH certificates. */
export function BigFiveWildlifeBackground() {
  return (
    <div className="cert-wildlife-bg" aria-hidden>
      <svg
        className="cert-wildlife-svg"
        viewBox="0 0 1100 300"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Lion — left */}
        <g transform="translate(40, 60)">
          <ellipse cx="55" cy="95" rx="38" ry="28" />
          <circle cx="55" cy="52" r="32" />
          <circle cx="55" cy="52" r="22" opacity="0.85" />
          <path d="M88 48 Q105 35 115 50 Q108 65 95 58 Z" />
          <path d="M25 55 Q8 42 5 58 Q12 72 28 65 Z" />
          <path d="M45 115 Q50 145 55 175 Q60 145 65 115" opacity="0.7" />
        </g>

        {/* Leopard — left-center */}
        <g transform="translate(195, 95)">
          <ellipse cx="45" cy="55" rx="42" ry="18" />
          <ellipse cx="75" cy="48" rx="22" ry="16" />
          <path d="M20 58 Q5 62 8 72 Q18 68 25 62" />
          <path d="M95 42 Q115 38 120 48 Q112 55 100 50" />
          <circle cx="82" cy="44" r="2.5" opacity="0.5" />
          <circle cx="70" cy="50" r="2" opacity="0.5" />
          <circle cx="58" cy="46" r="2" opacity="0.5" />
        </g>

        {/* Elephant — center */}
        <g transform="translate(380, 35)">
          <ellipse cx="80" cy="130" rx="75" ry="55" />
          <ellipse cx="80" cy="55" rx="45" ry="38" />
          <path d="M35 55 Q5 65 8 95 Q15 110 35 100 Q25 80 35 55" />
          <path d="M125 55 Q155 50 160 70 Q155 90 135 85 Q145 70 125 55" />
          <path d="M55 175 Q50 210 48 240 Q52 245 58 240 Q60 210 65 175" opacity="0.7" />
          <path d="M105 175 Q110 210 112 240 Q108 245 102 240 Q100 210 95 175" opacity="0.7" />
        </g>

        {/* Rhino — right-center */}
        <g transform="translate(620, 80)">
          <ellipse cx="55" cy="75" rx="58" ry="38" />
          <ellipse cx="95" cy="58" rx="28" ry="22" />
          <path d="M118 52 Q138 45 142 58 Q135 68 122 62" />
          <path d="M15 72 Q-5 68 2 82 Q12 86 22 78" />
          <path d="M40 108 Q42 140 44 170" opacity="0.6" />
          <path d="M70 108 Q72 140 74 170" opacity="0.6" />
        </g>

        {/* Buffalo — right */}
        <g transform="translate(820, 70)">
          <ellipse cx="60" cy="80" rx="55" ry="35" />
          <ellipse cx="95" cy="62" rx="30" ry="24" />
          <path d="M115 55 Q135 40 140 55 Q130 70 118 65" />
          <path d="M118 48 Q128 30 125 20 Q120 28 115 45" opacity="0.8" />
          <path d="M130 48 Q142 28 138 15 Q132 25 128 42" opacity="0.8" />
          <path d="M20 78 Q5 72 8 85 Q18 90 28 82" />
        </g>
      </svg>
    </div>
  )
}
