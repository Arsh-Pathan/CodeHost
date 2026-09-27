"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ExternalLink, 
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
  Server
} from 'lucide-react';
import { Logo, LogoWithText } from '@/components/Logo';
import { fetchApi } from '@/lib/api';

interface CertificateData {
  id: string;
  certNumber: string;
  recipientName: string;
  projectName: string;
  title: string;
  description: string;
  framework: string;
  liveUrl: string;
  issuedAt: string;
  authorUsername: string;
  authorAvatar?: string;
  authorReferralCode?: string;
  certUrl: string;
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

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    data.certUrl
  )}&color=0F172A&bgcolor=FFFFFF`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
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
              <span>{copied ? 'Link Copied!' : 'Copy Verification Link'}</span>
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

        {/* ─── THE PRESTIGIOUS OFFICIAL CERTIFICATE ─── */}
        <div 
          id="certificate-print-area"
          className="relative bg-white rounded-3xl border-8 border-[#0F172A] p-8 sm:p-14 shadow-xl overflow-hidden print:border-4 print:p-8 print:shadow-none"
        >
          {/* Official Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <Logo className="w-96 h-96" />
          </div>

          {/* Double Security Frame */}
          <div className="absolute inset-3.5 sm:inset-4 border-2 border-slate-300 rounded-2xl pointer-events-none" />
          <div className="absolute inset-5 sm:inset-6 border border-blue-600/30 rounded-xl pointer-events-none" />

          {/* Corner Precision Accents */}
          <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-[#2563EB] pointer-events-none" />
          <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-[#2563EB] pointer-events-none" />

          {/* Header with Official Logo */}
          <div className="text-center relative z-10 space-y-2 mb-6">
            <div className="flex justify-center mb-3">
              <Logo className="w-14 h-14 sm:w-16 sm:h-16" />
            </div>

            <p className="text-[11px] sm:text-xs font-black tracking-[0.25em] text-[#2563EB] uppercase">
              CodeHost Cloud Infrastructure Authority
            </p>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] tracking-tight uppercase font-serif pt-1">
              Certificate of Cloud Deployment
            </h1>

            <p className="text-xs sm:text-sm font-semibold tracking-widest text-slate-400 uppercase">
              Student &amp; Developer Engineering Certification
            </p>
          </div>

          {/* Recipient Conferral Statement */}
          <div className="text-center relative z-10 space-y-3 max-w-2xl mx-auto my-6 sm:my-8">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              This credential is officially conferred to
            </p>

            <div className="py-2 border-b-2 border-[#0F172A] inline-block px-8 sm:px-16 min-w-[280px]">
              <h2 className="text-2xl sm:text-4xl font-black text-[#0F172A] tracking-tight">
                {data.recipientName}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 max-w-xl mx-auto">
              having satisfied all requirements of cloud orchestration by architecting, configuring, and 
              successfully deploying production cloud services on CodeHost container virtualization infrastructure.
            </p>

            {data.projectName && (
              <div className="inline-flex items-center gap-2 py-1.5 px-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <span className="text-xs font-semibold text-slate-500">Qualifying Project:</span>
                <span className="font-mono font-bold text-xs text-[#2563EB]">
                  {data.projectName}
                </span>
                {data.liveUrl && (
                  <a
                    href={data.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-blue-600 print:text-slate-600"
                  >
                    <ExternalLink size={12} className="inline print:hidden" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Metadata Grid, Official Seal, and Verification QR Code */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Meta Items */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-left w-full md:w-auto">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificate ID</p>
                <p className="font-mono font-black text-xs sm:text-sm text-[#0F172A]">{data.certNumber}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Issued</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">{issueDateFormatted}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Credential Title</p>
                <p className="font-semibold text-xs sm:text-sm text-[#0F172A]">{data.title}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registry Status</p>
                <p className="font-bold text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Active &amp; Verified
                </p>
              </div>
            </div>

            {/* Official Prestigious Gold Seal */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 border-amber-400 bg-amber-50/80 shadow-xs flex flex-col items-center justify-center text-center p-2">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border border-dashed border-amber-500 flex flex-col items-center justify-center">
                    <Award size={22} className="text-amber-600 mb-0.5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-amber-900 leading-none">OFFICIAL SEAL</span>
                    <span className="text-[7px] font-bold text-amber-700 leading-tight">CODEHOST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scannable Verification QR Code */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right shrink-0">
              <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-xs mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt={`QR Code verification for ${data.certNumber}`}
                  width={100}
                  height={100}
                  className="rounded"
                />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                Scan to Verify Authenticity
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                code-host.online/certificate/{data.certNumber}
              </p>
            </div>
          </div>

          {/* Official Signature Lines */}
          <div className="relative z-10 pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-left">
              <div className="h-0.5 w-36 bg-[#0F172A] mb-1" />
              <p className="font-bold text-[#0F172A]">CodeHost Cloud Network</p>
              <p className="text-[10px] text-slate-400">Autonomous Infrastructure Authority</p>
            </div>

            <div className="text-right">
              <div className="h-0.5 w-36 bg-[#0F172A] ml-auto mb-1" />
              <p className="font-bold text-[#0F172A]">Cryptographic Verification</p>
              <p className="text-[10px] text-slate-400">Immutable Ledger ID</p>
            </div>
          </div>
        </div>

        {/* ─── VIRAL ORGANIC INVITATION CALLOUT (No Gradients) ─── */}
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
        <div className="text-center text-xs text-slate-400 pt-4 print:hidden">
          <p>© {new Date().getFullYear()} CodeHost Cloud Services. All rights reserved. Registered certification record.</p>
        </div>
      </div>
    </div>
  );
}
