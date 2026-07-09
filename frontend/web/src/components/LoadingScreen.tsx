"use client";

import React, { useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { gsap } from 'gsap';

export const LoadingScreen = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const dotsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const logo = logoRef.current;
        const container = containerRef.current;
        const dots = dotsRef.current;
        if (!logo || !container || !dots) return;

        const tl = gsap.timeline();

        tl.to(logo, {
            opacity: 1,
            filter: "blur(0px)",
            scale: 1,
            duration: 1.4,
            ease: "power2.out",
        })
        .to(dots, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
        }, "-=0.8")
        .to(logo, {
            duration: 1.0,
        });

        const dotEls = dots.querySelectorAll(".loading-dot");
        const blink = gsap.timeline({ repeat: -1 });
        dotEls.forEach((dot, i) => {
            blink.to(dot, {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: "power1.inOut",
            }, i * 0.25)
            .to(dot, {
                opacity: 0.3,
                duration: 0.5,
                ease: "power1.inOut",
            }, i * 0.25 + 0.3);
        });

        tl.to(container, {
            opacity: 0,
            filter: "blur(30px)",
            duration: 1,
            ease: "power2.in",
            onComplete: () => {
                container.style.display = "none";
            },
        });

        return () => { tl.kill(); blink.kill(); };
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
        >
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.1]"
                 style={{ backgroundImage: 'radial-gradient(#2563EB 2px, transparent 2px)', backgroundSize: '60px 60px' }} />
            <div
                ref={logoRef}
                className="flex items-center space-x-5"
                style={{ opacity: 0, filter: "blur(24px)", scale: 3 }}
            >
                <Logo className="w-20 h-20 drop-shadow-2xl" />
                <div className="text-5xl font-black tracking-tighter text-[#0F172A]">
                    Code<span className="text-[#4D96FF]">Host</span>
                </div>
            </div>

            <div ref={dotsRef} className="mt-2 flex items-center space-x-3" style={{ opacity: 0 }}>
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="loading-dot w-2.5 h-2.5 rounded-full bg-[#4D96FF]"
                        style={{ opacity: 0.3 }}
                    />
                ))}
            </div>
        </div>
    );
};
