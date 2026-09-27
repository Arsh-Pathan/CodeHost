"use client";

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ExternalLink, 
  Share2, 
  Copy, 
  Check, 
  Printer, 
  ShieldCheck, 
  Award, 
  Calendar, 
  Cpu, 
  Globe, 
  ArrowRight, 
  Sparkles,
  Linkedin,
  Twitter
} from 'lucide-react';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Verifying credential on CodeHost ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-xs">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Certificate Not Found</h1>
          <p className="text-sm text-slate-500 mb-6">
            The requested certificate ID could not be found or has not been issued yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition"
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
    `Certified Cloud Deployer - ${data.projectName}`
  )}&organizationName=${encodeURIComponent('CodeHost')}&issueYear=${new Date(data.issuedAt).getFullYear()}&issueMonth=${
    new Date(data.issuedAt).getMonth() + 1
  }&certUrl=${encodeURIComponent(data.certUrl)}&certId=${encodeURIComponent(data.certNumber)}`;

  const twitterShareText = encodeURIComponent(
    `🚀 Excited to share that I successfully deployed "${data.projectName}" to production on @CodeHost cloud and received my verified Cloud Deployment Certificate!\n\nVerify it here: `
  );
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${twitterShareText}&url=${encodeURIComponent(data.certUrl)}`;

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Check out my verified Cloud Deployment Certificate for ${data.projectName} on CodeHost:\n${data.certUrl}`
  )}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    data.certUrl
  )}&color=0F172A&bgcolor=FFFFFF`;

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 py-8 px-4 sm:px-6 lg:px-8 selection:bg-blue-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Verification Badge Header (Hidden on print) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <Link href="/" className="flex items-center gap-2 self-start">
            <span className="text-xl font-black tracking-tight text-slate-900">
              Code<span className="text-blue-600">Host</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
              Official Credential Registry
            </span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold self-start sm:self-auto">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Cryptographically Verified & Authentic</span>
          </div>
        </div>

        {/* Action Bar (Share, LinkedIn, Print) (Hidden on print) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
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
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* ─── THE OFFICIAL CERTIFICATE CARD ─── */}
        <div 
          id="certificate-print-area"
          className="relative bg-white rounded-3xl border-8 border-slate-900 p-8 sm:p-14 shadow-xl overflow-hidden print:border-4 print:p-8 print:shadow-none"
        >
          {/* Subtle Guilloche Inner Border */}
          <div className="absolute inset-3.5 sm:inset-4 border-2 border-slate-300 rounded-2xl pointer-events-none" />
          <div className="absolute inset-5 sm:inset-6 border border-slate-200 rounded-xl pointer-events-none" />

          {/* Corner Tech Accents */}
          <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-blue-600 pointer-events-none" />
          <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-blue-600 pointer-events-none" />
          <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-blue-600 pointer-events-none" />
          <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-blue-600 pointer-events-none" />

          {/* Header */}
          <div className="text-center relative z-10 space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-black uppercase tracking-widest border border-blue-200">
              <Sparkles size={14} className="text-blue-600" />
              <span>CodeHost Cloud Infrastructure Authority</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase font-serif pt-2">
              Certificate of Cloud Deployment
            </h1>
            <p className="text-xs sm:text-sm font-semibold tracking-widest text-slate-400 uppercase">
              Official Production Engineering Credential
            </p>
          </div>

          {/* Body Statement */}
          <div className="text-center relative z-10 space-y-4 max-w-2xl mx-auto my-8">
            <p className="text-xs sm:text-sm text-slate-500 font-medium uppercase tracking-wider">
              This credential is officially conferred to
            </p>

            <div className="py-2 border-b-2 border-slate-900 inline-block px-8 sm:px-16 min-w-[280px]">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {data.recipientName}
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed pt-2">
              who has demonstrated technical mastery by configuring, building, and successfully deploying a 
              live cloud production environment on CodeHost container virtualization infrastructure for the service:
            </p>

            <div className="inline-flex flex-wrap items-center justify-center gap-2 py-2 px-5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-mono font-black text-base text-blue-600">
                {data.projectName}
              </span>
              <a
                href={data.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 print:text-slate-700"
              >
                <span>({data.projectName}.code-host.online)</span>
                <ExternalLink size={12} className="print:hidden" />
              </a>
            </div>
          </div>

          {/* Certificate Metadata Grid & QR Code */}
          <div className="relative z-10 pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Meta Items */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-left w-full sm:w-auto">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Certificate ID</p>
                <p className="font-mono font-black text-xs sm:text-sm text-slate-900">{data.certNumber}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Issuance</p>
                <p className="font-semibold text-xs sm:text-sm text-slate-900">{issueDateFormatted}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Runtime Stack</p>
                <p className="font-semibold text-xs sm:text-sm text-slate-900">{data.framework}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <p className="font-bold text-xs sm:text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active & Verified
                </p>
              </div>
            </div>

            {/* Official Scannable Verification QR Code */}
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right shrink-0">
              <div className="p-2 bg-white rounded-xl border border-slate-300 shadow-xs mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt={`QR Code verification for ${data.certNumber}`}
                  width={110}
                  height={110}
                  className="rounded"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Scan to Verify Authenticity
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                code-host.online/certificate/{data.certNumber}
              </p>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="relative z-10 pt-8 mt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="text-left">
              <div className="h-0.5 w-32 bg-slate-900 mb-1" />
              <p className="text-xs font-bold text-slate-900">CodeHost Cloud Registry</p>
              <p className="text-[10px] text-slate-500">Autonomous Infrastructure Engine</p>
            </div>

            {/* Official Badge Stamp */}
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <Award size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── VIRAL ORGANIC CONVERSION CARD (Hidden on print) ─── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold text-blue-100">
              <Sparkles size={14} className="text-amber-300" />
              <span>Free Student & Developer Cloud Hosting</span>
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-100 text-blue-600 font-extrabold text-sm rounded-2xl shadow-md transition transform active:scale-98 shrink-0"
          >
            <span>Deploy Free & Claim 50 Credits</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Footer (Hidden on print) */}
        <div className="text-center text-xs text-slate-400 pt-4 print:hidden">
          <p>© {new Date().getFullYear()} CodeHost Cloud Services. All rights reserved. Registered certification record.</p>
        </div>
      </div>
    </div>
  );
}
