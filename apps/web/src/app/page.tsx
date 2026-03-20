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
  MessageSquare} from 'lucide-react';
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
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">Login</Link>
          <Link href="/signup" className="px-5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all">
             Get Started
          </Link>
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
                    dashboard.codehost.app/arsh/my-website
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
                        <p className="text-white">&gt; Detected Node.js (Express)</p>
                        <p className="opacity-70">&gt; Running build steps...</p>
                        <p className="text-[#00BFA5]">&gt; Deployment Live: coffee.codehost.app</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section py-40 px-6 max-w-7xl mx-auto scroll-mt-20">
         <div className="features-heading text-center mb-24">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#2563EB] mb-4">Infrastructure Redefined</h2>
            <h3 className="text-4xl md:text-6xl font-black tracking-tight text-[#0F172A] max-w-3xl mx-auto leading-tight">
               Built for Absolute Simplicity.
            </h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
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
                desc: "Node.js, Python, or Static HTML. We detect your framework and configure the environment automatically.",
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
                desc: "Every project gets a free your-app.codehost.app domain with automatic SSL encryption.",
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
              <div key={i} className="feature-card group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all hover:-translate-y-2">
                 <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${f.color}15`, color: f.color }}>
                    {f.icon}
                 </div>
                 <h4 className="text-2xl font-black text-[#0F172A] mb-4">{f.title}</h4>
                 <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="pricing-heading text-center mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-600 mb-4">Transparent Pricing</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Choose your scale.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {/* Free Tier */}
             <div className="pricing-card bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-2">Student Free</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">For individuals</p>
                   <div className="flex items-baseline space-x-1 mb-10">
                      <span className="text-5xl font-black text-slate-900">₹0</span>
                      <span className="text-slate-400 font-bold">/forever</span>
                   </div>
                   <ul className="space-y-4 mb-10">
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>1 Active Project</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>128MB RAM</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>CodeHost Shared Subdomain</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>Live Build Console</span>
                      </li>
                   </ul>
                </div>
                <Link href="/signup" className="w-full py-4 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center">
                   Get Started Free
                </Link>
             </div>

             {/* Pro Tier */}
             <div className="pricing-card bg-slate-900 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/20 flex flex-col justify-between transform scale-105 active:scale-100 transition-all relative">
                <div className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                   Best Deal
                </div>
                <div>
                   <h4 className="text-lg font-black text-white mb-2">Power User</h4>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">For serious builders</p>
                   <div className="flex items-baseline space-x-1 mb-10 text-white">
                      <span className="text-5xl font-black">₹50</span>
                      <span className="text-slate-500 font-bold">/month</span>
                   </div>
                   <ul className="space-y-4 mb-10">
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                         <CheckCircle2 size={18} className="text-blue-500" />
                         <span>Unlimted Projects</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                         <CheckCircle2 size={18} className="text-blue-500" />
                         <span>1GB RAM per container</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                         <CheckCircle2 size={18} className="text-blue-500" />
                         <span>Custom Domain Mapping</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                         <CheckCircle2 size={18} className="text-blue-500" />
                         <span>Always-On Hosting</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-300">
                         <CheckCircle2 size={18} className="text-blue-500" />
                         <span>Priority Support</span>
                      </li>
                   </ul>
                </div>
                <button className="w-full py-5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/40">
                   Coming Soon
                </button>
             </div>

             {/* Teams Tier */}
             <div className="pricing-card bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-2">Teams</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Collaborative scaling</p>
                   <div className="flex items-baseline space-x-1 mb-10">
                      <span className="text-5xl font-black text-slate-900">₹100</span>
                      <span className="text-slate-400 font-bold">/month</span>
                   </div>
                   <ul className="space-y-4 mb-10">
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>Shared Workspaces</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>RBAC Permissions</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>Dedicated VPS Nodes</span>
                      </li>
                      <li className="flex items-center space-x-3 text-sm font-medium text-slate-600">
                         <CheckCircle2 size={18} className="text-blue-600" />
                         <span>Audit Logs</span>
                      </li>
                   </ul>
                </div>
                <button className="w-full py-4 bg-slate-100 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center">
                   Coming Soon
                </button>
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
            <p>© 2026 Arsh Pathan. All rights reserved.</p>
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
