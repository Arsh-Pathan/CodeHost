"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';
import { 
  ArrowRight, 
  Box, 
  Terminal, 
  Activity,
  Cpu, 
  HardDrive, 
  Globe, 
  Zap, 
  Shield, 
  CheckCircle2, 
  Github, 
  Twitter, 
  Linkedin,
  MessageSquare,
  GitBranch,
  Play,
  Layers,
  Sparkles,
  Server,
  Cloud,
  Check,
  ChevronDown,
  RefreshCw,
  Sliders,
  ExternalLink,
  Code2,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { fetchApi } from '@/lib/api';
import { LoadingScreen } from '@/components/LoadingScreen';

gsap.registerPlugin(ScrollTrigger);

const TechSymbol = ({ children, className, style }: any) => (
  <div className={`absolute select-none pointer-events-none text-slate-200/40 font-mono text-4xl font-bold floating-symbol ${className}`} style={style}>
    {children}
  </div>
);

const SplitText = ({ text, className }: { text: string; className?: string }) => (
  <>
    {text.split("").map((char, i) => (
      <span
        key={i}
        className={`hero-letter inline-block ${className || ""}`}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ))}
  </>
);

export default function Home() {
  const [serverCount, setServerCount] = React.useState(0);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [calcCredits, setCalcCredits] = React.useState<number>(250);
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) setIsLoggedIn(true);
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/stats/public`);
        const data = await response.json();
        setServerCount(data.runningServers || 48);
      } catch (err) {
        setServerCount(48);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    // Hero Entrance
    const ctx = gsap.context(() => {
      // Scroll-driven letter scatter: each letter flies off in a random direction
      // on scroll down, and reassembles when scrolling back up
      document.querySelectorAll(".hero-letter").forEach((letter) => {
        const randX = gsap.utils.random(-200, 200);
        const randY = gsap.utils.random(-150, 150);
        const randRotate = gsap.utils.random(-90, 90);

        gsap.to(letter, {
          x: randX,
          y: randY,
          rotation: randRotate,
          opacity: 0,
          ease: "power2.in",
          scrollTrigger: {
            trigger: ".hero-title",
            start: "top 20%",
            end: "bottom -20%",
            scrub: 1,
          },
        });
      });

      gsap.from(".hero-subtext", {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.3,
        ease: "power3.out"
      });

      gsap.from(".hero-btns", {
        y: 20,
        opacity: 0,
        duration: 1,
        delay: 0.5,
        ease: "power3.out"
      });

      // Dashboard: fade in on scroll
      gsap.from(".dashboard-preview", {
        scrollTrigger: {
          trigger: ".dashboard-preview",
          start: "top 85%",
        },
        y: 60,
        opacity: 0,
        duration: 1.2,
        ease: "power3.out"
      });

      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 75%",
        },
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out"
      });

      // Features section heading
      gsap.from(".features-heading", {
        scrollTrigger: {
          trigger: ".features-heading",
          start: "top 100%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      // Pricing section
      gsap.from(".pricing-heading", {
        scrollTrigger: {
          trigger: ".pricing-heading",
          start: "top 85%",
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      gsap.from(".pricing-card", {
        scrollTrigger: {
          trigger: ".pricing-card",
          start: "top 85%",
        },
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out"
      });

      // Footer
      gsap.from(".footer-content", {
        scrollTrigger: {
          trigger: ".footer-content",
          start: "top 90%",
        },
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

       gsap.to(".floating-symbol", {
         y: "random(-30, 30)",
         x: "random(-20, 20)",
         rotation: "random(-15, 15)",
         duration: "random(3, 5)",
         repeat: -1,
         yoyo: true,
         ease: "sine.inOut",
         stagger: {
           amount: 2,
           from: "random"
         }
       });

       const onMouseMove = (e: MouseEvent) => {
          const { clientX, clientY } = e;
          const xPos = (clientX / window.innerWidth) - 0.5;
          const yPos = (clientY / window.innerHeight) - 0.5;

          gsap.to(".floating-symbol", {
             xPercent: xPos * 20,
             yPercent: yPos * 20,
             duration: 1,
             ease: "power2.out",
             stagger: 0.02
          });
       };

       window.addEventListener("mousemove", onMouseMove);
       return () => window.removeEventListener("mousemove", onMouseMove);
     }, [heroRef]);

     return () => ctx.revert();
   }, []);

   return (
     <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
       <LoadingScreen />

       <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <TechSymbol className="top-[15%] left-[10%] text-[#FF6B6B]/20" style={{ fontSize: '120px' }}>{"{"}</TechSymbol>
          <TechSymbol className="top-[25%] right-[15%] text-[#FFD93D]/20" style={{ fontSize: '80px' }}>{"}"}</TechSymbol>
          <TechSymbol className="bottom-[20%] left-[15%] text-[#6BCBCA]/20" style={{ fontSize: '60px' }}>{"< >"}</TechSymbol>
          <TechSymbol className="bottom-[15%] right-[10%] text-[#4D96FF]/20" style={{ fontSize: '100px' }}>{"/"}</TechSymbol>
          <TechSymbol className="top-[40%] left-[5%] text-[#6BCBCA]/10" style={{ fontSize: '40px' }}>{"const"}</TechSymbol>
          <TechSymbol className="bottom-[35%] right-[5%] text-[#FFD93D]/10" style={{ fontSize: '50px' }}>{"[]"}</TechSymbol>
          <TechSymbol className="top-[60%] right-[20%] text-[#FF6B6B]/10" style={{ fontSize: '30px' }}>{"*"}</TechSymbol>
       </div>

       <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
            style={{ backgroundImage: 'radial-gradient(#2563EB 2px, transparent 2px)', backgroundSize: '60px 60px' }} />

      <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-2xl px-8 py-5 flex items-center justify-between">
        <LogoWithText />
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Features</Link>
          <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Pricing</Link>
          <Link href="/docs" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Docs</Link>
          <Link href="https://discord.gg/gsh2qpEXT4" target="_blank" className="text-sm font-medium text-[#5865F2] hover:text-[#4752C4] transition-colors">Discord</Link>
        </div>
        <div className="flex items-center space-x-3">
          {isLoggedIn ? (
            <Link href="/dashboard" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all">
               Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Login</Link>
              <Link href="/signup" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all">
                 Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header ref={heroRef} className="relative pt-52 md:pt-56 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">

          <h1 className="hero-title text-5xl md:text-8xl font-black tracking-tightest leading-[0.95] max-w-4xl mb-10 text-[#0F172A]">
              <span className="block"><SplitText text="Cloud, Made" /></span>
              <span className="block"><SplitText text="Simple" className="text-[#2563EB]" /></span>
          </h1>

        <p className="hero-subtext text-lg md:text-xl text-slate-500 font-medium max-w-2xl mb-12">
           The simplest cloud platform for students. No Linux, no Docker, no terminals. Just one-click and your project is online.
        </p>

        <div className="hero-btns flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-[#0F172A] text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-2">
             <span>Start Hosting Free</span>
             <ArrowRight size={16} />
          </Link>
          <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center">
             See how it works
          </Link>
        </div>

        {/* Dashboard Preview - Floating mockup with animated glow border */}
        <div className="mt-36 md:mt-44 mb-20 md:mb-28 dashboard-preview relative max-w-5xl mx-auto w-full group">
          <div className="glow-border rounded-[2.5rem]">
            <div className="relative bg-[#F8FAFC] rounded-[2.5rem] border border-white/80 shadow-2xl overflow-hidden p-6">
               <div className="flex items-center space-x-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-[#E53935]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFB300]" />
                  <div className="w-3 h-3 rounded-full bg-[#00BFA5]" />
                  <div className="flex-1" />
                  <div className="px-4 py-1.5 bg-white/40 backdrop-blur rounded-full border border-white text-[10px] font-bold text-slate-400">
                    my-website.code-host.online
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 md:col-span-3 space-y-4">
                     <div className="h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center px-4">
                        <Activity size={14} className="text-blue-500 mr-2" />
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Overview</span>
                     </div>
                     {[
                       { label: "Deployments", icon: <Zap size={14} /> },
                       { label: "Settings", icon: <Shield size={14} /> },
                       { label: "Logs", icon: <Terminal size={14} /> },
                     ].map((item, idx) => (
                       <div key={idx} className="h-12 rounded-2xl bg-white/60 border border-white flex items-center px-4 hover:bg-white/80 transition-colors cursor-pointer">
                          <span className="text-slate-400 mr-2">{item.icon}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                       </div>
                     ))}
                  </div>

                  <div className="col-span-12 md:col-span-9 bg-white rounded-[2rem] p-8 md:p-10 min-h-[450px] shadow-sm relative border border-white/50">
                     <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
                        <div>
                           <h4 className="text-2xl font-black text-[#0F172A]">Your Project</h4>
                           <div className="flex items-center mt-2 space-x-2">
                              <span className="relative flex h-2.5 w-2.5">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Running</p>
                           </div>
                        </div>
                        <div className="flex space-x-3">
                           <button className="px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-black hover:scale-105 active:scale-95 transition-all">Restart</button>
                           <button className="px-5 py-2.5 bg-[#FFEBEE] text-[#E53935] border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-red-100 hover:scale-105 active:scale-95 transition-all">Stop</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                        <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-6 hover:shadow-md transition-shadow">
                           <div className="flex items-center justify-between mb-3">
                              <Cpu size={18} className="text-[#2563EB]" />
                              <span className="text-lg font-black text-[#0F172A]">24%</span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">CPU Usage</p>
                           <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                              <div className="h-full bg-[#2563EB] rounded-full transition-all duration-1000" style={{ width: '24%' }} />
                           </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-6 hover:shadow-md transition-shadow">
                           <div className="flex items-center justify-between mb-3">
                              <HardDrive size={18} className="text-[#8B5CF6]" />
                              <span className="text-lg font-black text-[#0F172A]">68%</span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Memory</p>
                           <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                              <div className="h-full bg-[#8B5CF6] rounded-full transition-all duration-1000" style={{ width: '68%' }} />
                           </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-6 hover:shadow-md transition-shadow">
                           <div className="flex items-center justify-between mb-3">
                              <Activity size={18} className="text-[#00BFA5]" />
                              <span className="text-lg font-black text-[#0F172A]">100%</span>
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Build Progress</p>
                           <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                              <div className="h-full bg-[#00BFA5] rounded-full transition-all duration-1000" style={{ width: '100%' }} />
                           </div>
                        </div>
                     </div>

                     <div className="p-6 bg-[#0F171A] rounded-2xl font-mono text-xs text-blue-400 space-y-1.5 shadow-xl">
                        <p className="opacity-70">&gt; Determining project type...</p>
                        <p className="text-white">&gt; Detected Next.js project</p>
                        <p className="opacity-70">&gt; Building your app...</p>
                        <p className="opacity-70">&gt; npm run build</p>
                        <p className="text-[#00BFA5]">&gt; Deployment Live: coffee.code-host.online</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics & Highlights Bar */}
      <section className="py-12 px-6 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center md:text-left">
            <p className="text-3xl md:text-4xl font-black text-slate-900 mb-1">{serverCount}+</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Containers</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-3xl md:text-4xl font-black text-blue-600 mb-1">&lt;30s</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Deploy Time</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-3xl md:text-4xl font-black text-slate-900 mb-1">99.98%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Uptime Reliability</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-3xl md:text-4xl font-black text-emerald-600 mb-1">0 Lines</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server Config Needed</p>
          </div>
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="py-28 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
            Frictionless Flow
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mt-4">
            How CodeHost works in 3 steps
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto mt-3">
            Go from local code on your laptop to a live, SSL-secured URL on the internet in under a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg mb-6 group-hover:scale-110 transition-transform">
              1
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Connect or Upload</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Link your GitHub repository with one click, or simply drag and drop a project <code className="text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded text-xs">.zip</code> archive directly from your desktop.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg mb-6 group-hover:scale-110 transition-transform">
              2
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Auto-Detect & Build</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Our intelligent builder automatically detects whether you're using Next.js, Python, Go, or a custom Dockerfile, installs dependencies, and compiles the container.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg mb-6 group-hover:scale-110 transition-transform">
              3
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Live with Free SSL</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Your container boots inside an isolated sandbox, automatically wired to our reverse proxy with an instant, secure <code className="text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded text-xs">*.code-host.online</code> domain.
            </p>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION 1: Text Left, Smooth Visual Right (Git Deployments) */}
      <section className="py-28 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-black uppercase tracking-widest">
              <GitBranch size={13} className="text-blue-600" />
              <span>Automated CI/CD Pipeline</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
              Push to GitHub. We handle the rest.
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed text-base">
              Say goodbye to messy manual FTP uploads or manually executing SSH scripts. Simply push code to your repository and CodeHost runs dependency installs, generates optimized production builds, and rolls out updates with zero downtime.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "Automatic builds triggered instantly on push to main",
                "Isolated build sandboxes prevent dependency conflicts",
                "Instant automatic rollback if a runtime healthcheck fails"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Smooth Rounded Visual Frame */}
            <div className="relative rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden bg-slate-900 p-6 md:p-8 text-white transition-all hover:shadow-blue-500/10">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="px-3.5 py-1 rounded-full bg-slate-800 text-[10px] font-mono font-bold text-slate-400 flex items-center space-x-2">
                  <Github size={12} />
                  <span>github.com/developer/webapp:main</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-md">Live</span>
              </div>

              {/* Pipeline Steps Card */}
              <div className="space-y-3.5 font-mono text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                    <span className="text-slate-200 font-semibold">Clone repo & inspect manifest</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">0.4s</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                    <span className="text-slate-200 font-semibold">Install production packages</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">3.6s</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                    <span className="text-slate-200 font-semibold">Turbo build & asset optimization</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">8.1s</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-blue-400">
                  <div className="flex items-center space-x-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="font-semibold text-blue-300">Routing traffic via SSL Reverse Proxy</span>
                  </div>
                  <span className="text-blue-400 font-bold text-[11px]">Active</span>
                </div>
              </div>

              {/* Bottom URL Pill */}
              <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Globe size={14} className="text-emerald-400" />
                  <span className="text-slate-300 font-bold">https://webapp.code-host.online</span>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  HTTP 200 OK
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION 2: Smooth Visual Left, Text Right (Live Telemetry & Logs) */}
      <section className="py-28 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            {/* Smooth Rounded Terminal Frame */}
            <div className="relative rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden bg-[#0B0F19] p-6 md:p-8 font-mono text-xs transition-all hover:shadow-emerald-500/10">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-slate-400 font-bold text-[11px] tracking-wide">
                  Live Container Console (WebSocket)
                </span>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold">Streaming</span>
                </div>
              </div>

              {/* Streaming Output */}
              <div className="space-y-2 text-slate-300 leading-relaxed font-mono">
                <p><span className="text-slate-500">[12:00:01]</span> <span className="text-blue-400">[INIT]</span> Initializing isolated Docker container sandbox...</p>
                <p><span className="text-slate-500">[12:00:02]</span> <span className="text-blue-400">[PORT]</span> Container bound to internal port 3000</p>
                <p><span className="text-slate-500">[12:00:03]</span> <span className="text-emerald-400">[READY]</span> Next.js 16 production server initialized</p>
                <p><span className="text-slate-500">[12:00:04]</span> <span className="text-purple-400">[CERT]</span> Let's Encrypt TLS certificate active (TLS_AES_256_GCM_SHA384)</p>
                <p><span className="text-slate-500">[12:00:05]</span> <span className="text-emerald-400">[HEALTH]</span> Health check passed (200 OK, latency: 1.8ms)</p>
                <p className="text-emerald-300 font-bold"><span className="text-slate-500">[12:00:06]</span> [SERVE] Serving incoming traffic at coffee-shop.code-host.online</p>
              </div>

              {/* Live Metric Strip */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPU Usage</p>
                  <p className="text-base font-black text-blue-400 mt-1">14%</p>
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RAM Allocation</p>
                  <p className="text-base font-black text-purple-400 mt-1">86 MB / 512 MB</p>
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WebSocket Ping</p>
                  <p className="text-base font-black text-emerald-400 mt-1">3 ms</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-black uppercase tracking-widest">
              <Terminal size={13} className="text-emerald-600" />
              <span>Real-Time Observability</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
              Inspect live stdout & stderr without touching SSH.
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed text-base">
              Traditional VPS setups force you to configure SSH keys, open security groups, and remember complicated commands like <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">journalctl -u app -f</code>. CodeHost streams real-time stdout logs right into your browser with zero latency.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "Instant log search, level filtering, and crash highlights",
                "One-click Restart, Pause, and Rebuild buttons",
                "Automated memory leak and crash loop detection alerts"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION 3: Text Left, Smooth Visual Right (Hardened Sandboxes) */}
      <section className="py-28 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black uppercase tracking-widest">
              <Shield size={13} className="text-indigo-600" />
              <span>Guaranteed Container Isolation</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
              Dedicated resources. Zero noisy neighbors.
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed text-base">
              Shared web hosts pack thousands of users onto a single OS, causing one user's runaway script to crash everyone else. On CodeHost, every project runs in an isolated OCI container sandbox with enforced cgroups, guaranteed CPU pinning, and private persistent storage.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "Strict RAM allocation: from 128MB to 4GB guaranteed",
                "Persistent isolated data volumes mounted per container",
                "Automatic DDoS and burst traffic mitigation at the edge"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Smooth Rounded Metric Card Frame */}
            <div className="relative rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden bg-white p-6 md:p-10 transition-all hover:shadow-indigo-500/10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Cluster Node: OVH-Cloud-01</h4>
                    <p className="text-xs text-slate-400 font-medium">Sandboxed Kernel &middot; cgroups v2 enabled</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                  Optimal Health
                </span>
              </div>

              {/* Resource Bars */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-700 flex items-center gap-1.5"><Cpu size={14} className="text-blue-600" /> CPU Core Utilization</span>
                    <span className="text-slate-900 font-black">22% of 2 vCPUs</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-700 flex items-center gap-1.5"><HardDrive size={14} className="text-purple-600" /> Dedicated Memory</span>
                    <span className="text-slate-900 font-black">124 MB / 512 MB</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" style={{ width: '24%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-700 flex items-center gap-1.5"><Layers size={14} className="text-emerald-600" /> NVMe Persistent Storage</span>
                    <span className="text-slate-900 font-black">1.1 GB / 5.0 GB</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: '22%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">Firewall Status: <strong className="text-slate-900">Protected</strong></span>
                <span className="font-medium">Rate Limiting: <strong className="text-slate-900">Active</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION 4: Smooth Visual Left, Text Right (Prepaid Credits & Custom Amounts) */}
      <section className="py-28 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            {/* Smooth Rounded Wallet Frame */}
            <div className="relative rounded-[2.5rem] border border-blue-200/80 shadow-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 md:p-10 text-white transition-all hover:shadow-blue-500/10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Prepaid Credits Wallet</p>
                  <h4 className="text-3xl font-black text-white">Top Up Any Amount</h4>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Sliders size={22} />
                </div>
              </div>

              {/* Dynamic Calculator Simulation */}
              <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/60 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">Custom Credit Amount:</span>
                  <span className="text-xl font-black text-blue-400">{calcCredits} Credits</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={calcCredits}
                  onChange={(e) => setCalcCredits(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer mb-4"
                />
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-400 font-medium">Estimated Total Price:</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">₹{Math.round(calcCredits * 1.60)}</span>
                    <span className="text-xs text-slate-400 ml-2">(${ (calcCredits * 0.02).toFixed(2) })</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-300">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</span>
                  <span className="font-bold text-white">₹1.60 per credit</span>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimum</span>
                  <span className="font-bold text-white">Just 10 credits (₹16)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[11px] font-black uppercase tracking-widest">
              <Sparkles size={13} className="text-purple-600" />
              <span>Transparent & Predictable</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.1]">
              Buy any credit amount. Never fear surprise cloud bills.
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed text-base">
              Tired of getting surprise $400 bills from hyperscalers because a test container kept running? CodeHost uses a 100% transparent prepaid credit system. Buy preset bundles or specify any exact custom amount you want.
            </p>
            <div className="space-y-3 pt-2">
              {[
                "Buy custom amounts: top up 25, 100, 500, or any number of credits",
                "Zero hidden fees: credits only burn while your container is active",
                "Safe auto-pause: containers cleanly pause if credits run low, never lose data"
              ].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="stroke-[3]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Supported Stacks & Technologies */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full">
            Universal Compatibility
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mt-4">
            Deploy your favorite stack in seconds
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto mt-3">
            Automatic framework detection with zero Dockerfile required. Or bring your own Dockerfile for total custom control.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[
            { name: "Next.js", desc: "SSR, SSG, Turbopack" },
            { name: "Node.js", desc: "Express, Nest, Fastify" },
            { name: "Python", desc: "FastAPI, Django, Flask" },
            { name: "Go", desc: "Gin, Fiber, Echo" },
            { name: "Rust", desc: "Actix, Axum, Warp" },
            { name: "PHP", desc: "Laravel, WordPress" },
            { name: "Bun", desc: "Ultra-fast JS runtime" },
            { name: "Docker", desc: "Custom Dockerfile" },
          ].map((stack, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center">
              <Code2 size={24} className="mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-black text-slate-900">{stack.name}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">{stack.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-28 px-6 max-w-7xl mx-auto border-t border-slate-100">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
            Why CodeHost
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mt-4">
            CodeHost vs The Alternatives
          </h2>
          <p className="text-slate-500 font-medium max-w-xl mx-auto mt-3">
            See how CodeHost eliminates the complexity and unpredictable costs of traditional cloud providers.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-black uppercase tracking-widest text-slate-500">
                <th className="p-5 pl-8">Feature</th>
                <th className="p-5 text-blue-600 bg-blue-50/50">CodeHost</th>
                <th className="p-5">Traditional VPS</th>
                <th className="p-5">Heroku</th>
                <th className="p-5 pr-8">AWS / GCP</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-600 divide-y divide-slate-100">
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Setup Time</td>
                <td className="p-5 font-bold text-blue-600 bg-blue-50/30">&lt; 30 Seconds</td>
                <td className="p-5">1 - 3 Hours</td>
                <td className="p-5">2 - 5 Minutes</td>
                <td className="p-5 pr-8">Hours / Days</td>
              </tr>
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Terminal / SSH Required</td>
                <td className="p-5 font-bold text-emerald-600 bg-blue-50/30">Never</td>
                <td className="p-5 text-red-500">Always</td>
                <td className="p-5">CLI Required</td>
                <td className="p-5 pr-8 text-red-500">Complex CLI / IAM</td>
              </tr>
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Surprise Bill Risk</td>
                <td className="p-5 font-bold text-emerald-600 bg-blue-50/30">Zero (Prepaid Credits)</td>
                <td className="p-5">Fixed + Overage</td>
                <td className="p-5">Moderate</td>
                <td className="p-5 pr-8 text-red-500">High (Bandwidth/API traps)</td>
              </tr>
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Buy Any Custom Credit Amount</td>
                <td className="p-5 font-bold text-emerald-600 bg-blue-50/30">Yes (from ₹16)</td>
                <td className="p-5 text-slate-400">N/A</td>
                <td className="p-5 text-slate-400">Fixed tiers only</td>
                <td className="p-5 pr-8 text-slate-400">Credit card auto-charge</td>
              </tr>
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Free SSL Subdomain</td>
                <td className="p-5 font-bold text-emerald-600 bg-blue-50/30">1-Click Auto</td>
                <td className="p-5">Manual Certbot setup</td>
                <td className="p-5">Included</td>
                <td className="p-5 pr-8">ACM + CloudFront setup</td>
              </tr>
              <tr>
                <td className="p-5 pl-8 font-bold text-slate-900">Free Tier Forever</td>
                <td className="p-5 font-bold text-emerald-600 bg-blue-50/30">Yes (1 Project, ₹0)</td>
                <td className="p-5 text-red-500">No</td>
                <td className="p-5 text-red-500">No (Removed)</td>
                <td className="p-5 pr-8">12 Months Only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section py-28 px-6 max-w-7xl mx-auto scroll-mt-20 border-t border-slate-100">
         <div className="features-heading text-center mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#2563EB] mb-4">Infrastructure Redefined</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] max-w-3xl mx-auto leading-tight">
               Built for Absolute Simplicity.
            </h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Box size={24} />,
                title: "One-Click Deploy",
                desc: "Just upload your code or connect Github. We handle the rest. No terminal required.",
                color: "#2563EB"
              },
              {
                icon: <Terminal size={24} />,
                title: "Auto Detection",
                desc: "Next.js, Django, Go, Rust, and 20+ more. We detect your framework and configure the environment automatically.",
                color: "#FFB300"
              },
              {
                icon: <Zap size={24} />,
                title: "Instant Scaling",
                desc: "Our distributed VPS architecture ensures your app is always live and snappy for your users.",
                color: "#00BFA5"
              },
              {
                icon: <Globe size={24} />,
                title: "Custom Subdomains",
                desc: "Every project gets a free your-app.code-host.online domain with automatic SSL encryption.",
                color: "#E53935"
              },
              {
                icon: <Shield size={24} />,
                title: "Secure Isolation",
                desc: "Enterprise-grade container isolation ensures your app is safe from other users and attacks.",
                color: "#0F172A"
              },
              {
                icon: <HardDrive size={24} />,
                title: "Live Monitoring",
                desc: "Real-time CPU and Memory stats stream directly to your dashboard via WebSockets.",
                color: "#2563EB"
              }
            ].map((f, i) => (
              <div key={i} className="feature-card group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all hover:-translate-y-2">
                 <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${f.color}15`, color: f.color }}>
                    {f.icon}
                 </div>
                 <h4 className="text-xl font-black text-[#0F172A] mb-3">{f.title}</h4>
                 <p className="text-slate-500 font-medium leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="pricing-heading text-center mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-600 mb-4">Transparent Pricing</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Choose your scale.</h3>
            <p className="mt-4 text-slate-500 font-medium max-w-xl mx-auto">
              Prepaid credits model. 1 credit = ₹1.60 ($0.02). Buy preset bundles or any custom credit amount you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
             {/* Free Tier */}
             <div className="pricing-card bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-1">Free</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">For students</p>
                   <div className="flex items-baseline space-x-1 mb-8">
                      <span className="text-4xl font-black text-slate-900">₹0</span>
                      <span className="text-slate-400 font-bold text-xs">/forever</span>
                   </div>
                   <ul className="space-y-3.5 mb-8">
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>1 Active Project</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>128MB RAM &middot; 0.5 CPU</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>1GB NVMe Storage</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>Free SSL Subdomain</span>
                      </li>
                   </ul>
                </div>
                <Link href="/signup" className="w-full py-3.5 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center">
                   Get Started Free
                </Link>
             </div>

             {/* Basic Tier */}
             <div className="pricing-card bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-1">Basic</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">For hobbyists</p>
                   <div className="flex items-baseline space-x-1 mb-8">
                      <span className="text-4xl font-black text-slate-900">₹80</span>
                      <span className="text-slate-400 font-bold text-xs">/month (50 cr)</span>
                   </div>
                   <ul className="space-y-3.5 mb-8">
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>3 Active Projects</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>256MB RAM &middot; 1 CPU</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>2GB NVMe Storage</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>Automatic Backups</span>
                      </li>
                   </ul>
                </div>
                <Link href="/signup" className="w-full py-3.5 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center">
                   Get Started
                </Link>
             </div>

             {/* Pro Tier */}
             <div className="pricing-card bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-500/20 flex flex-col justify-between transform lg:-translate-y-2 transition-all relative text-white">
                <div className="absolute top-0 right-8 -translate-y-1/2 px-3.5 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                   Popular
                </div>
                <div>
                   <h4 className="text-lg font-black text-white mb-1">Pro</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">For builders</p>
                   <div className="flex items-baseline space-x-1 mb-8">
                      <span className="text-4xl font-black text-white">₹240</span>
                      <span className="text-slate-400 font-bold text-xs">/month (150 cr)</span>
                   </div>
                   <ul className="space-y-3.5 mb-8">
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-300">
                         <CheckCircle2 size={16} className="text-blue-400" />
                         <span>5 Active Projects</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-300">
                         <CheckCircle2 size={16} className="text-blue-400" />
                         <span>512MB RAM &middot; 2 CPUs</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-300">
                         <CheckCircle2 size={16} className="text-blue-400" />
                         <span>5GB NVMe Storage</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-300">
                         <CheckCircle2 size={16} className="text-blue-400" />
                         <span>Priority Build Queue</span>
                      </li>
                   </ul>
                </div>
                <Link href="/signup" className="w-full py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/40 text-center">
                   Get Started
                </Link>
             </div>

             {/* Business Tier */}
             <div className="pricing-card bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-1">Business</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">For high traffic</p>
                   <div className="flex items-baseline space-x-1 mb-8">
                      <span className="text-4xl font-black text-slate-900">₹640</span>
                      <span className="text-slate-400 font-bold text-xs">/month (400 cr)</span>
                   </div>
                   <ul className="space-y-3.5 mb-8">
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>10 Active Projects</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>1GB RAM &middot; 4 CPUs</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>10GB NVMe Storage</span>
                      </li>
                      <li className="flex items-center space-x-3 text-xs font-medium text-slate-600">
                         <CheckCircle2 size={16} className="text-blue-600" />
                         <span>Dedicated 24/7 Support</span>
                      </li>
                   </ul>
                </div>
                <Link href="/signup" className="w-full py-3.5 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center">
                   Get Started
                </Link>
             </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="py-28 px-6 max-w-4xl mx-auto border-t border-slate-100">
        <div className="text-center mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
            Got Questions?
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mt-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "Can I purchase any custom amount of credits?",
              a: "Yes! In addition to preset credit packages, you can top up any custom amount of credits you need (starting at just 10 credits at ₹1.60 each). Credits are credited to your wallet instantly upon payment."
            },
            {
              q: "What happens if my credit balance reaches zero?",
              a: "Your active paid project container is cleanly stopped to prevent extra charges. None of your data, files, or configurations are deleted. You can restart the project at any time simply by topping up credits."
            },
            {
              q: "Do I need to know Docker or Linux server administration?",
              a: "No! CodeHost is specifically built to eliminate terminals and DevOps headaches. You just provide your code or Git repo, and CodeHost automatically builds, packages, and routes traffic to it."
            },
            {
              q: "Can I bring my own custom Dockerfile?",
              a: "Absolutely. If your project root contains a Dockerfile, CodeHost detects it automatically and builds according to your exact specifications and dependencies."
            },
            {
              q: "Do I get a free domain and SSL certificate?",
              a: "Yes! Every single project gets a free your-app.code-host.online subdomain with automatic Let's Encrypt SSL encryption out of the box."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-black text-slate-900 text-base hover:text-blue-600 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-blue-600' : ''}`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* High-Impact CTA Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-[3rem] p-10 md:p-16 text-white text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-blue-400 bg-blue-500/10 px-3.5 py-1.5 rounded-full border border-blue-400/20">
              Launch Today
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Ready to deploy your next project in 30 seconds?
            </h2>
            <p className="text-slate-400 font-medium text-base">
              Join students and developers who build and ship faster on CodeHost. Free tier available forever with zero credit card required.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
              >
                <span>Start Hosting Free</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/docs"
                className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all flex items-center justify-center"
              >
                Read Documentation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-white border-t border-slate-100 text-slate-400 font-medium">
         <div className="footer-content max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div>
               <LogoWithText className="mb-6" />
               <p className="text-sm max-w-sm">The most user-friendly cloud hosting platform on the planet. Built for the next generation of developers.</p>
            </div>

            <div className="flex space-x-10 text-sm">
               <div className="space-y-4">
                  <h5 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Platform</h5>
                  <div className="flex flex-col space-y-2">
                     <Link href="#" className="hover:text-blue-600">Deploy</Link>
                     <Link href="#" className="hover:text-blue-600">Builder</Link>
                     <Link href="#" className="hover:text-blue-600">Runner</Link>
                  </div>
               </div>
               <div className="space-y-4">
                  <h5 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Company</h5>
                  <div className="flex flex-col space-y-2">
                     <Link href="#" className="hover:text-blue-600">About</Link>
                     <Link href="#" className="hover:text-blue-600">Twitter</Link>
                     <Link href="#" className="hover:text-blue-600">Contact</Link>
                  </div>
               </div>
            </div>

            <div className="flex items-center space-x-6">
               <Link href="https://discord.gg/gsh2qpEXT4" target="_blank">
                  <MessageSquare className="hover:text-[#5865F2] transition-colors cursor-pointer" />
               </Link>
               <Twitter className="hover:text-blue-400 transition-colors cursor-pointer" />
               <Github className="hover:text-slate-900 transition-colors cursor-pointer" />
               <Linkedin className="hover:text-blue-700 transition-colors cursor-pointer" />
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-300">
            <div className="flex flex-col md:flex-row items-center gap-4">
               <p>© 2026 Arsh Pathan. All rights reserved.</p>
               <div className="hidden md:block w-px h-4 bg-slate-200"></div>
               <div className="flex items-center space-x-1.5 text-slate-400">
                  <span>Core hosted powered by</span>
                  <img src="/csky-logo.png" alt="CSky Developments" className="h-4 w-auto inline-block object-contain" />
                  <span className="font-bold text-slate-500">CSky Developments</span>
               </div>
            </div>
            <div className="flex space-x-6">
               <Link href="/terms" className="hover:text-slate-500 transition-colors">Terms</Link>
               <Link href="/privacy" className="hover:text-slate-500 transition-colors">Privacy</Link>
               <Link href="/docs" className="hover:text-slate-500 transition-colors">Docs</Link>
            </div>
         </div>
      </footer>

    </div>
  );
}
