import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left part: < - Red */}
      <path 
        d="M245.5 289L90 444.5L245.5 600L356.5 600L250.5 494H360V395H250.5L356.5 289H245.5Z" 
        fill="#EA4335" 
      />
      <path 
        d="M250.5 494L360 603.5H250.5L246 599V498.5L250.5 494Z" 
        fill="#B31412" 
        fillOpacity="0.2"
      />

      {/* Middle part: / - Yellow/Orange */}
      <path 
        d="M578.5 204.5L392.5 819.5H485L671 204.5H578.5Z" 
        fill="#FBBC04" 
      />

      {/* Right part: > - Teal/Cyan */}
      <path 
        d="M778.5 289L934 444.5L778.5 600L667.5 600L773.5 494H664V395H773.5L667.5 289H778.5Z" 
        fill="#26A69A" 
      />
      <path 
        d="M773.5 494L664 603.5H773.5L778 599V498.5L773.5 494Z" 
        fill="#00695C" 
        fillOpacity="0.2"
      />
    </svg>
  );
};

export const LogoWithText = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Logo className="w-8 h-8" />
      <span className="text-xl font-black tracking-tight text-slate-900">
        Code<span className="text-blue-600">Host</span>
      </span>
    </div>
  );
};
