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
  Lock,
  Rocket,
  Code2,
  Terminal,
  Braces,
  GitBranch,
  Database,
  Cpu,
  Award
} from 'lucide-react';
import { Logo, LogoWithText } from '@/components/Logo';
import { fetchApi } from '@/lib/api';

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.886-9.888 9.886m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface CertificateData {
  id: string;
  certNumber: string;
  recipientName: string;
  projectName?: string;
  title: string;
  userId?: string;
  description: string;
  framework?: string;
  liveUrl?: string;
  issuedAt: string;
  authorUsername: string;
  authorAvatar?: string;
  authorReferralCode?: string;
  certUrl: string;
}

export default function CertificatePage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [data, setData] = useState<CertificateData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCertificate() {
      try {
        setLoading(true);
        const [res, authRes] = await Promise.all([
          fetchApi(`/certificates/verify/${encodeURIComponent(params.id)}`),
          fetchApi('/auth/me').catch(() => null),
        ]);
        if (res.valid && res.certificate) {
          setData(res.certificate);
        } else {
          setError(res.error || 'Certificate not found or invalid.');
        }
        if (authRes?.user) {
          setCurrentUser(authRes.user);
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

  const isOwner = Boolean(
    currentUser && (
      (data.userId && currentUser.id === data.userId) ||
      (data.authorUsername && currentUser.username === data.authorUsername) ||
      (data.authorReferralCode && currentUser.referralCode === data.authorReferralCode)
    )
  );

  const referralSignupUrl = data.authorReferralCode
    ? `https://code-host.online/signup?ref=${encodeURIComponent(data.authorReferralCode)}`
    : 'https://code-host.online/signup';

  // LinkedIn Add to Profile (Licenses & Certifications)
  const linkedInCertUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    `Certified Cloud Deployer - Code Host`
  )}&organizationName=${encodeURIComponent('Code Host')}&issueYear=${new Date(data.issuedAt).getFullYear()}&issueMonth=${
    new Date(data.issuedAt).getMonth() + 1
  }&certUrl=${encodeURIComponent(data.certUrl)}&certId=${encodeURIComponent(data.certNumber)}`;

  // LinkedIn Post Share (Shows rich OpenGraph image on LinkedIn feed)
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.certUrl)}`;

  const twitterShareText = encodeURIComponent(
    `Proud to share that I have officially deployed and launched my project to the cloud with @CodeHost!\n\nVerify certificate: `
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${twitterShareText}&url=${encodeURIComponent(data.certUrl)}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Check out my official Cloud Deployment Certificate on CodeHost:\n${data.certUrl}`
  )}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    data.certUrl
  )}&color=0F172A&bgcolor=F1F5F9`;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-100">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background: #f1f5f9 !important;
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

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-300 text-slate-800 rounded-full text-xs font-bold self-start sm:self-auto shadow-xs">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Official Credential Registry • Verified Active</span>
          </div>
        </div>

        {/* Action Toolbar (Icons with Tooltips) (Hidden on print) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 print:hidden">
          {/* Social Share Icons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
              Share:
            </span>
            
            {/* Share to LinkedIn Feed */}
            <div className="relative group">
              <a
                href={linkedInShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                title="Share on LinkedIn"
                aria-label="Share on LinkedIn"
              >
                <Linkedin size={18} />
              </a>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                Share on LinkedIn
              </span>
            </div>

            {/* Add to LinkedIn Profile Certifications */}
            <div className="relative group">
              <a
                href={linkedInCertUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-[#0A66C2] border border-blue-200 rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                title="Add to LinkedIn Profile"
                aria-label="Add to LinkedIn Profile"
              >
                <Award size={18} />
              </a>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                Add to LinkedIn Profile
              </span>
            </div>

            {/* Share on X */}
            <div className="relative group">
              <a
                href={twitterShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-900 hover:bg-black text-white rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                title="Share on X"
                aria-label="Share on X"
              >
                <XIcon className="w-4 h-4 fill-white" />
              </a>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                Share on X
              </span>
            </div>

            {/* Share on WhatsApp */}
            <div className="relative group">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                title="Share on WhatsApp"
                aria-label="Share on WhatsApp"
              >
                <WhatsAppIcon className="w-4.5 h-4.5 fill-white" />
              </a>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                WhatsApp
              </span>
            </div>
          </div>

          {/* Action Icons (Copy Link, Print) */}
          <div className="flex items-center gap-2">
            {/* Copy Link */}
            <div className="relative group">
              <button
                onClick={handleCopyLink}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition transform active:scale-95 cursor-pointer"
                title={copied ? "Link Copied!" : "Copy Link"}
                aria-label="Copy Link"
              >
                {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
              </button>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                {copied ? 'Link Copied!' : 'Copy Link'}
              </span>
            </div>

            {/* Print Certificate */}
            <div className="relative group">
              <button
                onClick={handlePrint}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 rounded-xl transition transform active:scale-95 cursor-pointer"
                title="Print Certificate"
                aria-label="Print Certificate"
              >
                <Printer size={18} />
              </button>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30">
                Print Certificate
              </span>
            </div>
          </div>
        </div>

        {/* ─── THE PRESTIGIOUS GRAY THEMED LANDSCAPE CERTIFICATE ─── */}
        <div 
          id="certificate-print-area"
          className="relative bg-[#F8FAFC] rounded-xl border-2 sm:border-[3px] border-[#0F172A] p-8 sm:p-12 md:p-14 shadow-xl overflow-hidden print:border-2 print:p-8 print:shadow-none"
        >
          {/* ─── Faded Background Watermarks: Logo & Code Icons ─── */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            {/* Centered Large Faded CodeHost Logo Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
              <Logo className="w-80 h-80 sm:w-96 sm:h-96" />
            </div>

            {/* Scattered Faded Code & Terminal Icons in Background */}
            <div className="absolute top-8 left-10 opacity-[0.08] text-slate-600">
              <Terminal size={46} />
            </div>
            <div className="absolute top-22 left-28 opacity-[0.08] font-mono text-xs text-blue-700">
              git push codehost main
            </div>

            <div className="absolute top-8 right-12 opacity-[0.08] text-blue-700">
              <Code2 size={48} />
            </div>
            <div className="absolute top-22 right-24 opacity-[0.08] font-mono text-xs text-slate-600">
              &lt;CloudDeploy /&gt;
            </div>

            <div className="absolute top-1/2 -translate-y-10 left-8 opacity-[0.08] text-blue-600">
              <Braces size={40} />
            </div>
            <div className="absolute top-1/2 left-20 opacity-[0.08] font-mono text-xs text-slate-600">
              status: &quot;running&quot;
            </div>

            <div className="absolute top-1/2 -translate-y-10 right-10 opacity-[0.08] text-slate-600">
              <GitBranch size={42} />
            </div>
            <div className="absolute top-1/2 right-24 opacity-[0.08] font-mono text-xs text-blue-700">
              docker compose up -d
            </div>

            <div className="absolute bottom-12 left-14 opacity-[0.08] text-slate-600">
              <Database size={36} />
            </div>

            <div className="absolute bottom-14 right-20 opacity-[0.08] text-blue-700">
              <Cpu size={38} />
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-[0.08] text-blue-600">
              <Rocket size={32} />
            </div>
          </div>

          {/* Architectural Certificate Frame (Concentric, Clean, Balanced) */}
          <div className="absolute inset-3 sm:inset-4 border border-[#2563EB] rounded-lg pointer-events-none" />
          <div className="absolute inset-4.5 sm:inset-5.5 border border-slate-300 rounded-md pointer-events-none" />

          {/* Precision Corner Stepped Brackets */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-4 h-4 border-t-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 border-t-2 border-r-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-4 h-4 border-b-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-4 h-4 border-b-2 border-r-2 border-[#2563EB] pointer-events-none" />

          {/* Header (Official Logo, Authority, Title) */}
          <div className="text-center relative z-10 space-y-2 mb-6">
            <div className="flex justify-center mb-2">
              <Logo className="w-13 h-13 sm:w-14 sm:h-14" />
            </div>

            <p className="text-[11px] font-black tracking-[0.28em] text-[#2563EB] uppercase">
              CodeHost Developer Community
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#0F172A] tracking-tight uppercase font-serif">
              Certificate of Cloud Deployment
            </h1>

            <p className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
              Student &amp; Developer Recognition
            </p>
          </div>

          {/* Recipient Conferral Statement (Light, Genuine, Encouraging) */}
          <div className="text-center relative z-10 space-y-3 max-w-3xl mx-auto my-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              This certificate is proudly awarded to
            </p>

            {/* Recipient Name */}
            <div className="my-3">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight font-serif capitalize">
                {data.recipientName}
              </h2>
              {/* Academic Diamond Flourish */}
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <div className="w-20 h-px bg-[#2563EB]" />
                <div className="w-1.5 h-1.5 rotate-45 bg-[#2563EB]" />
                <div className="w-20 h-px bg-[#2563EB]" />
              </div>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-xl mx-auto pt-1 font-medium">
              for taking the leap to build and successfully launch their project live on the CodeHost cloud platform.
            </p>

            {/* Key Deployment Highlights (Light & True) */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 py-3 border-y border-slate-200/80 max-w-xl mx-auto my-4 text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Rocket size={14} className="text-[#2563EB]" />
                <span>Live on the Cloud</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-emerald-600" />
                <span>Automatic HTTPS</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <Globe size={14} className="text-[#2563EB]" />
                <span>Public Web Access</span>
              </span>
            </div>
          </div>

          {/* Landscape Bottom Row: Clean Metadata & Verification QR Code */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-left w-full sm:w-auto">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Certificate ID</p>
                <p className="font-mono font-black text-xs sm:text-sm text-[#0F172A]">{data.certNumber}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date Issued</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">{issueDateFormatted}</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Issued By</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">Code Host</p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <p className="font-bold text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active &amp; Verified
                </p>
              </div>
            </div>

            {/* Scannable Verification QR Code */}
            <div className="flex items-center gap-4 sm:gap-5 shrink-0">
              <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
                <p className="font-bold text-xs text-[#0F172A]">CodeHost Cloud</p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5">code-host.online</p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-xs mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code verification for ${data.certNumber}`}
                    width={76}
                    height={76}
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

        {/* ─── VIRAL INVITATION CALLOUT (No Gradients) - Only shown to other visitors ─── */}
        {!isOwner && (
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
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pt-2 print:hidden flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1020px] mx-auto">
          <p>© {new Date().getFullYear()} CodeHost Cloud Services. All rights reserved.</p>
          <p className="font-medium text-slate-400">code-host.online</p>
        </div>
      </div>
    </div>
  );
}
