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
  Linkedin 
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero Entrance
    const ctx = gsap.context(() => {
      gsap.from(".hero-title", {
        y: 60,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out",
        stagger: 0.1
      });

      gsap.from(".hero-subtext", {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.4,
        ease: "power3.out"
      });

      gsap.from(".hero-btns", {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.6,
        ease: "power3.out"
      });

      gsap.from(".hero-badge", {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "back.out(1.7)"
      });

      // Floating Dashboard Animation
      gsap.to(".dashboard-preview", {
        y: -15,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      // Scroll Reveal for Features
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 80%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      });
    }, [heroRef]);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-100 bg-white/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <LogoWithText />
        <div className="hidden md:flex items-center space-x-10">
          <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition">Features</Link>
          <Link href="#pricing" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition">Pricing</Link>
          <Link href="#docs" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition">Docs</Link>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4">Login</Link>
          <Link href="/signup" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all hover:-translate-y-0.5">
             Deploy Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header ref={heroRef} className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="hero-badge inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-10">
          <Zap size={10} className="fill-blue-600" />
          <span>V2.0 Now Live - Deploy in 30s</span>
        </div>

        <h1 className="hero-title text-5xl md:text-8xl font-black tracking-tightest leading-[0.95] max-w-4xl mb-10 text-slate-900">
           Deploy Smarter,<br />
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Scale Faster.</span>
        </h1>

        <p className="hero-subtext text-lg md:text-xl text-slate-500 font-medium max-w-2xl mb-12">
           The simplest cloud platform for students. No Linux, no Docker, no complicated terminals. Just one-click and your project is online.
        </p>

        <div className="hero-btns flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/signup" className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-3">
             <span>Start Hosting Free</span>
             <ArrowRight size={18} />
          </Link>
          <Link href="#features" className="w-full sm:w-auto px-10 py-5 bg-white border border-slate-200 text-slate-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center">
             See how it works
          </Link>
        </div>

        {/* Dashboard Preview - Floating mockup */}
        <div className="mt-24 dashboard-preview relative max-w-5xl mx-auto w-full group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition-all"></div>
          <div className="relative bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden p-2">
             <div className="bg-slate-50 rounded-[2rem] p-4 flex flex-col">
               <div className="flex items-center space-x-2 mb-4 px-4 pt-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1" />
                  <div className="px-3 py-1 bg-white rounded-full border border-slate-200 text-[10px] font-bold text-slate-400">
                    dashboard.codehost.app/arsh/my-website
                  </div>
               </div>
               
               <div className="grid grid-cols-12 gap-6 p-4">
                  <div className="col-span-3 space-y-3">
                     {[1,2,3,4].map(idx => <div key={idx} className={`h-10 rounded-xl ${idx === 1 ? 'bg-blue-600/10 border border-blue-600/20' : 'bg-white border border-slate-100'}`} /> )}
                  </div>
                  <div className="col-span-9 bg-white rounded-2xl border border-slate-100 p-8 min-h-[400px]">
                     <div className="flex justify-between items-start mb-10">
                        <div>
                           <h4 className="text-xl font-black text-slate-900">Project Details</h4>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Status: Running</p>
                        </div>
                        <div className="flex space-x-3">
                           <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Restart</div>
                           <div className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest">Stop</div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="h-32 rounded-3xl bg-slate-50 border border-slate-100 p-6">
                           <Activity size={20} className="text-blue-600 mb-2" />
                           <div className="h-2 w-full bg-slate-200 rounded-full mt-4 overflow-hidden">
                              <div className="h-full bg-blue-600 w-3/4" />
                           </div>
                        </div>
                        <div className="h-32 rounded-3xl bg-slate-50 border border-slate-100 p-6">
                           <Cpu size={20} className="text-indigo-600 mb-2" />
                           <div className="h-2 w-full bg-slate-200 rounded-full mt-4 overflow-hidden">
                              <div className="h-full bg-indigo-600 w-1/4" />
                           </div>
                        </div>
                     </div>
                     <div className="mt-8 p-6 bg-slate-900 rounded-2xl font-mono text-xs text-blue-400 space-y-1">
                        <p>&gt; Determining project type...</p>
                        <p className="text-white">&gt; Detected Node.js (Express)</p>
                        <p>&gt; Running build steps...</p>
                        <p className="text-emerald-400">&gt; Deployment Live: coffee.codehost.app</p>
                     </div>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section py-40 px-6 max-w-7xl mx-auto scroll-mt-20">
         <div className="text-center mb-24">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-600 mb-4">Infrastructure Redefined</h2>
            <h3 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
               Built for Absolute Simplicity.
            </h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { 
                icon: <Box size={24} />, 
                title: "One-Click Deploy", 
                desc: "Just upload your code or connect Github. We handle the rest. No terminal required.", 
                color: "blue" 
              },
              { 
                icon: <Terminal size={24} />, 
                title: "Auto Detection", 
                desc: "Node.js, Python, or Static HTML. We detect your framework and configure the environment automatically.", 
                color: "indigo" 
              },
              { 
                icon: <Zap size={24} />, 
                title: "Instant Scaling", 
                desc: "Our distributed VPS architecture ensures your app is always live and snappy for your users.", 
                color: "teal" 
              },
              { 
                icon: <Globe size={24} />, 
                title: "Custom Subdomains", 
                desc: "Every project gets a free your-app.codehost.app domain with automatic SSL encryption.", 
                color: "rose" 
              },
              { 
                icon: <Shield size={24} />, 
                title: "Secure Isolation", 
                desc: "Enterprise-grade container isolation ensures your app is safe from other users and attacks.", 
                color: "amber" 
              },
              { 
                icon: <HardDrive size={24} />, 
                title: "Live Monitoring", 
                desc: "Real-time CPU and Memory stats stream directly to your dashboard via WebSockets.", 
                color: "emerald" 
              }
            ].map((f, i) => (
              <div key={i} className="feature-card group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all hover:-translate-y-2">
                 <div className={`w-16 h-16 rounded-2xl bg-${f.color}-50 text-${f.color}-600 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform`}>
                    {f.icon}
                 </div>
                 <h4 className="text-2xl font-black text-slate-900 mb-4">{f.title}</h4>
                 <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-blue-600 mb-4">Transparent Pricing</h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Choose your scale.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {/* Free Tier */}
             <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-2">Student Free</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">For individuals</p>
                   <div className="flex items-baseline space-x-1 mb-10">
                      <span className="text-5xl font-black text-slate-900">$0</span>
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
             <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl shadow-blue-500/20 flex flex-col justify-between transform scale-105 active:scale-100 transition-all relative">
                <div className="absolute top-0 right-10 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                   Most Popular
                </div>
                <div>
                   <h4 className="text-lg font-black text-white mb-2">Power User</h4>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">For serious builders</p>
                   <div className="flex items-baseline space-x-1 mb-10 text-white">
                      <span className="text-5xl font-black">$5</span>
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
             <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-lg font-black text-slate-900 mb-2">Teams</h4>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Collaborative scaling</p>
                   <div className="flex items-baseline space-x-1 mb-10">
                      <span className="text-5xl font-black text-slate-900">$20</span>
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
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
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
               <Twitter className="hover:text-blue-400 transition-colors cursor-pointer" />
               <Github className="hover:text-slate-900 transition-colors cursor-pointer" />
               <Linkedin className="hover:text-blue-700 transition-colors cursor-pointer" />
            </div>
         </div>
         <div className="max-w-7xl mx-auto mt-20 pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-300">
            <p>© 2026 CodeHost SaaS Platform. All rights reserved.</p>
            <div className="flex space-x-6">
               <Link href="#">Terms</Link>
               <Link href="#">Privacy</Link>
            </div>
         </div>
      </footer>

    </div>
  );
}
