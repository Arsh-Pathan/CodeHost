import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

export const NextjsIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <circle cx="12" cy="12" r="12" fill="#000000" />
    <path
      d="M18.8 19.3L9.6 7.5H7.5V16.5H9.1V10.2L17.2 20.4C17.7 20.1 18.3 19.7 18.8 19.3Z"
      fill="url(#nextjs_grad)"
    />
    <rect x="14.9" y="7.5" width="1.6" height="9" fill="url(#nextjs_grad2)" />
    <defs>
      <linearGradient id="nextjs_grad" x1="12.5" y1="11.5" x2="19" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="nextjs_grad2" x1="15.7" y1="7.5" x2="15.7" y2="14.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0.2" />
      </linearGradient>
    </defs>
  </svg>
);

export const ReactIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="-11.5 -10.23174 23 20.46348" fill="none" className={className} {...props}>
    <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
    <g stroke="#61DAFB" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
);

export const VueIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path d="M2 3h4.4L12 12.8 17.6 3H22L12 20.5 2 3z" fill="#42B883" />
    <path d="M6.5 3h3.8L12 6.5 13.7 3h3.8L12 12 6.5 3z" fill="#35495E" />
  </svg>
);

export const SvelteIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M19.9 6.8c-.8-1.7-2.3-3.1-4.2-3.8-2.6-1-5.7-.7-8.1.8-1.5 1-2.6 2.5-3 4.2-.4 1.8-.1 3.7.8 5.2.8 1.4 2.1 2.5 3.6 3.2.4.2.9.3 1.3.4l-.8 1.4c-.4.7-.9 1.4-1.6 1.8-.7.5-1.5.7-2.4.7-.6 0-1.2-.1-1.7-.4-.8-.4-1.4-1.1-1.7-1.9-.3-.8-.3-1.8 0-2.6.2-.5.5-.9.9-1.2l-1.3-1.6c-.7.6-1.2 1.3-1.5 2.2-.5 1.3-.5 2.8 0 4.1.5 1.3 1.5 2.4 2.8 3.1.9.5 2 .7 3 .7 1.4 0 2.8-.5 3.9-1.3 1.2-.9 2.1-2.1 2.7-3.4.6-1.3.7-2.7.3-4.1-.3-1.1-1-2-1.9-2.7l.6-1c.4-.7.9-1.3 1.6-1.7.7-.4 1.5-.7 2.3-.6.6 0 1.2.2 1.7.5.8.5 1.3 1.2 1.6 2.1.2.9.1 1.8-.2 2.6-.2.4-.4.8-.8 1.1l1.4 1.5c.7-.6 1.2-1.4 1.5-2.2.5-1.3.5-2.8 0-4.1-.4-1.3-1.3-2.4-2.5-3.1z"
      fill="#FF3E00"
    />
  </svg>
);

export const AstroIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M8.5 17.5c-.3 1.1-.9 2-1.7 2.7-.4.3-.8.6-1.3.8 2.2 1.2 4.9 1.2 7.1 0-.5-.2-.9-.5-1.3-.8-.8-.7-1.4-1.6-1.7-2.7h-1.1z"
      fill="#FF5D01"
    />
    <path
      d="M17.8 7.3c-.6-.7-1.4-1.3-2.3-1.8-.6 1.1-1.6 2-2.7 2.6-.5.3-1.1.5-1.7.6l.8-4.9c-.8.1-1.6.3-2.3.6L7.3 14.8c.8-.3 1.7-.5 2.6-.5.7 0 1.4.1 2.1.4.6-.3 1.3-.5 2-.5 1 0 1.9.2 2.8.6l1-7.5zm-5.7 5c-.7 0-1.3-.3-1.7-.7l1.3-3.6c.7.4 1.2 1 1.4 1.7.2.7 0 1.5-.4 2.1-.2.3-.4.5-.6.5z"
      fill="#BC52EE"
    />
  </svg>
);

export const NodejsIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M12 2l9 5.2v10.4L12 22.8 3 17.6V7.2L12 2zm0 2.3L4.9 8.3v7.4L12 19.7l7.1-4.1V8.3L12 4.3z"
      fill="#5FA04E"
    />
    <path
      d="M12 7.5a4.5 4.5 0 0 1 4.5 4.5c0 2.4-1.9 4.3-4.3 4.5h-.4c-2.4 0-4.3-1.9-4.3-4.3 0-1.8 1.1-3.4 2.8-4.1l.9 1.6c-1 .4-1.7 1.4-1.7 2.5 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-1.2-.8-2.2-2-2.5V7.5z"
      fill="#339933"
    />
  </svg>
);

export const PythonIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M11.9 2c-3.1 0-2.9 1.3-2.9 1.3l.1 1.4h3v.4H6.8S4 4.8 4 8c0 3.1 2.4 3 2.4 3h1.4v-2c0-1.5 1.3-2.8 2.8-2.8h4.3c1.2 0 2.2-.9 2.2-2.2V4.8S17 2 11.9 2zM9.5 3.6a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4z"
      fill="#3776AB"
    />
    <path
      d="M12.1 22c3.1 0 2.9-1.3 2.9-1.3l-.1-1.4h-3v-.4h5.3s2.8.3 2.8-2.9c0-3.1-2.4-3-2.4-3h-1.4v2c0 1.5-1.3 2.8-2.8 2.8H9.1c-1.2 0-2.2.9-2.2 2.2v1.2s.1 2.8 5.2 2.8zm2.4-1.6a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4z"
      fill="#FFD438"
    />
  </svg>
);

export const FastAPIIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <circle cx="12" cy="12" r="11" fill="#009688" />
    <path d="M12.8 3L6.5 13.5h4.8L9.8 21l8.2-11.5h-5.2l2-6.5h-2z" fill="#FFFFFF" />
  </svg>
);

export const DjangoIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <rect width="24" height="24" rx="6" fill="#092E20" />
    <path
      d="M13.2 4.5h2.4v9.8c-.4.1-.9.2-1.4.2-2.4 0-3.8-1.2-3.8-3.4 0-2.1 1.3-3.6 3.2-3.6.6 0 1.1.1 1.4.3l-.2 1.7c-.3-.2-.7-.3-1.1-.3-1 0-1.6.7-1.6 1.8 0 1.1.6 1.8 1.6 1.8.3 0 .6 0 .9-.1V4.5zM7.5 7.5h2.4v1.8H7.5v-1.8zm0 3.3h2.4V20c-.8.2-1.6.3-2.4.3V10.8z"
      fill="#FFFFFF"
    />
  </svg>
);

export const FlaskIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M10 3h4v3.2l4.8 9.6c.8 1.6-.3 3.5-2.1 3.5H7.3c-1.8 0-2.9-1.9-2.1-3.5L10 6.2V3z"
      stroke="#1E293B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8.5 15h7M9 3h6" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
    <circle cx="11" cy="13" r="1" fill="#3B82F6" />
    <circle cx="13.5" cy="15.5" r="1" fill="#3B82F6" />
  </svg>
);

export const GoIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M3 10.5h4.2c-.3 1.1-.9 2-1.8 2.6-.9.6-2 .7-3.1.2-.8-.4-1.4-1.2-1.7-2-.3-.8-.3-1.8 0-2.6.3-.9.9-1.6 1.8-2 1.1-.5 2.3-.4 3.3.3l1.2-1.2C5.6 4.7 4 4.7 2.6 5.4 1.2 6.2.3 7.6.1 9.2c-.3 1.6.2 3.2 1.3 4.4 1.1 1.1 2.7 1.7 4.3 1.5 1.5-.2 2.8-1 3.6-2.3.8-1.2 1-2.7.6-4.1H3v1.8zm14.5-5.2c-1.7 0-3.3.8-4.3 2.1-1 1.4-1.3 3.1-.8 4.7.4 1.6 1.6 2.9 3.2 3.4 1.6.5 3.3.1 4.5-1 1.2-1.1 1.8-2.7 1.6-4.3-.2-1.6-1.2-3.1-2.7-3.9-.5-.4-1-.7-1.5-.7zm.2 1.8c.9 0 1.7.5 2.2 1.3.5.8.6 1.7.3 2.6-.3.9-.9 1.6-1.8 1.9-.9.3-1.8.1-2.5-.5-.7-.6-1-1.5-.9-2.4 0-.9.6-1.8 1.4-2.3.4-.4.8-.6 1.3-.6z"
      fill="#00ADD8"
    />
  </svg>
);

export const RustIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm2.8 14.8l-1.9-2.7h-1.8v2.7H9.2V7.2h3.9c1.9 0 3.2 1.1 3.2 2.8 0 1.3-.8 2.2-1.9 2.6l2.3 3.2h-1.9zm-3.7-4.4h1.9c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3h-1.9v2.6z"
      fill="#CE422B"
    />
    <circle cx="12" cy="12" r="9" stroke="#000000" strokeWidth="1" fill="none" />
  </svg>
);

export const JavaIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M9.8 16.5c-2.4.2-4.5-.4-4.8-.5-.3-.1-.3-.3-.1-.4.7-.4 2.3-.7 4.2-.6 2.3.1 3.8.7 3.9.9.1.1 0 .3-.3.4-.8.2-1.8.3-2.9.2zm-.7 2.2c-3.1.2-5.7-.5-6.1-.7-.4-.2-.3-.4-.1-.5.9-.6 3-.9 5.4-.8 2.9.1 4.9.9 5 .1.1.2-.1.4-.4.5-1 .3-2.4.5-3.8.4zm6.6-4.8c.4-.7.6-1.5.5-2.3-.2-1.2-1.1-2.2-2.3-2.6-1-.3-1.9-.3-2.8-.1.9-.5 2-.8 3.1-.6 1.4.3 2.5 1.4 2.8 2.8.2 1.1-.1 2-.8 2.8h-.5zM8.3 7.9c-.8 1.4-.3 2.9.7 4.2.7.9 1.5 1.8 1.6 2.9-.6-.8-1.2-1.6-1.8-2.4-1-1.3-1.4-2.9-.5-4.7z"
      fill="#EA2D2E"
    />
    <path
      d="M13.8 2.5c.3 1.1-.3 2.3-.9 3.2-.6 1-1.3 1.9-1.4 3.1.6-.9 1.2-1.7 1.8-2.6.8-1.1 1.2-2.4.5-3.7z"
      fill="#5382A1"
    />
  </svg>
);

export const SpringIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M21.2 13.5c-1-1.1-2.4-1.9-3.9-2.2-2.1-.5-4.3-.2-6.2.7l-4.7 2.3c-.6.3-1.2.7-1.8 1.2-.9.8-1.5 1.8-1.8 2.9-.4 1.4-.2 2.9.4 4.2.3.6.7 1.1 1.2 1.6 1.5 1.4 3.6 2 5.6 1.6 2-.4 3.8-1.6 5-3.2l5.7-8.1c.5-.7.7-1.5.5-2.3V11c-.3.9-.9 1.7-1.7 2.2l-5.6 3.8c-.8.5-1.8.8-2.8.7-1 0-1.9-.5-2.5-1.2-.7-.8-.9-1.8-.7-2.8.2-1 .9-1.8 1.7-2.3l6.5-3.6c1.6-.8 3.4-1 5.2-.6 1.7.4 3.2 1.5 4.1 3-.3.4-.6.7-.8 1.1z"
      fill="#6DB33F"
    />
  </svg>
);

export const PhpIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <ellipse cx="12" cy="12" rx="11" ry="7.5" fill="#777BB4" />
    <path
      d="M6.2 14.5l.8-4.8h2.3c1 0 1.7.2 2 .7.3.5.3 1.1.1 1.8-.3 1.1-.9 1.7-1.6 2-.6.3-1.4.3-2.3.3H6.2zm1.4-2.8h1.1c.5 0 .9-.1 1.2-.3.3-.2.4-.5.5-.9 0-.4 0-.6-.2-.8-.2-.2-.5-.2-.9-.2H8.3l-.7 2.2zm5.7 2.8l.8-4.8h1.4l-.3 1.7c.3-.6.7-1.1 1.2-1.4.5-.3 1.1-.4 1.7-.4v1.5c-.7 0-1.3.2-1.7.6-.4.4-.7 1-.8 1.7l-.5 2.6h-1.8z"
      fill="#FFFFFF"
    />
  </svg>
);

export const LaravelIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path
      d="M8.5 4.5l7 4v3.5l-7-4v-3.5zm7 5.5l5 2.8v3.5l-5-2.8V10zm-7 2.5l7 4v3.5l-7-4v-3.5zm-5 2.8l5 2.8v3.5l-5-2.8v-3.5zm7 4l5 2.8v3.5l-5-2.8v-3.5z"
      fill="#FF2D20"
    />
  </svg>
);

export const RubyIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M19.5 7.8L16.2 2H7.8L4.5 7.8l7.5 14.2 7.5-14.2zM7.2 3.5h9.6l2.4 4.3H4.8l2.4-4.3zm4.8 15.3L6.3 8.8h11.4L12 18.8z"
      fill="#CC0000"
    />
  </svg>
);

export const DotNetIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <rect width="24" height="24" rx="6" fill="#512BD4" />
    <path
      d="M6 16.5V7.5h1.8l3.6 5.8V7.5h1.8v9h-1.6L7.8 10.4v6.1H6zm9.8.3c-.6 0-1.1-.2-1.5-.6-.4-.4-.6-.9-.6-1.6 0-.7.2-1.2.6-1.6.4-.4.9-.6 1.5-.6s1.1.2 1.5.6c.4.4.6.9.6 1.6 0 .7-.2 1.2-.6 1.6-.4.4-.9.6-1.5.6z"
      fill="#FFFFFF"
    />
  </svg>
);

export const BunIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <ellipse cx="12" cy="13.5" rx="9" ry="7" fill="#FBF0DF" stroke="#D9A86C" strokeWidth="1.2" />
    <path d="M7 13c0 1 .5 1.8 1.5 1.8S10 14 10 13M14 13c0 1 .5 1.8 1.5 1.8s1.5-.8 1.5-1.8" stroke="#3D291D" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="6.5" cy="14" r="1.2" fill="#F8A5A5" opacity="0.6" />
    <circle cx="17.5" cy="14" r="1.2" fill="#F8A5A5" opacity="0.6" />
    <path d="M12 6.5c-1 0-1.8.8-1.8 1.8 0 .5.2.9.5 1.2-.8.2-1.5.7-1.9 1.5h6.4c-.4-.8-1.1-1.3-1.9-1.5.3-.3.5-.7.5-1.2 0-1-.8-1.8-1.8-1.8z" fill="#D9A86C" />
  </svg>
);

export const DenoIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <circle cx="12" cy="12" r="11" fill="#000000" />
    <path
      d="M12 4a8 8 0 0 0-8 8c0 4.4 3.6 8 8 8s8-3.6 8-8a8 8 0 0 0-8-8zm-1.5 4.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zm3.8 8.7c-1.3.8-2.8 1-4.3.6-.9-.3-1.7-.8-2.3-1.5l1.3-1.1c.4.5 1 .8 1.6 1 .9.3 1.9.1 2.6-.4.7-.5 1.1-1.3 1-2.2-.1-.8-.6-1.5-1.3-1.9l-1.5-.8c-1.3-.7-2.1-2-2-3.4.1-1.3.9-2.5 2.1-3.1 1.2-.6 2.6-.6 3.8-.1.8.4 1.5 1 2 1.7l-1.3 1.1c-.4-.5-.9-.9-1.4-1.1-.8-.3-1.6-.3-2.4.1-.7.4-1.1 1.1-1.1 1.8 0 .7.4 1.4 1.1 1.8l1.5.8c1.5.8 2.4 2.2 2.3 3.8 0 1.3-.8 2.5-1.9 3.2z"
      fill="#FFFFFF"
    />
  </svg>
);

export const PostgresIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M12 2C6.5 2 2 6.5 2 12c0 2.2.7 4.2 2 5.9V21l3.5-1.5c1.4.7 3 1.1 4.5 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2zm1 14.5c-.8.8-1.9 1.2-3 1.2-1.3 0-2.5-.5-3.4-1.4l1.4-1.4c.5.5 1.2.8 2 .8.6 0 1.2-.2 1.6-.7.4-.4.6-1 .6-1.6 0-.8-.4-1.5-1.1-1.9L9 10.5C7.6 9.8 6.8 8.4 6.8 6.9c0-1.2.5-2.4 1.4-3.2C9.1 2.9 10.3 2.5 11.6 2.5c1.2 0 2.3.4 3.1 1.2l-1.3 1.5c-.5-.5-1.1-.8-1.8-.8-.6 0-1.1.2-1.5.6-.4.4-.6.9-.6 1.4 0 .8.4 1.4 1.1 1.8l1.5.8c1.5.8 2.4 2.2 2.4 3.8 0 1.4-.6 2.7-1.5 3.7z"
      fill="#336791"
    />
  </svg>
);

export const RedisIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#DC382D" />
    <path d="M2 12l10 5 10-5-1.5-.75L12 15.5 3.5 11.25 2 12z" fill="#B7281E" />
    <path d="M2 17l10 5 10-5-1.5-.75L12 20.5 3.5 16.25 2 17z" fill="#911F17" />
  </svg>
);

export const MongoIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M12 2c-.3 0-.6.1-.8.2C9.5 3.5 4.8 8.1 5 14.5c.2 5.1 3.5 8.1 6.3 9.4.4.2.9.2 1.3 0 2.9-1.3 6.2-4.3 6.4-9.4.2-6.4-4.5-11-6.2-12.3-.2-.1-.5-.2-.8-.2zm-.1 3.2c1.7 1.8 4.2 5.4 4 9.6-.2 3.6-2.4 6-4 7.1V5.2z"
      fill="#47A248"
    />
  </svg>
);

export const DockerIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...props}>
    <path
      d="M22.5 10.3c-.4-.3-1.3-.4-2-.1-.3-.7-.9-1.3-1.6-1.6l-.6-.2-.3.6c-.3.7-.4 1.5-.1 2.3-.6.4-1.6.5-2.6.4H1c-.3 1.2-.2 2.5.3 3.6 1.4 3.1 4.5 5 8 4.9 6.2 0 11.3-4.1 12.5-10.1l.1-.6-.4.4zm-14.8-1h1.8v1.8H7.7V9.3zm2.5 0H12v1.8h-1.8V9.3zm2.5 0h1.8v1.8h-1.8V9.3zm-5-2.5H9.5v1.8H7.7V6.8zm2.5 0H12v1.8h-1.8V6.8zm2.5 0h1.8v1.8h-1.8V6.8zm2.5 0h1.8v1.8h-1.8V6.8zm-5-2.5H12v1.8h-1.8V4.3z"
      fill="#2496ED"
    />
  </svg>
);
