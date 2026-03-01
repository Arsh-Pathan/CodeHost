import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Left Segment - Red */}
      <path 
        d="M512 0L128 221.4V442.8L512 664.2L512 0Z" 
        fill="#E53935" 
      />
      {/* Top Right Segment - Yellow */}
      <path 
        d="M512 0L896 221.4V442.8L512 664.2L512 0Z" 
        fill="#FFB300" 
      />
      {/* Bottom Left Segment - Teal */}
      <path 
        d="M128 442.8V802.6L512 1024L512 664.2L128 442.8Z" 
        fill="#00BFA5" 
      />
      {/* Bottom Right Segment - Blue */}
      <path 
        d="M896 442.8V802.6L512 1024L512 664.2L896 442.8Z" 
        fill="#2563EB" 
      />
    </svg>
  );
};

export const LogoWithText = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Logo className="w-9 h-9" />
      <span className="text-2xl font-black tracking-tight text-[#0F172A]">
        Code<span className="text-[#2563EB]">Host</span>
      </span>
    </div>
  );
};
