"use client";

import React, { useEffect, useRef, useState } from "react";
import Lenis from "lenis";

interface SmoothMotionProviderProps {
  children: React.ReactNode;
}

/**
 * Checks if the user is on a mobile device, a touch screen,
 * a low-spec CPU/GPU, or has prefers-reduced-motion enabled.
 */
function isLowEndOrMobile(): boolean {
  if (typeof window === "undefined") return true;

  // 1. Mobile screen breakpoint
  if (window.innerWidth < 768) return true;

  // 2. Primary coarse pointer (phones, tablets, touch-only laptops)
  const isTouchPrimary =
    window.matchMedia("(pointer: coarse)").matches ||
    ("ontouchstart" in window && navigator.maxTouchPoints > 1);
  if (isTouchPrimary) return true;

  // 3. User requested reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;

  // 4. Low CPU core count (<= 4 cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
    return true;
  }

  // 5. Low device memory (< 4GB RAM)
  const navAny = navigator as any;
  if (navAny.deviceMemory && navAny.deviceMemory < 4) {
    return true;
  }

  return false;
}

export function SmoothMotionProvider({ children }: SmoothMotionProviderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    // Check hardware & viewport eligibility
    const disabled = isLowEndOrMobile();
    if (disabled) {
      setMotionEnabled(false);
      return;
    }

    setMotionEnabled(true);

    let lenis: Lenis | null = null;
    let rafId: number | null = null;
    let currentBlur = 0;
    let targetBlur = 0;
    let isScrolling = false;
    let scrollTimeout: any = null;

    try {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1,
      });

      // Update target blur based on scroll velocity
      lenis.on("scroll", (e: any) => {
        isScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, 120);

        const velocity = Math.abs(e.velocity || 0);
        // Subtle cinematic motion blur: max 1.5px so it feels natural and never dizzying
        targetBlur = Math.min(1.5, velocity * 0.035);
      });

      // Main RAF loop for Lenis + smooth blur interpolation
      const raf = (time: number) => {
        if (lenis) {
          lenis.raf(time);
        }

        const targetEl = document.getElementById("smooth-motion-target") || contentRef.current;

        // Smoothly interpolate blur toward target (and decay when stationary)
        if (targetEl) {
          if (!isScrolling) {
            targetBlur *= 0.82;
          }

          currentBlur += (targetBlur - currentBlur) * 0.2;

          if (currentBlur > 0.08) {
            targetEl.style.filter = `blur(${currentBlur.toFixed(2)}px)`;
            targetEl.style.willChange = "filter";
          } else {
            if (targetEl.style.filter !== "none") {
              targetEl.style.filter = "none";
              targetEl.style.willChange = "auto";
            }
          }
        }

        rafId = requestAnimationFrame(raf);
      };

      rafId = requestAnimationFrame(raf);
    } catch {
      // Fallback gracefully to native scroll
      setMotionEnabled(false);
    }

    // Cleanup on unmount or window resize
    const handleResize = () => {
      if (isLowEndOrMobile() && lenis) {
        lenis.destroy();
        lenis = null;
        setMotionEnabled(false);
        const targetEl = document.getElementById("smooth-motion-target") || contentRef.current;
        if (targetEl) {
          targetEl.style.filter = "none";
          targetEl.style.willChange = "auto";
        }
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(scrollTimeout);
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
      const targetEl = document.getElementById("smooth-motion-target") || contentRef.current;
      if (targetEl) {
        targetEl.style.filter = "none";
        targetEl.style.willChange = "auto";
      }
    };
  }, []);

  return (
    <div
      ref={contentRef}
      id="smooth-motion-wrapper"
      className="relative min-h-screen"
    >
      {children}
    </div>
  );
}

