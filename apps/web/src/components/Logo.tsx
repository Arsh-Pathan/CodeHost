import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Left - Creamy Red */}
      <path 
        d="M512 0L148 210V440L512 650L512 0Z" 
        fill="#FF6B6B" 
      />
      {/* Top Right - Creamy Yellow */}
      <path 
        d="M512 0L876 210V440L512 650L512 0Z" 
        fill="#FFD93D" 
      />
      {/* Bottom Left - Creamy Cyan */}
      <path 
        d="M148 460V790L512 1000L512 670L148 460Z" 
        fill="#6BCBCA" 
      />
      {/* Bottom Right - Creamy Blue */}
      <path 
        d="M876 460V790L512 1000L512 670L876 460Z" 
        fill="#4D96FF" 
      />
    </svg>
  );
};

export const LogoWithText = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <Logo className="w-9 h-9" />
      <span className="text-2xl font-black tracking-tight text-[#0F172A]">
        Code<span className="text-[#4D96FF]">Host</span>
      </span>
    </div>
  );
};
