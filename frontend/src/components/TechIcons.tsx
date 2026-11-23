import React from 'react';

// Official & Pixel-Accurate Tech Brand Icons
export const NextjsIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 180 180" fill="none" className={className}>
    <mask id="next-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="180" height="180" style={{ maskType: 'alpha' }}>
      <circle cx="90" cy="90" r="90" fill="black" />
    </mask>
    <g mask="url(#next-mask)">
      <circle cx="90" cy="90" r="90" fill="black" />
      <path
        d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
        fill="url(#next-grad-1)"
      />
      <rect x="115" y="54" width="12" height="72" fill="url(#next-grad-2)" />
    </g>
    <defs>
      <linearGradient id="next-grad-1" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="next-grad-2" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

export const ReactIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="-11.5 -10.23174 23 20.46348" className={className}>
    <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
    <g stroke="#61DAFB" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
);

export const VueIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 261.76 226.69" className={className}>
    <path d="M161.096.001l-30.225 52.351L100.647.001H-.005l130.877 226.688L261.749.001z" fill="#41B883" />
    <path d="M161.096.001l-30.225 52.351L100.647.001H52.246l78.626 136.181L209.497.001z" fill="#34495E" />
  </svg>
);

export const SvelteIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF3E00" className={className}>
    <path d="M19.98 5.75c-1.12-1.95-3.64-2.83-5.74-2.02-.38.15-1.2.62-1.2.62s-.75.46-.86.53c-.38.25-.8.44-1.25.56l-2.09.56c-.66.18-1.24.56-1.68 1.09-.9 1.1-.98 2.62-.2 3.8.18.27.4.52.66.72l.45.35 1.57.94c.15.09.28.2.4.31.25.24.41.56.45.9.06.49-.12.98-.49 1.32-.23.21-.52.34-.84.38-.4.05-.8-.06-1.14-.3-.19-.13-.35-.3-.47-.49l-.49-.78c-.28-.46-.77-.75-1.31-.78-.54-.03-1.06.2-1.39.63-.44.57-.48 1.34-.11 1.95.73 1.25 1.95 2.1 3.36 2.34.62.1 1.25.07 1.86-.1.35-.1.76-.32.76-.32s.97-.55 1.07-.63c.48-.36 1.03-.61 1.62-.75l2.25-.56c.72-.18 1.37-.58 1.86-1.14.88-1.02 1.08-2.43.51-3.65-.21-.45-.53-.84-.92-1.15l-.49-.38-1.78-1.06c-.19-.11-.36-.26-.49-.44-.22-.3-.32-.67-.28-1.04.05-.44.27-.84.62-1.11.27-.21.61-.31.95-.29.41.02.8.2 1.08.5.21.23.36.51.44.81.16.59.69 1.01 1.3 1.01h.06c.55-.02 1.03-.36 1.24-.87.27-.66.13-1.42-.35-1.95z" />
  </svg>
);

export const AstroIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8.5 17.5c-2.5 1-4.5 0-5-1.5 2-1 4.5.5 5 1.5z" fill="#FF5D01" />
    <path d="M15.5 17.5c2.5 1 4.5 0 5-1.5-2-1-4.5.5-5 1.5z" fill="#FF5D01" />
    <path d="M12 3L6.5 16.5C7.5 15.5 10 15 12 15s4.5.5 5.5 1.5L12 3z" fill="#BC52EE" />
  </svg>
);

// Official Node.js Hexagon Logo
export const NodejsIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M16 2.5L3.5 9.7V24.3L16 31.5L28.5 24.3V9.7L16 2.5Z" fill="#339933" />
    <path d="M16 11.2V20.8M16 20.8L20.2 18.4M16 20.8L11.8 18.4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Official Python Logo (Intertwined Blue & Yellow Snakes)
export const PythonIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 110 110" className={className}>
    <path
      d="M54.2 3.5c-25 0-23.5 10.8-23.5 10.8l.03 11.2h23.9v3.4H20.7C9.3 28.9 3.5 35.8 3.5 49.3c0 15.4 9.9 16.2 9.9 16.2h5.9v-8.2c0-9.4 8.2-9.4 8.2-9.4h23.7c7.4 0 7.4-7.2 7.4-7.2v-23c0-12.2-4.4-14.2-4.4-14.2zm-13 7.4a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z"
      fill="#3776AB"
    />
    <path
      d="M55.8 106.5c25 0 23.5-10.8 23.5-10.8l-.03-11.2H55.4V81h33.9c11.4 0 17.2-6.9 17.2-20.4 0-15.4-9.9-16.2-9.9-16.2h-5.9v8.2c0 9.4-8.2 9.4-8.2 9.4H48.8c-7.4 0-7.4 7.2-7.4 7.2v23c0 12.2 4.4 14.3 4.4 14.3zm13-7.4a3.8 3.8 0 1 1 0-7.6 3.8 3.8 0 0 1 0 7.6z"
      fill="#FFD43B"
    />
  </svg>
);

// Official FastAPI Logo (Teal circle with white lightning bolt)
export const FastAPIIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="12" fill="#059669" />
    <path d="M12.5 4L6 13.5H11.5L10.5 20L18 10.5H12.5L12.5 4Z" fill="white" />
  </svg>
);

// Official Django Logo (Dark green block with iconic 'dj' typography)
export const DjangoIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="6" fill="#092E20" />
    <path
      d="M11.5 5.5V15.5C11.5 17.5 10.5 18.5 8.5 18.5C7.2 18.5 6.3 18 5.8 17.3L6.8 15.8C7.2 16.2 7.7 16.5 8.3 16.5C9.3 16.5 9.7 15.9 9.7 14.8V5.5H11.5ZM13.2 9.5H15V18.5H13.2V9.5ZM13.2 6.5C13.2 5.9 13.7 5.4 14.3 5.4C14.9 5.4 15.4 5.9 15.4 6.5C15.4 7.1 14.9 7.6 14.3 7.6C13.7 7.6 13.2 7.1 13.2 6.5Z"
      fill="#44B78B"
    />
  </svg>
);

// Official Flask Logo
export const FlaskIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M9 3H15M10 3V8.5L5.2 17C4.4 18.4 5.4 20.2 7 20.2H17C18.6 20.2 19.6 18.4 18.8 17L14 8.5V3"
      stroke="#1E293B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7.5 15H16.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Official Go (Golang) Cyan Logo
export const GoIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#00ADD8" className={className}>
    <path d="M1.5 9.5c.3 0 .7.1 1 .1 1.7 0 3-.6 3.9-1.8.3-.4.5-.8.7-1.3H4.3c-.6 0-1.1-.3-1.5-.7-.4-.5-.6-1-.5-1.6.2-1.1 1.2-1.8 2.3-1.8h3.8c.6 0 1.1.2 1.5.6.5.5.7 1.1.6 1.7-.1.9-.5 1.9-1.2 2.8-1.5 2.1-3.6 3.1-6.4 3.1-.7 0-1.5-.1-2.2-.4-.2-.1-.3-.2-.5-.3l1.1-1.4zm10.7 4.2c0-1.4.3-2.6.9-3.6.6-1 1.4-1.8 2.4-2.3 1-.5 2.2-.8 3.5-.8 1.5 0 2.8.4 3.9 1.1 1.1.8 1.8 1.9 2.2 3.2h-2.5c-.3-.7-.7-1.2-1.3-1.6-.6-.4-1.4-.6-2.3-.6-1.1 0-2 .4-2.8 1.1-.8.7-1.2 1.8-1.2 3.1 0 1.4.4 2.4 1.2 3.2.8.7 1.7 1.1 2.8 1.1.8 0 1.5-.2 2.1-.6.6-.4 1-.9 1.3-1.6h-3.4v-1.9h5.8v2.1c-.4 1.4-1.2 2.5-2.4 3.3-1.2.8-2.6 1.2-4.2 1.2-1.4 0-2.6-.3-3.6-.8-1.1-.5-1.9-1.3-2.5-2.3-.5-1-.8-2.2-.8-3.6z" />
  </svg>
);

// Official Rust Logo (The Gear & 'R')
export const RustIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 106 106" fill="#CE422B" className={className}>
    <path d="M53 3a50 50 0 1 0 50 50A50 50 0 0 0 53 3zm0 9a41 41 0 1 1-41 41 41 41 0 0 1 41-41zm-15 15h19c9.5 0 16 5.5 16 14 0 6-3.5 11-9.5 13l11 19H62l-9-17h-8v17H38zm15 11v11h4c4 0 6.5-2 6.5-5.5s-2.5-5.5-6.5-5.5z" />
  </svg>
);

// Official Spring Boot Logo (Green Leaf)
export const SpringIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#6DB33F" className={className}>
    <path d="M21.5 8.5c-.8-3.8-3.8-6.8-7.6-7.6-6.1-1.3-11.8 3-12.7 9.1-.8 5.4 2.2 10.4 7.3 12.1 4.5 1.5 9.4.1 12.5-3.3 1.2-1.3 1.5-3.2.7-4.7l-4.5-8.5c-.4-.7-1.3-1-2-.6-.7.4-1 1.3-.6 2l3.4 6.4c-2.3 2.1-5.6 2.8-8.6 1.7-3.7-1.3-5.9-5-5.3-8.9.6-4.4 4.8-7.5 9.2-6.5 2.8.6 5 2.8 5.6 5.6.2 1-.2 2.1-.9 2.8-.7.7-1.8 1-2.7.7-1.2-.4-1.8-1.6-1.5-2.8.2-.8.8-1.4 1.6-1.6.4-.1.8.1.9.5.1.4-.1.8-.5.9-.3.1-.5.3-.6.6-.1.4.1.8.5.9.3.1.7 0 .9-.2.3-.3.5-.7.4-1.1-.3-1.3-1.3-2.3-2.6-2.6-2-.5-4 1-4.5 3-.5 2 1 4 3 4.5 1.4.3 2.9-.1 3.9-1.1 1.4-1.4 2-3.4 1.5-5.3z" />
  </svg>
);

// Official Laravel Logo (Isometric Red Geometric Icon)
export const LaravelIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF2D20" className={className}>
    <path d="M8.6 1.3L1.5 5.4v8.2l7.1 4.1 7.1-4.1V9.5l-3.6-2.1v4.1l-3.5 2V7.4l3.5-2 3.6 2.1 3.5-2-7.1-4.2zm6.8 9.5l3.5 2v4.1l-7.1 4.1-3.5-2v-4.1l3.5 2 7.1-4.1v-2z" />
  </svg>
);

// Official Ruby on Rails Logo
export const RubyIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#CC0000" className={className}>
    <path d="M21.5 6.2c-.3-.8-.9-1.5-1.7-1.9L13.2.7C12.4.3 11.6.3 10.8.7L4.2 4.3C3.4 4.7 2.8 5.4 2.5 6.2c-.3.8-.3 1.7 0 2.5l6.6 14.3c.4.8 1.1 1.3 1.9 1.5.8.2 1.7 0 2.4-.4l6.6-3.6c.7-.4 1.3-1 1.6-1.8.3-.8.3-1.7 0-2.5L15 6h6.5zM12 2.8l5.8 3.2H6.2L12 2.8z" />
  </svg>
);

// Official .NET Logo (Purple Microsoft .NET)
export const DotNetIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="6" fill="#512BD4" />
    <path
      d="M5 16V8h2.2l3.4 5.3V8H13v8h-2.2L7.4 10.7V16H5zm10.5 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm3.5-1.8h-1.5v1.8h-1.5V8H19c1.4 0 2.5 1.1 2.5 2.5v1.2c0 1.4-1.1 2.5-2.5 2.5zm0-4.7h-1.5v3.2H19c.6 0 1-.4 1-1v-1.2c0-.6-.4-1-1-1z"
      fill="white"
    />
  </svg>
);

// Official Bun Logo
export const BunIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill="#FBF0DF" stroke="#1E293B" strokeWidth="1.5" />
    <path d="M8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="#1E293B" />
    <path d="M10 14c1 1 3 1 4 0" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Official Deno Logo
export const DenoIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="11" fill="black" />
    <path
      d="M12 4C7.6 4 4 7.6 4 12c0 3.3 2 6.2 5 7.4V16c0-1.7 1.3-3 3-3h1v-2c0-.6.4-1 1-1h1V8c0-2.2-1.8-4-4-4z"
      fill="white"
    />
  </svg>
);

// Official PostgreSQL Logo (Elephant Emblem)
export const PostgresIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#336791" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.6 6.1 9.1-.1-.8-.1-2 0-2.8l1.3-5.3s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.5-1 3.9-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.8-2.2 3.8-5.5 0-2.9-2.1-4.9-5-4.9-3.4 0-5.4 2.6-5.4 5.2 0 1 .4 2.1.9 2.7.1.1.1.2.1.3-.1.4-.3 1.2-.3 1.4 0 .2-.1.2-.3.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2-1.3 2.7 1 .3 2.1.5 3.2.5 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
  </svg>
);

// Official Redis Logo
export const RedisIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC382D" className={className}>
    <path d="M21.5 8.7l-9-5.2c-.3-.2-.7-.2-1 0l-9 5.2c-.3.2-.5.5-.5.9v10.4c0 .4.2.7.5.9l9 5.2c.2.1.3.1.5.1s.3 0 .5-.1l9-5.2c.3-.2.5-.5.5-.9V9.6c0-.4-.2-.7-.5-.9zM12 5.2l7.4 4.3-3.1 1.8-7.4-4.3L12 5.2zm-1 15.5l-7-4v-7.9l7 4.1v7.8zm2 0v-7.8l7-4.1v7.9l-7 4z" />
  </svg>
);

// Official MongoDB Leaf Logo
export const MongoIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#47A248" className={className}>
    <path d="M12 1.5C11.6 1.7 4 7.5 4 14.5c0 4.5 3.5 8 8 8s8-3.5 8-8c0-7-7.6-12.8-8-13zm.5 19.4v-4.1c1.8-.3 3.1-1.9 3.1-3.8 0-1.2-.5-2.3-1.4-3l-1.7 4.5v-7c1.7 1.3 3.5 3.7 3.5 6.9 0 3.3-2.3 6-5.5 6.5z" />
  </svg>
);

// Official Docker Logo (Whale with containers)
export const DockerIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className={className}>
    <path d="M13 3h2v2h-2V3zm-3 0h2v2h-2V3zm6 3h2v2h-2V6zm-3 0h2v2h-2V6zm-3 0h2v2h-2V6zm-3 0h2v2H7V6zm9 3h2v2h-2V9zm-3 0h2v2h-2V9zm-3 0h2v2h-2V9zm-3 0h2v2H7V9zm-3 0h2v2H4V9zm18.5 2.5c-.3-.2-1.3-.3-2.1.2-.2-.7-.7-1.3-1.4-1.7l-.5-.3-.4.4c-.6.6-.9 1.4-.9 2.2 0 .4.1.8.3 1.2-1.1.6-2.6.9-4.5.9H2.5c-.3 0-.5.2-.5.5 0 2.2.9 4.3 2.5 5.8 1.8 1.7 4.3 2.6 7.5 2.6 6.3 0 10.5-3.6 11.5-8.5.6-.2 1.2-.7 1.5-1.3l.2-.5-.7-.5z" />
  </svg>
);

// Java & PHP exports
export const JavaIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#EA2D2E" className={className}>
    <path d="M8.8 16.5c-2.3.2-4.1.7-4.1 1.3 0 .8 3.2 1.4 7.2 1.4s7.2-.6 7.2-1.4c0-.6-1.8-1.1-4.1-1.3l.5 1.1c1.8.2 3.1.6 3.1 1 0 .6-2.9 1-6.7 1s-6.7-.4-6.7-1c0-.4 1.3-.8 3.1-1l.5-1.1zm2.9-4.2c1.3.8 2.6 2.1 2.6 3.5 0 .2 0 .4-.1.6-1.5-.1-2.9-.6-3.8-1.4-.8-.7-1.1-1.6-.9-2.5.7-.2 1.5-.2 2.2-.2zm-1.8-3.7c.8 1 1.7 2.1 1.7 3.5 0 .4-.1.8-.2 1.2-1.4-.2-2.7-.9-3.3-2-.5-.9-.5-1.8 0-2.6.5-.2 1.2-.2 1.8-.1zM14 2c-.6 1.8-2 3.5-3.4 5-1.2 1.3-2.3 2.7-2.6 4.3-.2 1 .1 1.9.7 2.7.7.8 1.7 1.3 2.9 1.5-.3.8-.8 1.5-1.5 2.1-1.1.9-2.6 1.3-4.1 1.4l-.5 1.1c1.9-.1 3.7-.6 5.1-1.6 1-.7 1.8-1.7 2.2-2.8 1.4-.3 2.6-1 3.4-2.1.9-1.2 1.2-2.6.9-4-.4-1.7-1.8-3.3-3-4.8C13.2 3.5 14 2 14 2z" />
  </svg>
);

export const PhpIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#777BB4" className={className}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-4.8 13.5H5.8L7.2 8.5h2.5c1.4 0 2.3.8 2 2.2-.3 1.5-1.5 2.8-2.9 2.8H7.9l-.7 2zm6.2 0h-1.4l1.4-7h2.5c1.4 0 2.3.8 2 2.2-.3 1.5-1.5 2.8-2.9 2.8h-1l-.6 2zm4.1-4.2c.2-1.1-.3-1.6-1.3-1.6H15l-.6 3.2h1.2c1.1 0 1.7-.6 1.9-1.6zm-6.2 0c.2-1.1-.3-1.6-1.3-1.6H8.8l-.6 3.2h1.2c1.1 0 1.7-.6 1.9-1.6z" />
  </svg>
);
