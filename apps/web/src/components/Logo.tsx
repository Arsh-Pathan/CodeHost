import React from 'react';

export const Logo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left Chevron < - Vibrant Red */}
      <path 
        d="M340 280L120 512L340 744H220L0 512L220 280H340Z" 
        fill="#E53935" 
      />
      
      {/* Middle Slash / - Vibrant Orange/Yellow */}
      <path 
        d="M580 200L400 824H480L660 200H580Z" 
        fill="#FFB300" 
      />

      {/* Right Chevron > - Vibrant Teal */}
      <path 
        d="M684 280L904 512L684 744H804L1024 512L804 280H684Z" 
        fill="#00BFA5" 
      />
    </svg>
  );
};

export const LogoWithText = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Logo className="w-8 h-8" />
      <span className="text-2xl font-black tracking-tight text-[#0F172A]">
        Code<span className="text-blue-600">Host</span>
      </span>
    </div>
  );
};
