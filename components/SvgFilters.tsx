export function SvgFilters() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="liquidGlassFilter" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={2} seed={7} result="noise">
            <animate attributeName="baseFrequency" dur="16s" values="0.012 0.018;0.017 0.011;0.012 0.018" repeatCount="indefinite" />
          </feTurbulence>
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />

          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale={14} xChannelSelector="R" yChannelSelector="G" result="dispR" />
          <feColorMatrix in="dispR" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="rChan" />

          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale={22} xChannelSelector="R" yChannelSelector="G" result="dispG" />
          <feColorMatrix in="dispG" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="gChan" />

          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale={30} xChannelSelector="R" yChannelSelector="G" result="dispB" />
          <feColorMatrix in="dispB" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="bChan" />

          <feBlend in="rChan" in2="gChan" mode="screen" result="rg" />
          <feBlend in="rg" in2="bChan" mode="screen" result="chromatic" />

          <feDisplacementMap in="chromatic" in2="softNoise" scale={8} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="wboxGooFilter" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
          <feGaussianBlur in="goo" stdDeviation="6" result="softened" />
        </filter>
      </defs>
    </svg>
  );
}
