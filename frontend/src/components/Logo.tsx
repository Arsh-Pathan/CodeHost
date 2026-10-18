"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export const Logo = ({ className = "w-9 h-9" }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 1024 1024"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            strokeWidth="70"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <defs>
                <linearGradient id="codehost-logo-a" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4d9dff" />
                    <stop offset="100%" stopColor="#2e6fe5" />
                </linearGradient>
                <linearGradient id="codehost-logo-b" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#124bb3" />
                    <stop offset="100%" stopColor="#0a3280" />
                </linearGradient>
                <linearGradient id="codehost-logo-c" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#08245c" />
                    <stop offset="100%" stopColor="#051433" />
                </linearGradient>
            </defs>
            <polygon
                points="512,520 820,730 512,920 204,730"
                fill="url(#codehost-logo-c)"
                stroke="url(#codehost-logo-c)"
            />
            <polygon
                points="512,320 820,530 512,720 204,530"
                fill="url(#codehost-logo-b)"
                stroke="url(#codehost-logo-b)"
            />
            <polygon
                points="512,120 820,320 512,520 204,320"
                fill="url(#codehost-logo-a)"
                stroke="url(#codehost-logo-a)"
            />
        </svg>
    );
};

interface LogoWithTextProps {
    className?: string;
    href?: string;
    asLink?: boolean;
}

export const LogoWithText = ({
    className = "",
    href,
    asLink = true
}: LogoWithTextProps) => {
    const [destination, setDestination] = useState<string>(href || "/");

    useEffect(() => {
        if (!href && typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) {
                setDestination("/dashboard");
            } else {
                setDestination("/");
            }
        }
    }, [href]);

    const inner = (
        <div className={`flex items-center gap-2.5 cursor-pointer transition-opacity hover:opacity-90 select-none ${className}`}>
            <Logo className="w-9 h-9 shrink-0" />
            <span className="text-2xl font-black tracking-tight text-[#0F172A]">
                Code<span className="text-[#4D96FF]">Host</span>
            </span>
        </div>
    );

    if (!asLink) {
        return inner;
    }

    return (
        <Link href={destination} className="inline-flex items-center text-inherit no-underline">
            {inner}
        </Link>
    );
};