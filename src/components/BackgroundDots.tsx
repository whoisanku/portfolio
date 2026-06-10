const BackgroundDots = () => (
  <svg
    className="pointer-events-none fixed inset-0 -z-10 block h-screen w-screen"
    width="100%"
    height="100%"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <pattern
        id="small-dot-pattern"
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
        patternTransform="translate(-0.5,-0.5)"
      >
        <circle cx="0.5" cy="0.5" r="0.5" fill="#a1a1aa" opacity="0.25" />
      </pattern>
      <pattern
        id="large-dot-pattern"
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="translate(-0.5,-0.5)"
      >
        <circle cx="0.5" cy="0.5" r="0.5" fill="#a1a1aa" opacity="0.25" />
      </pattern>
      <filter id="animated-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.20"
          numOctaves="2"
          result="colorNoise"
        >
          <animate
            attributeName="baseFrequency"
            values="0.6; 1; 0.8; 0.4; 0.6"
            dur="5s"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feColorMatrix
          in="colorNoise"
          type="matrix"
          values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 0   0   0 0 .33 0   0   0 0 0   0   0   1 0"
          result="monoNoise"
        >
          <animate
            attributeName="values"
            to="1 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 1 0"
            dur="10s"
            repeatCount="indefinite"
          />
        </feColorMatrix>
        <feComposite operator="out" in2="monoNoise" in="SourceGraphic" />
      </filter>
      <mask id="small-dots-mask">
        <rect width="100%" height="100%" filter="url(#animated-noise)" />
        <rect width="100%" height="100%" fill="url(#small-dot-pattern)" />
      </mask>
    </defs>
    <rect
      width="100%"
      height="100%"
      fill="url(#small-dot-pattern)"
      mask="url(#small-dots-mask)"
      opacity="0.6"
    >
      <animate
        attributeName="opacity"
        values="0; 0.6; 0"
        dur="12s"
        repeatCount="indefinite"
      />
    </rect>
    <rect width="100%" height="100%" fill="url(#large-dot-pattern)" />
  </svg>
);

export default BackgroundDots;
