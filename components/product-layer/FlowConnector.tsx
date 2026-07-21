export function FlowConnector() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block" viewBox="0 0 1200 820" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sf-flow-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#16A34A" stopOpacity="0.18" />
          <stop offset="48%" stopColor="#A8EF72" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#FACC15" stopOpacity="0.36" />
        </linearGradient>
        <filter id="sf-flow-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path className="sf-flow-path" d="M 260 372 C 420 180, 590 155, 770 210" filter="url(#sf-flow-glow)" />
      <path className="sf-flow-path sf-flow-path-delay" d="M 300 455 C 520 455, 650 470, 785 500" filter="url(#sf-flow-glow)" />
      <path className="sf-flow-path" d="M 315 548 C 520 682, 700 700, 925 680" filter="url(#sf-flow-glow)" />

      <circle r="6" fill="#A8EF72" filter="url(#sf-flow-glow)">
        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 260 372 C 420 180, 590 155, 770 210" />
      </circle>
      <circle r="5" fill="#16A34A" filter="url(#sf-flow-glow)">
        <animateMotion dur="6.4s" repeatCount="indefinite" path="M 300 455 C 520 455, 650 470, 785 500" />
      </circle>
      <circle r="5" fill="#FACC15" filter="url(#sf-flow-glow)">
        <animateMotion dur="7s" repeatCount="indefinite" path="M 315 548 C 520 682, 700 700, 925 680" />
      </circle>
    </svg>
  );
}
