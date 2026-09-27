"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
  Award, 
  Globe, 
  ArrowRight, 
  Sparkles,
  Linkedin,
  Twitter,
  Server,
  Lock,
  Cpu
} from 'lucide-react';
import { Logo, LogoWithText } from '@/components/Logo';
import { fetchApi } from '@/lib/api';

interface CertificateData {
  id: string;
  certNumber: string;
  recipientName: string;
  projectName?: string;
  title: string;
  description: string;
  framework?: string;
  liveUrl?: string;
  issuedAt: string;
  authorUsername: string;
  authorAvatar?: string;
  authorReferralCode?: string;
  certUrl: string;
}

function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-9 h-9 sm:w-11 sm:h-11 pointer-events-none select-none text-[#2563EB] ${className || ''}`}
    >
      <path d="M4 50V14C4 8.47715 8.47715 4 14 4H50" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 50V18C10 13.5817 13.5817 10 18 10H50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="2" y="2" width="6" height="6" fill="#0F172A" />
      <rect x="7" y="7" width="5" height="5" fill="currentColor" />
      <circle cx="18" cy="18" r="2.5" fill="#0F172A" />
      <line x1="28" y1="4" x2="34" y2="4" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="28" x2="4" y2="34" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function OfficialGoldSeal() {
  return (
    <div className="relative flex flex-col items-center justify-center shrink-0">
      {/* Ribbon tails hanging below */}
      <div className="absolute -bottom-3.5 flex justify-center gap-1 z-0 pointer-events-none">
        <div className="w-3.5 h-6 bg-[#2563EB] -rotate-12 transform origin-top shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]" />
        <div className="w-3.5 h-6 bg-[#1D4ED8] rotate-12 transform origin-top shadow-xs [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]" />
      </div>

      {/* Seal Outer Rosette */}
      <div className="relative z-10 w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-[#FEF3C7] border-2 border-[#D97706] p-1.5 shadow-md flex items-center justify-center text-center">
        {/* Inner Serrated / Dashed Ring */}
        <div className="w-full h-full rounded-full border border-dashed border-[#B45309] bg-white flex flex-col items-center justify-center p-1">
          <Award size={18} className="text-[#D97706] mb-0.5" />
          <span className="text-[7.5px] font-black uppercase tracking-wider text-[#92400E] leading-none">
            OFFICIAL SEAL
          </span>
          <div className="flex items-center gap-0.5 my-0.5">
            <span className="text-[7px] text-[#D97706]">★</span>
            <span className="text-[7px] text-[#D97706]">★</span>
            <span className="text-[7px] text-[#D97706]">★</span>
            <span className="text-[7px] text-[#D97706]">★</span>
            <span className="text-[7px] text-[#D97706]">★</span>
          </div>
          <span className="text-[7px] font-black text-[#B45309] leading-tight tracking-tight">
            CODEHOST
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCertificate() {
      try {
        setLoading(true);
        const res = await fetchApi(`/certificates/verify/${encodeURIComponent(params.id)}`);
        if (res.valid && res.certificate) {
          setData(res.certificate);
        } else {
          setError(res.error || 'Certificate not found or invalid.');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to verify certificate.');
      } finally {
        setLoading(false);
      }
    }
    loadCertificate();
  }, [params.id]);

  const handleCopyLink = () => {
    if (!data?.certUrl) return;
    navigator.clipboard.writeText(data.certUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Logo className="w-12 h-12 animate-pulse" />
          <p className="text-sm font-bold text-slate-500">Verifying credential on CodeHost registry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
          <p className="text-sm text-slate-500 mb-6">
            The requested certificate ID could not be found or has not been issued yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition cursor-pointer"
          >
            Go to CodeHost Homepage
          </Link>
        </div>
      </div>
    );
  }

  const issueDateFormatted = new Date(data.issuedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const referralSignupUrl = data.authorReferralCode
    ? `https://code-host.online/signup?ref=${encodeURIComponent(data.authorReferralCode)}`
    : 'https://code-host.online/signup';

  const linkedInCertUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    `Certified Cloud Deployer - CodeHost`
  )}&organizationName=${encodeURIComponent('CodeHost')}&issueYear=${new Date(data.issuedAt).getFullYear()}&issueMonth=${
    new Date(data.issuedAt).getMonth() + 1
  }&certUrl=${encodeURIComponent(data.certUrl)}&certId=${encodeURIComponent(data.certNumber)}`;

  const twitterShareText = encodeURIComponent(
    `🎓 Proud to share that I have officially earned my Certified Cloud Deployer credential from @CodeHost for shipping production services to the cloud!\n\nVerify certificate: `
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${twitterShareText}&url=${encodeURIComponent(data.certUrl)}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🎓 Check out my official Cloud Deployment Certificate on CodeHost:\n${data.certUrl}`
  )}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    data.certUrl
  )}&color=0F172A&bgcolor=FFFFFF`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-100">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          #certificate-print-area {
            border: 4px solid #0F172A !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-[1080px] mx-auto space-y-6">
        
        {/* Navigation & Official Registry Header (Hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <Link href="/" className="self-start">
            <LogoWithText />
          </Link>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold self-start sm:self-auto shadow-xs">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Official Credential Registry • Verified Active</span>
          </div>
        </div>

        {/* Action Toolbar (Share, LinkedIn, Print) (Hidden on print) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Share Credential:</span>
            <a
              href={linkedInCertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold rounded-lg transition"
            >
              <Linkedin size={14} />
              <span>Add to LinkedIn</span>
            </a>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
            >
              <Twitter size={14} />
              <span>Share on X</span>
            </a>
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-lg transition"
            >
              <span>WhatsApp</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Certificate</span>
            </button>
          </div>
        </div>

        {/* ─── THE PRESTIGIOUS LANDSCAPE CERTIFICATE ─── */}
        <div 
          id="certificate-print-area"
          className="relative bg-white rounded-3xl border-4 md:border-8 border-[#0F172A] p-6 sm:p-10 md:p-12 shadow-2xl overflow-hidden print:border-4 print:p-8 print:shadow-none"
        >
          {/* Subtle Security Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
            <Logo className="w-[500px] h-[500px]" />
          </div>

          {/* Intricate Multi-Layer Precision Security Outline */}
          <div className="absolute inset-3 sm:inset-4 md:inset-5 border border-slate-300 pointer-events-none rounded-xl" />
          <div className="absolute inset-4 sm:inset-5 md:inset-6.5 border-2 border-[#2563EB] pointer-events-none rounded-lg" />
          <div className="absolute inset-5 sm:inset-6 md:inset-8 border border-slate-200 pointer-events-none rounded-md" />

          {/* Corner Architectural Ornaments */}
          <div className="absolute top-4 left-4 sm:top-5 sm:left-5 md:top-6.5 md:left-6.5">
            <CornerOrnament />
          </div>
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 md:top-6.5 md:right-6.5 rotate-90">
            <CornerOrnament />
          </div>
          <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-5 md:bottom-6.5 md:left-6.5 -rotate-90">
            <CornerOrnament />
          </div>
          <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 md:bottom-6.5 md:right-6.5 rotate-180">
            <CornerOrnament />
          </div>

          {/* Microprint Security Top Track */}
          <div className="relative z-10 flex items-center justify-between border-b border-slate-200 pb-2.5 mb-5 text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              CODEHOST AUTONOMOUS CLOUD AUTHORITY
            </span>
            <span className="hidden md:inline">STANDARDIZED DEVELOPER SPECIFICATION • IMMUTABLE VERIFICATION LEDGER</span>
            <span>SERIAL: {data.certNumber}</span>
          </div>

          {/* Landscape Header (Logo, Authority, Title) */}
          <div className="text-center relative z-10 space-y-1.5 mb-5">
            <div className="flex justify-center mb-2">
              <Logo className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>

            <p className="text-[10px] sm:text-[11px] font-black tracking-[0.3em] text-[#2563EB] uppercase">
              CodeHost Cloud Infrastructure Authority
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#0F172A] tracking-tight uppercase font-serif">
              Certificate of Cloud Deployment
            </h1>

            <p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
              Student &amp; Developer Engineering Certification
            </p>
          </div>

          {/* Recipient Conferral Statement */}
          <div className="text-center relative z-10 space-y-2.5 max-w-3xl mx-auto my-4">
            <p className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
              This credential is officially conferred to
            </p>

            {/* Recipient Name in Dignified Framed Style */}
            <div className="inline-flex items-center gap-3 sm:gap-6 py-1 px-4 sm:px-12">
              <div className="h-[2px] w-8 sm:w-16 bg-[#2563EB]" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0F172A] tracking-tight font-serif">
                {data.recipientName}
              </h2>
              <div className="h-[2px] w-8 sm:w-16 bg-[#2563EB]" />
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-2xl mx-auto pt-1">
              having satisfied all rigorous requirements of cloud orchestration by architecting, configuring, and 
              successfully deploying production cloud services on CodeHost container virtualization infrastructure.
            </p>

            {/* Verified Cloud Competency Indicators (Images & Icons) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 max-w-2xl mx-auto text-left">
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Server size={15} className="text-[#2563EB] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 leading-none">Container Runtime</p>
                  <p className="text-[9px] text-slate-400 truncate">Docker Virtualization</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Globe size={15} className="text-[#2563EB] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 leading-none">Edge Network</p>
                  <p className="text-[9px] text-slate-400 truncate">Automated DNS &amp; Proxy</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Lock size={15} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 leading-none">TLS 1.3 Security</p>
                  <p className="text-[9px] text-slate-400 truncate">Automated SSL Engine</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <Cpu size={15} className="text-[#2563EB] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-800 leading-none">Sandbox Compute</p>
                  <p className="text-[9px] text-slate-400 truncate">Isolated Cloud Space</p>
                </div>
              </div>
            </div>
          </div>

          {/* Landscape Bottom Row: Metadata, Official Gold Seal, and QR Code */}
          <div className="relative z-10 pt-5 mt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-5">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left w-full sm:w-auto">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Certificate ID</p>
                <p className="font-mono font-black text-xs sm:text-sm text-[#0F172A]">{data.certNumber}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Issued</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">{issueDateFormatted}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Credential Title</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">{data.title}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registry Status</p>
                <p className="font-bold text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active &amp; Verified
                </p>
              </div>
            </div>

            {/* Official Prestigious Gold Seal Medallion */}
            <div className="my-2 sm:my-0">
              <OfficialGoldSeal />
            </div>

            {/* Scannable Verification QR Code & Digital Authority Signature */}
            <div className="flex items-center gap-4 sm:gap-5 shrink-0">
              <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
                {/* Digital Signature */}
                <div className="mb-2">
                  <svg viewBox="0 0 140 32" className="h-6 text-[#0F172A]" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M8 22 C 24 6, 36 30, 50 12 C 64 -2, 70 28, 86 16 C 102 4, 112 24, 132 14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="h-0.5 w-32 bg-[#0F172A] mb-0.5" />
                  <p className="text-[9px] font-black text-[#0F172A] uppercase">Autonomous Infrastructure</p>
                  <p className="text-[8px] text-slate-400">CodeHost Cloud Authority</p>
                </div>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-xs mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code verification for ${data.certNumber}`}
                    width={80}
                    height={80}
                    className="rounded"
                  />
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                  Scan to Verify
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── VIRAL INVITATION CALLOUT (No Gradients) ─── */}
        <div className="bg-[#2563EB] text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-white">
              <Sparkles size={14} className="text-amber-300" />
              <span>Free Student &amp; Developer Cloud Hosting</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight leading-tight">
              Want your own verified Cloud Deployment Certificate?
            </h3>
            <p className="text-sm text-blue-100 max-w-xl">
              Deploy your Node.js, Python, or Docker app in 60 seconds with instant HTTPS. Join with 
              <strong> {data.recipientName}</strong>&apos;s invite and get <strong>+50 free credits</strong> immediately!
            </p>
          </div>

          <Link
            href={referralSignupUrl}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-[#2563EB] font-black text-sm rounded-2xl shadow-sm transition transform active:scale-98 shrink-0 cursor-pointer"
          >
            <span>Deploy Free &amp; Claim 50 Credits</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-2 print:hidden">
          <p>© {new Date().getFullYear()} CodeHost Cloud Services. All rights reserved. Registered certification record.</p>
        </div>
      </div>
    </div>
  );
}
