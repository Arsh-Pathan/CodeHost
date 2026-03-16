import React from "react";

export const Logo = ({ className = "w-9 h-9" }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 1024 1024"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            strokeWidth="70"
            strokeLinecap="round"
            strokeLinejoin="round"
        >

            <polygon
                points="512,520 820,730 512,920 204,730"
                stroke="#4D96FF"
                fill="#ffffff"
            />
            <polygon
                points="512,320 820,530 512,720 204,530"
                stroke="#4D96FF"
                fill="#ffffff"
            />
            <polygon
                points="512,120 820,320 512,520 204,320"
                stroke="#4D96FF"
                fill="#ffffff"
            />


        </svg>
    );
};

export const LogoWithText = ({ className = "" }: { className?: string }) => {
    return (
        <div className={`flex items-center ${className}`}>
            <Logo className="w-9 h-9" />
            <span className="text-2xl font-black tracking-tight text-[#0F172A]">
        Code<span className="text-[#4D96FF]">Host</span>
      </span>
        </div>
    );
};