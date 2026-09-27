"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
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

function OfficialSealEmblem() {
  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <svg
        viewBox="0 0 120 120"
        className="w-22 h-22 sm:w-24 sm:h-24 select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer security dashed ring */}
        <circle cx="60" cy="60" r="56" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* Outer solid ring */}
        <circle cx="60" cy="60" r="51" stroke="#2563EB" strokeWidth="2" />
        {/* Inner hairline */}
        <circle cx="60" cy="60" r="46" stroke="#CBD5E1" strokeWidth="1" />
        {/* Inner solid medallion */}
        <circle cx="60" cy="60" r="32" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1.5" />

        {/* CodeHost 3-Layer Emblem in center */}
        <g transform="translate(42, 42) scale(0.035)">
          <polygon points="512,520 820,730 512,920 204,730" stroke="#2563EB" strokeWidth="60" fill="#ffffff" />
          <polygon points="512,320 820,530 512,720 204,530" stroke="#2563EB" strokeWidth="60" fill="#ffffff" />
          <polygon points="512,120 820,320 512,520 204,320" stroke="#2563EB" strokeWidth="60" fill="#ffffff" />
        </g>

        {/* Circular text */}
        <text
          x="60"
          y="23"
          textAnchor="middle"
          fill="#0F172A"
          fontSize="6.5"
          fontWeight="900"
          letterSpacing="1.5"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          CODEHOST CLOUD
        </text>

        <text
          x="60"
          y="102"
          textAnchor="middle"
          fill="#2563EB"
          fontSize="6.5"
          fontWeight="900"
          letterSpacing="1.2"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          VERIFIED CREDENTIAL
        </text>

        {/* Left & right stars */}
        <text x="18" y="63" fill="#D97706" fontSize="8" fontWeight="bold">★</text>
        <text x="96" y="63" fill="#D97706" fontSize="8" fontWeight="bold">★</text>
      </svg>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">
        Official Seal
      </span>
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
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} />
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
            border: 2px solid #0F172A !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="max-w-[1020px] mx-auto space-y-6">
        
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
          className="relative bg-white rounded-xl border-2 sm:border-[3px] border-[#0F172A] p-8 sm:p-12 md:p-14 shadow-xl overflow-hidden print:border-2 print:p-8 print:shadow-none"
        >
          {/* Subtle Security Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
            <Logo className="w-[480px] h-[480px]" />
          </div>

          {/* Architectural Certificate Frame (Concentric, Clean, Zero Floating Dots) */}
          <div className="absolute inset-3 sm:inset-4 border border-[#2563EB] rounded-lg pointer-events-none" />
          <div className="absolute inset-4.5 sm:inset-5.5 border border-slate-200 rounded-md pointer-events-none" />

          {/* Precision Corner Stepped Brackets (Part of the classical border tradition) */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-4 h-4 border-t-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 border-t-2 border-r-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-4 h-4 border-b-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-4 h-4 border-b-2 border-r-2 border-[#2563EB] pointer-events-none" />

          {/* Header (Official Logo, Authority, Title) */}
          <div className="text-center relative z-10 space-y-2 mb-6">
            <div className="flex justify-center mb-2">
              <Logo className="w-14 h-14" />
            </div>

            <p className="text-[11px] font-black tracking-[0.28em] text-[#2563EB] uppercase">
              CodeHost Cloud Infrastructure Authority
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#0F172A] tracking-tight uppercase font-serif">
              Certificate of Cloud Deployment
            </h1>

            <p className="text-xs font-bold tracking-[0.22em] text-slate-400 uppercase">
              Student &amp; Developer Engineering Certification
            </p>
          </div>

          {/* Recipient Conferral Statement */}
          <div className="text-center relative z-10 space-y-3 max-w-3xl mx-auto my-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              This credential is officially conferred upon
            </p>

            {/* Recipient Name in Dignified Serif Typography */}
            <div className="my-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight font-serif capitalize">
                {data.recipientName}
              </h2>
              {/* Classical Academic Diamond Flourish */}
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <div className="w-20 h-px bg-[#2563EB]" />
                <div className="w-1.5 h-1.5 rotate-45 bg-[#2563EB]" />
                <div className="w-20 h-px bg-[#2563EB]" />
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-2xl mx-auto pt-1">
              for having satisfied all requisite standards of cloud infrastructure orchestration, demonstrating verified
              competence in architecting, containerizing, and operating production services on CodeHost container cloud network.
            </p>

            {/* Verified Technical Competencies Bar (Refined & Editorial) */}
            <div className="my-5 py-3 border-y border-slate-200/80 max-w-2xl mx-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                Verified Applied Competencies
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <Server size={13} className="text-[#2563EB]" />
                  <span>Container Virtualization</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Globe size={13} className="text-[#2563EB]" />
                  <span>Edge DNS &amp; Proxy</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock size={13} className="text-[#2563EB]" />
                  <span>Automated TLS 1.3</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu size={13} className="text-[#2563EB]" />
                  <span>Isolated Compute Sandbox</span>
                </span>
              </div>
            </div>
          </div>

          {/* Landscape Bottom Row: Metadata, Official Seal, and Verification & Signoff */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            
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

            {/* Official Prestigious Vector Seal */}
            <div className="my-2 sm:my-0">
              <OfficialSealEmblem />
            </div>

            {/* Scannable Verification QR Code & Authority Signoff */}
            <div className="flex items-center gap-4 sm:gap-5 shrink-0">
              <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
                <div className="h-0.5 w-36 bg-[#0F172A] mb-1" />
                <p className="text-[10px] font-black text-[#0F172A] uppercase">Autonomous Infrastructure</p>
                <p className="text-[9px] text-slate-400">CodeHost Cloud Authority</p>
                <p className="text-[8px] font-mono text-slate-400 mt-0.5">SHA-256 SIGNED • IMMUTABLE</p>
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
        <div className="bg-[#2563EB] text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-[#2563EB] font-black text-sm rounded-xl shadow-sm transition transform active:scale-98 shrink-0 cursor-pointer"
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
