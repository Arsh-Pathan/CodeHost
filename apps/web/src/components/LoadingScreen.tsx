"use client";

import React, { useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { gsap } from 'gsap';

export const LoadingScreen = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Initial state: Blurry and small
      gsap.set([logoRef.current, textRef.current], { 
        filter: "blur(20px)", 
        opacity: 0,
        scale: 0.8 
      });

      tl.to([logoRef.current, textRef.current], {
        filter: "blur(0px)",
        opacity: 1,
        scale: 1,
        duration: 1.2,
        ease: "power3.out",
        stagger: 0.2
      })
      .to(logoRef.current, {
        y: -10,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      // Exit animation
      gsap.to(containerRef.current, {
        opacity: 0,
        filter: "blur(30px)",
        delay: 2.2,
        duration: 1,
        pointerEvents: "none",
        ease: "power2.inOut",
        onComplete: () => {
          if (containerRef.current) containerRef.current.style.display = "none";
        }
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
    >
      <div className="flex items-center space-x-6">
        <div ref={logoRef}>
            <Logo className="w-24 h-24 drop-shadow-2xl" />
        </div>
        <div ref={textRef} className="text-6xl font-black tracking-tighter text-[#0F172A]">
           Code<span className="text-[#4D96FF]">Host</span>
        </div>
      </div>
      
      <div className="mt-12 flex items-center space-x-2">
        {[0, 1, 2].map((i) => (
          <div 
            key={i}
            className="w-2 h-2 rounded-full bg-[#4D96FF]/30 animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
};
