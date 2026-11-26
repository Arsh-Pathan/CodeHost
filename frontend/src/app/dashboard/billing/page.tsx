"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, getErrorMessage, getErrorStatus, clearClientAuth } from '@/lib/api';
import {
  loadRazorpayScript,
  type RazorpayFailureResponse,
  type RazorpaySuccessResponse,
  type RazorpayWindow,
} from '@/lib/razorpay';
import PanelLayout from '@/components/PanelLayout';
import { 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  Zap, 
  Package, 
  Sliders, 
  Flame,
  ShieldCheck,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface WalletData {
  id: string;
  balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
}

interface CreditPackage {
  credits: number;
  priceUsd: number;
  priceInr?: number;
  label: string;
  savings: string | null;
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCredits = searchParams?.get('credits');
  const isHackathonParam = searchParams?.get('hackathon') === 'true';

  const [user, setUser] = useState<{ email: string; username: string; name?: string | null; role: string } | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<number | string>(() => {
    const parsed = initialCredits ? parseInt(initialCredits, 10) : NaN;
    return !isNaN(parsed) && parsed >= 10 ? parsed : 250;
  });
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [selectedTxFilter, setSelectedTxFilter] = useState<'all' | 'purchase' | 'tier_charge' | 'other'>('all');

  const parsedCustomCredits = typeof customAmount === 'string' ? parseInt(customAmount, 10) : customAmount;
  const customPriceInr = (!isNaN(parsedCustomCredits) && parsedCustomCredits > 0) ? Math.round(parsedCustomCredits * 1.60) : 0;
  const customPriceUsd = (!isNaN(parsedCustomCredits) && parsedCustomCredits > 0) ? (parsedCustomCredits * 0.02).toFixed(2) : '0.00';

  useEffect(() => {
    void loadRazorpayScript();
  }, []);

  useEffect(() => {
    Promise.all([
      fetchApi('/auth/me'),
      fetchApi('/billing/wallet'),
      fetchApi('/billing/transactions'),
      fetchApi('/billing/tiers'),
    ])
      .then(([authRes, walletRes, txRes, tierRes]) => {
        setUser(authRes.user);
        setWallet(walletRes.wallet);
        setTransactions(txRes.transactions || []);
        setPackages(tierRes.creditPackages || []);
        if (tierRes.razorpayKeyId) {
          setRazorpayKeyId(tierRes.razorpayKeyId);
        }
      })
      .catch((err: unknown) => {
        const status = getErrorStatus(err);
        if (status === 401 || status === 403 || status === 404) {
          clearClientAuth();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handlePurchaseHackathon = async () => {
    setPaymentError(null);
    setPaymentSuccess(null);
    setPurchasing(-1);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      const RazorpayCtor = (window as RazorpayWindow).Razorpay;
      if (!isScriptLoaded || !RazorpayCtor) {
        throw new Error('Failed to load secure payment gateway. Please check your internet connection.');
      }

      const orderData = await fetchApi('/billing/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({ planType: 'hackathon', currency: 'INR' }),
      });

      const key = orderData.key_id || orderData.keyId || razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      const options = {
        key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CodeHost',
        description: 'Weekend Hackathon Pass (72h Pro Access)',
        order_id: orderData.order_id || orderData.orderId,
        prefill: {
          name: user?.name || user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: function () {
            setPurchasing(null);
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          try {
            const verifyRes = await fetchApi('/billing/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType: 'hackathon',
              }),
            });

            if (verifyRes.success) {
              setPaymentSuccess('Weekend Hackathon Pass activated! Pro features unlocked for 72 hours.');
              const [walletRes, txRes] = await Promise.all([
                fetchApi('/billing/wallet'),
                fetchApi('/billing/transactions'),
              ]);
              setWallet(walletRes.wallet);
              setTransactions(txRes.transactions || []);
            } else {
              setPaymentError(verifyRes.error || 'Payment verification failed');
            }
          } catch (verifyErr: unknown) {
            setPaymentError(getErrorMessage(verifyErr, 'Payment verification failed'));
          } finally {
            setPurchasing(null);
          }
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', function (response: RazorpayFailureResponse) {
        setPaymentError(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        setPurchasing(null);
      });
      rzp.open();
    } catch (err: unknown) {
      setPaymentError(getErrorMessage(err, 'Failed to initiate payment'));
      setPurchasing(null);
    }
  };

  const handlePurchase = async (creditsToBuy: number, label?: string) => {
    if (!creditsToBuy || isNaN(creditsToBuy) || creditsToBuy < 10) {
      setPaymentError('Minimum purchase is 10 credits');
      return;
    }

    setPaymentError(null);
    setPaymentSuccess(null);
    setPurchasing(creditsToBuy);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      const RazorpayCtor = (window as RazorpayWindow).Razorpay;
      if (!isScriptLoaded || !RazorpayCtor) {
        throw new Error('Failed to load secure payment gateway. Please check your internet connection.');
      }

      // Step 1: Create order on backend
      const orderData = await fetchApi('/billing/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({ credits: creditsToBuy, currency: 'INR' }),
      });

      const key = orderData.key_id || orderData.keyId || razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      // Step 2: Open checkout modal
      const options = {
        key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CodeHost',
        description: label || `${creditsToBuy} Credits`,
        order_id: orderData.order_id || orderData.orderId,
        prefill: {
          name: user?.name || user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        modal: {
          ondismiss: function () {
            setPurchasing(null);
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          // Step 3: Verify payment signature on backend
          try {
            const verifyRes = await fetchApi('/billing/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                credits: creditsToBuy,
              }),
            });

            if (verifyRes.success) {
              setPaymentSuccess(`Payment successful! ${creditsToBuy} credits have been added to your wallet.`);
              // Refresh wallet & transactions
              const [walletRes, txRes] = await Promise.all([
                fetchApi('/billing/wallet'),
                fetchApi('/billing/transactions'),
              ]);
              setWallet(walletRes.wallet);
              setTransactions(txRes.transactions || []);
            } else {
              setPaymentError(verifyRes.error || 'Payment verification failed');
            }
          } catch (verifyErr: unknown) {
            setPaymentError(getErrorMessage(verifyErr, 'Payment verification failed'));
          } finally {
            setPurchasing(null);
          }
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', function (response: RazorpayFailureResponse) {
        setPaymentError(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        setPurchasing(null);
      });
      rzp.open();
    } catch (err: unknown) {
      setPaymentError(getErrorMessage(err, 'Failed to initiate payment'));
      setPurchasing(null);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedTxFilter === 'all') return true;
    if (selectedTxFilter === 'purchase') return tx.type === 'purchase' || tx.type === 'admin_grant';
    if (selectedTxFilter === 'tier_charge') return tx.type === 'tier_charge' || tx.type === 'compute_usage';
    if (selectedTxFilter === 'other') return tx.type !== 'purchase' && tx.type !== 'admin_grant' && tx.type !== 'tier_charge' && tx.type !== 'compute_usage';
    return true;
  });

  const walletBalance = wallet?.balance || 0;
  const inrEquivalent = Math.round(walletBalance * 1.60);
  const usdEquivalent = (walletBalance * 0.02).toFixed(2);

  if (loading) {
    return (
      <PanelLayout user={user} projectName="Billing">
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Wallet &amp; Billing...</p>
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout
      user={user}
      projectName="Billing"
      walletBalance={wallet?.balance}
      onBalanceUpdate={(newBal) => setWallet((prev) => (prev ? { ...prev, balance: newBal } : { id: '', balance: newBal }))}
    >
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* Toast Alerts */}
        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-sm animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{paymentSuccess}</span>
            </div>
            <button onClick={() => setPaymentSuccess(null)} className="text-emerald-600 hover:text-emerald-900 ml-4 font-black text-sm">✕</button>
          </div>
        )}
        {paymentError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-6 py-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-sm animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{paymentError}</span>
            </div>
            <button onClick={() => setPaymentError(null)} className="text-rose-600 hover:text-rose-900 ml-4 font-black text-sm">✕</button>
          </div>
        )}

        {/* Preselected Credits Banner (from external query link) */}
        {initialCredits && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white border-2 border-blue-200 text-blue-900 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100/80 px-2.5 py-1 rounded-full">
                Pre-Configured Plan
              </span>
              <p className="text-base font-black text-slate-900 mt-2">
                {initialCredits === '50' ? 'Starter Tier' : initialCredits === '150' ? 'Pro Tier' : initialCredits === '400' ? 'Team Tier' : 'Custom Top-Up'} ({initialCredits} Credits &middot; ₹{Math.round(parseInt(initialCredits, 10) * 1.60)})
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Instant activation via UPI, Cards, or NetBanking.</p>
            </div>
            <button
              onClick={() => handlePurchase(parseInt(initialCredits, 10), `Top-Up (${initialCredits} Credits)`)}
              disabled={purchasing !== null}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0 cursor-pointer active:scale-95"
            >
              {purchasing === parseInt(initialCredits, 10) ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Checkout Now</span>
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

        {/* HERO COMMAND CENTER: WALLET + RUNWAY METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Wallet Glassmorphic Card (2 Cols) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#1E293B] rounded-3xl p-7 sm:p-8 text-white shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Compute Credits Wallet</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Billed per-second &middot; Never expires</p>
                </div>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Balance</span>
              </div>
            </div>

            {/* Big Balance Number */}
            <div className="my-7 relative z-10">
              <div className="flex items-baseline space-x-3">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-white font-mono">
                  {walletBalance.toLocaleString()}
                </span>
                <span className="text-blue-400 font-black text-sm uppercase tracking-wider">Credits</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400 font-medium">
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                  &asymp; ₹{inrEquivalent.toLocaleString()} INR
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                  &asymp; ${usdEquivalent} USD
                </span>
                <span className="text-slate-500">Rate: 1 credit = ₹1.60</span>
              </div>
            </div>

            {/* Card Bottom Features Bar */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs relative z-10">
              <div className="flex items-center space-x-2 text-slate-300">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium">Zero-Overage Guarantee: Containers pause safely if empty</span>
              </div>
              <a
                href="#top-up-packages"
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Quick Top-Up</span>
                <ChevronRight size={14} />
              </a>
            </div>
          </div>

          {/* Side Mini Metric Cards (1 Col) */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Scale-to-Zero Savings Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Efficiency</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                  Scale-to-Zero
                </span>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 flex items-center space-x-1">
                  <span>₹0.00 / hr</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  When your apps are idle for 30 minutes, container instances sleep automatically. Zero credits burned until the next HTTP hit wakes them.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-emerald-600 font-bold space-x-1">
                <CheckCircle2 size={13} />
                <span>Permanent Free Tier Protected</span>
              </div>
            </div>

            {/* Security & Payment Badges Card */}
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 text-xs text-slate-600 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs mb-2">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Instant Verified Payments</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Protected by 256-bit encryption. UPI (GPay, PhonePe, Paytm), Cards, and NetBanking supported via Razorpay.
              </p>
              <div className="mt-3 flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Instant Activation</span>
                <span>&bull;</span>
                <span>Payment Receipts</span>
              </div>
            </div>

          </div>
        </div>

        {/* WEEKEND HACKATHON PASS SPECIAL CARD */}
        <div className={`rounded-3xl p-7 sm:p-8 border-2 transition-all text-white relative overflow-hidden ${isHackathonParam ? 'bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border-blue-400 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/20' : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-800 shadow-xl'}`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                <Flame size={13} className="text-amber-400" />
                <span>High-Velocity Hackathon Pass</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">Weekend Hackathon Pass &mdash; ₹49 for 72 Hours</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Building at a hackathon this weekend? Unlock instant Pro compute: 2 vCPUs, 512MB RAM, up to 5 projects, +50 bonus credits, and free SSL subdomains with zero recurring commitment.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span className="flex items-center space-x-1"><CheckCircle2 size={13} className="text-emerald-400" /><span>2 vCPUs Turbo</span></span>
                <span className="flex items-center space-x-1"><CheckCircle2 size={13} className="text-emerald-400" /><span>512MB RAM &amp; Up to 5 Projects</span></span>
                <span className="flex items-center space-x-1"><CheckCircle2 size={13} className="text-emerald-400" /><span>+50 Bonus Credits Included</span></span>
                <span className="flex items-center space-x-1"><CheckCircle2 size={13} className="text-emerald-400" /><span>Expires Cleanly (₹0 Surprise)</span></span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full lg:w-auto gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <div className="text-left sm:text-right">
                <div className="flex items-baseline space-x-1">
                  <span className="text-4xl font-black text-white font-mono">₹49</span>
                  <span className="text-xs font-bold text-slate-400 uppercase">/ 72h</span>
                </div>
                <span className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">One-time payment</span>
              </div>
              <button
                onClick={handlePurchaseHackathon}
                disabled={purchasing !== null}
                className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                {purchasing === -1 ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>Activate ₹49 Pass</span>
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TOP-UP CREDIT PACKAGES */}
        <div id="top-up-packages" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
                <Package size={20} className="mr-2 text-blue-600" />
                <span>Credit Top-Up Packages</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Select a curated package or customize your exact credit amount.</p>
            </div>
            <div className="text-xs font-bold text-slate-400">
              <span>Standard Rate: ₹1.60 / Credit</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg, idx) => {
              const isPopular = pkg.credits === 100 || idx === 1;
              return (
                <div
                  key={pkg.credits}
                  className={`bg-white rounded-3xl p-6 sm:p-7 shadow-sm transition-all flex flex-col justify-between relative group ${
                    isPopular 
                      ? 'border-2 border-blue-600 shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/5 -translate-y-1' 
                      : 'border border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center space-x-1 whitespace-nowrap">
                      <Sparkles size={11} />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {pkg.label || 'Compute Pack'}
                      </span>
                      <Zap size={18} className={isPopular ? "text-amber-500" : "text-slate-400"} />
                    </div>

                    <div className="flex items-baseline space-x-1.5 mb-2">
                      <span className="text-4xl font-black text-slate-900 font-mono">{pkg.credits}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Credits</span>
                    </div>

                    <div className="flex items-baseline space-x-2 mb-3">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {pkg.priceInr ? `₹${pkg.priceInr}` : `$${pkg.priceUsd.toFixed(2)}`}
                      </span>
                      {pkg.priceInr && (
                        <span className="text-xs font-bold text-slate-400">
                          (${pkg.priceUsd.toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div className="h-6 mb-4">
                      {pkg.savings ? (
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider rounded-full">
                          {pkg.savings}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Standard ₹1.60/cr rate</span>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-slate-500 mb-6 border-t border-slate-100 pt-3">
                      <li className="flex items-center space-x-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>Instant balance credit</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>Never expires</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.credits, `${pkg.label || 'Credit Pack'} (${pkg.credits} Credits)`)}
                    disabled={purchasing !== null}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95 ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    } disabled:opacity-50`}
                  >
                    {purchasing === pkg.credits ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={14} />
                        <span>Buy {pkg.credits} Credits</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* CUSTOM AMOUNT TOP-UP CARD (ENHANCED SLIDER & CALCULATOR) */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-3xl border border-slate-200 p-7 sm:p-8 shadow-sm">
            <div className="max-w-3xl">
              <div className="flex items-center space-x-2 text-blue-600 text-xs font-black uppercase tracking-wider mb-2">
                <Sliders size={16} />
                <span>Custom Micro-Top-Up</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">Need a Specific Amount?</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Enter any amount from 10 credits upwards. Pay only for what your containers use.
              </p>

              {/* Slider & Quick Chips */}
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 mr-2">Quick Presets:</span>
                  {[50, 100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomAmount(preset)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        parsedCustomCredits === preset
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400'
                      }`}
                    >
                      +{preset} cr
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="relative w-full sm:w-64 shrink-0">
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Credits"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xl font-black text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 uppercase">credits</span>
                  </div>

                  <div className="flex items-center space-x-3 text-left w-full sm:w-auto">
                    <div>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                        ₹{customPriceInr}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ml-1.5">
                        (${customPriceUsd} USD)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(parsedCustomCredits, `Custom (${parsedCustomCredits} Credits)`)}
                    disabled={purchasing !== null || isNaN(parsedCustomCredits) || parsedCustomCredits < 10}
                    className="w-full sm:w-auto ml-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0 cursor-pointer active:scale-95"
                  >
                    {purchasing === parsedCustomCredits ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={14} />
                        <span>Pay ₹{customPriceInr} &amp; Top Up</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BILLING HISTORY & TRANSACTIONS */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
                <Clock size={20} className="mr-2 text-blue-600" />
                <span>Transaction History &amp; Receipts</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">View and print payment receipts and invoices for your records.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
              <button
                onClick={() => setSelectedTxFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTxFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedTxFilter('purchase')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTxFilter === 'purchase' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => setSelectedTxFilter('tier_charge')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedTxFilter === 'tier_charge' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Usage Charges
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No transactions recorded</p>
                <p className="text-xs text-slate-400">Transactions and receipt downloads will appear here as you deploy apps.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="text-left p-4 pl-6">Date</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Description</th>
                      <th className="text-right p-4">Credits</th>
                      <th className="text-right p-4 pr-6">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 pl-6 text-xs font-medium text-slate-500 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              tx.type === 'purchase' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              tx.type === 'tier_charge' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              tx.type === 'refund' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              <span>{tx.type.replace('_', ' ')}</span>
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-700">{tx.description || '-'}</td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-0.5 text-xs font-black font-mono ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {isCredit ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} className="text-slate-400" />}
                              <span>{isCredit ? '+' : ''}{tx.amount} cr</span>
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right whitespace-nowrap">
                            {(tx.type === 'purchase' || tx.type === 'admin_grant') && tx.amount > 0 ? (
                              <Link
                                href={`/dashboard/billing/invoice/${tx.id}`}
                                className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg"
                              >
                                <FileText size={12} />
                                <span>Receipt</span>
                              </Link>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </PanelLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
