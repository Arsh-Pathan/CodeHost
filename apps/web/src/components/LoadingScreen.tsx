"use client";

import React, { useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { gsap } from 'gsap';

export const LoadingScreen = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Create a timeline for the loading animation
      const tl = gsap.timeline();

      tl.from(logoRef.current, {
        scale: 0.5,
        opacity: 0,
        rotate: -45,
        duration: 0.8,
        ease: "back.out(1.7)"
      })
      .to(logoRef.current, {
        y: -10,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      // After 2.5 seconds, fade out the loading screen
      gsap.to(containerRef.current, {
        opacity: 0,
        delay: 2.2,
        duration: 0.8,
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-2xl"
    >
      <div ref={logoRef} className="relative flex flex-col items-center">
        <Logo className="w-24 h-24 mb-6 shadow-2xl shadow-blue-500/20" />
        <div className="flex items-center space-x-1">
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
