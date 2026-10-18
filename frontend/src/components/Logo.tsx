"use client";

import React, { useEffect, useState, useId } from "react";
import Link from "next/link";

export const LogoSvg = ({ className = "w-9 h-9" }: { className?: string }) => {
    const rawId = useId();
    const id = rawId.replace(/[^a-zA-Z0-9]/g, "");

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
                <linearGradient id={`ch-grad-a-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4d9dff" />
                    <stop offset="100%" stopColor="#2e6fe5" />
                </linearGradient>
                <linearGradient id={`ch-grad-b-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#124bb3" />
                    <stop offset="100%" stopColor="#0a3280" />
                </linearGradient>
                <linearGradient id={`ch-grad-c-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#08245c" />
                    <stop offset="100%" stopColor="#051433" />
                </linearGradient>
            </defs>
            <polygon
                points="512,520 820,730 512,920 204,730"
                fill={`url(#ch-grad-c-${id})`}
                stroke={`url(#ch-grad-c-${id})`}
            />
            <polygon
                points="512,320 820,530 512,720 204,530"
                fill={`url(#ch-grad-b-${id})`}
                stroke={`url(#ch-grad-b-${id})`}
            />
            <polygon
                points="512,120 820,320 512,520 204,320"
                fill={`url(#ch-grad-a-${id})`}
                stroke={`url(#ch-grad-a-${id})`}
            />
        </svg>
    );
};

export const Logo = ({ className = "w-9 h-9" }: { className?: string }) => {
    return (
        <img
            src="/logo.svg"
            alt="Code Host"
            className={`${className} inline-block shrink-0 select-none object-contain`}
            loading="eager"
            decoding="sync"
        />
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
                Code<span className="text-brand-gradient">Host</span>
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