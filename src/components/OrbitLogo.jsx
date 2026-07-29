function OrbitLogo({ className = "", title = "Orbit" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="orbit-logo-body" x1="30" y1="18" x2="88" y2="100">
          <stop offset="0" stopColor="#d8d4ff" />
          <stop offset="0.48" stopColor="#9b93ed" />
          <stop offset="1" stopColor="#655cc5" />
        </linearGradient>
        <linearGradient id="orbit-logo-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8b2ff" />
          <stop offset="1" stopColor="#655cc5" stopOpacity="0" />
        </linearGradient>
        <filter id="orbit-logo-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse
        cx="60"
        cy="59"
        rx="47"
        ry="19"
        fill="none"
        stroke="#7168c9"
        strokeOpacity="0.34"
        strokeWidth="1.5"
        transform="rotate(-17 60 59)"
      />
      <circle cx="20" cy="68" r="2.5" fill="#9b93ed" filter="url(#orbit-logo-glow)" />
      <circle cx="96" cy="34" r="1.6" fill="#d8d4ff" opacity="0.75" />
      <path d="M101 73l1.7 3.4 3.4 1.7-3.4 1.7-1.7 3.4-1.7-3.4-3.4-1.7 3.4-1.7 1.7-3.4Z" fill="#9b93ed" opacity="0.82" />

      <g filter="url(#orbit-logo-glow)">
        <path
          d="M60 20c-12.5 11.4-18.1 24.8-17.2 40.5L60 72l17.2-11.5C78.1 44.8 72.5 31.4 60 20Z"
          fill="none"
          stroke="url(#orbit-logo-body)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="45" r="6.5" fill="#11111a" stroke="#b8b2ff" strokeWidth="2.2" />
        <path d="M43 55 32 68l13-2.2M77 55l11 13-13-2.2" fill="none" stroke="#8e86e3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M52 72v15M60 75v21M68 72v15" stroke="url(#orbit-logo-flame)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default OrbitLogo;
