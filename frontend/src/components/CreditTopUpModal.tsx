"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Check, 
  ShieldCheck, 
  Loader2, 
  CreditCard,
  Flame,
  ArrowRight
} from 'lucide-react';
import { fetchApi, getErrorMessage } from '@/lib/api';
import {
  loadRazorpayScript,
  type RazorpayFailureResponse,
  type RazorpaySuccessResponse,
  type RazorpayWindow,
} from '@/lib/razorpay';

export interface CreditTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
  initialCredits?: number;
  initialPlanType?: 'hackathon' | null;
}

interface PackageItem {
  credits: number;
  priceInr: number;
  priceUsd: number;
  label: string;
  badge: string | null;
  desc: string;
}

const DEFAULT_PRESET_PACKAGES: PackageItem[] = [
  { credits: 50, priceInr: 80, priceUsd: 1.00, label: 'Starter', badge: null, desc: '1 mo Basic tier' },
  { credits: 100, priceInr: 160, priceUsd: 2.00, label: 'Developer', badge: 'Popular', desc: 'Standard pack' },
  { credits: 300, priceInr: 400, priceUsd: 5.00, label: 'Team', badge: '17% OFF', desc: 'Best value for 2+ apps' },
  { credits: 600, priceInr: 720, priceUsd: 9.00, label: 'Pro Scale', badge: '25% OFF', desc: 'Heavy production loads' },
];

interface CreditPackageApiItem {
  credits: number;
  priceInr: number;
  priceUsd: number;
  label?: string;
  savings?: string | null;
}

export default function CreditTopUpModal({
  isOpen,
  onClose,
  onSuccess,
  initialCredits,
  initialPlanType = null,
}: CreditTopUpModalProps) {
  const [mode, setMode] = useState<'packages' | 'hackathon' | 'custom'>('packages');
  const [selectedCredits, setSelectedCredits] = useState<number>(100);
  const [customCredits, setCustomCredits] = useState<string>('250');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageItem[]>(DEFAULT_PRESET_PACKAGES);
  const packagesRef = React.useRef<PackageItem[]>(DEFAULT_PRESET_PACKAGES);
  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);
  const [creditPriceInr, setCreditPriceInr] = useState<number>(1.60);
  const [creditPriceUsd, setCreditPriceUsd] = useState<number>(0.02);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [user, setUser] = useState<{ email?: string; name?: string; username?: string } | null>(null);

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      if (!isOpen) {
        setError(null);
        setSuccess(null);
        setLoading(false);
        return;
      }

      void loadRazorpayScript();

      if (initialPlanType === 'hackathon') {
        setMode('hackathon');
      } else if (initialCredits) {
        const match = packagesRef.current.find(p => p.credits === initialCredits);
        if (match) {
          setSelectedCredits(initialCredits);
          setMode('packages');
        } else {
          setCustomCredits(String(initialCredits));
          setMode('custom');
        }
      }
    }, 0);

    if (!isOpen) {
      return () => clearTimeout(resetTimer);
    }

    // Fetch user and tiers for Razorpay key & authoritative credit packages
    Promise.all([
      fetchApi('/auth/me').catch(() => null),
      fetchApi('/billing/tiers').catch(() => null),
    ]).then(([userData, tiersData]) => {
      if (userData?.user) {
        setUser(userData.user);
      }
      if (tiersData?.razorpayKeyId) {
        setRazorpayKeyId(tiersData.razorpayKeyId);
      }
      if (typeof tiersData?.creditPriceInr === 'number') {
        setCreditPriceInr(tiersData.creditPriceInr);
      }
      if (typeof tiersData?.creditPriceUsd === 'number') {
        setCreditPriceUsd(tiersData.creditPriceUsd);
      }
      if (Array.isArray(tiersData?.creditPackages) && tiersData.creditPackages.length > 0) {
        setPackages(
          (tiersData.creditPackages as CreditPackageApiItem[]).map((p) => {
            const fallback = DEFAULT_PRESET_PACKAGES.find(d => d.credits === p.credits);
            return {
              credits: p.credits,
              priceInr: p.priceInr,
              priceUsd: p.priceUsd,
              label: fallback?.label || p.label || `${p.credits} Credits`,
              badge: p.savings ? p.savings.replace(' savings', ' OFF').toUpperCase() : (fallback?.badge || null),
              desc: fallback?.desc || `${p.credits} compute credits`,
            };
          })
        );
      }
    });

    return () => clearTimeout(resetTimer);
  }, [isOpen, initialCredits, initialPlanType]);

  if (!isOpen) return null;

  const parsedCustom = parseInt(customCredits, 10);
  const customInr = !isNaN(parsedCustom) && parsedCustom > 0 ? Math.round(parsedCustom * creditPriceInr) : 0;
  const customUsd = !isNaN(parsedCustom) && parsedCustom > 0 ? (parsedCustom * creditPriceUsd).toFixed(2) : '0.00';

  const handlePurchase = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const scriptReady = await loadRazorpayScript();
      const RazorpayCtor = (window as RazorpayWindow).Razorpay;
      if (!scriptReady || !RazorpayCtor) {
        throw new Error('Could not load secure payment gateway. Please check your internet connection.');
      }

      const orderPayload: { currency: string; planType?: string; credits?: number } = { currency: 'INR' };
      let purchaseLabel = '';
      let targetCredits = 0;

      if (mode === 'hackathon') {
        orderPayload.planType = 'hackathon';
        purchaseLabel = 'Weekend Hackathon Pass';
        targetCredits = 50;
      } else if (mode === 'custom') {
        if (isNaN(parsedCustom) || parsedCustom < 10) {
          throw new Error('Minimum custom purchase is 10 credits.');
        }
        orderPayload.credits = parsedCustom;
        targetCredits = parsedCustom;
        purchaseLabel = `${parsedCustom} Credits (Custom)`;
      } else {
        orderPayload.credits = selectedCredits;
        targetCredits = selectedCredits;
        purchaseLabel = `${selectedCredits} Credits`;
      }

      // Step 1: Create order on backend
      const orderData = await fetchApi('/billing/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      const key = orderData.key_id || orderData.keyId || razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      // Step 2: Open Razorpay checkout
      const options = {
        key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CodeHost',
        description: purchaseLabel,
        order_id: orderData.order_id || orderData.orderId,
        prefill: {
          name: user?.name || user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563EB',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          try {
            // Step 3: Verify signature on backend
            const verifyPayload: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
              planType?: string;
              credits?: number;
            } = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            if (mode === 'hackathon') {
              verifyPayload.planType = 'hackathon';
            } else {
              verifyPayload.credits = targetCredits;
            }

            const verifyRes = await fetchApi('/billing/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify(verifyPayload),
            });

            if (verifyRes.success) {
              setSuccess(
                mode === 'hackathon'
                  ? 'Hackathon Pass activated! 72 hours of Pro access and 50 credits added.'
                  : `Success! ${targetCredits} credits have been added to your wallet.`
              );

              // Refresh wallet balance
              try {
                const walletRes = await fetchApi('/billing/wallet');
                if (walletRes?.wallet?.balance !== undefined) {
                  onSuccess?.(walletRes.wallet.balance);
                }
              } catch {
                // Ignore secondary fetch failure
              }

              setTimeout(() => {
                onClose();
              }, 1800);
            } else {
              setError(verifyRes.error || 'Payment verification failed. Please contact support.');
            }
          } catch (verifyErr: unknown) {
            setError(getErrorMessage(verifyErr, 'Payment verification failed.'));
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', function (resp: RazorpayFailureResponse) {
        setError(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to initiate purchase. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <Zap size={22} className="fill-current text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Buy Compute Credits</h2>
            <p className="text-xs text-slate-500 font-medium">Keep your servers active with zero interruption</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-2xl mb-6 text-xs font-black">
          <button
            type="button"
            onClick={() => setMode('packages')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'packages'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Credit Packs
          </button>
          <button
            type="button"
            onClick={() => setMode('hackathon')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer ${
              mode === 'hackathon'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame size={13} className="text-orange-500 fill-orange-500" />
            <span>Weekend Pass</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              mode === 'custom'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-50 text-red-700 rounded-2xl text-xs font-bold border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-5 p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold border border-emerald-200 flex items-center space-x-2">
            <Check size={16} className="shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Content Mode 1: Credit Packages */}
        {mode === 'packages' && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {packages.map((pkg) => {
              const isSelected = selectedCredits === pkg.credits;
              return (
                <button
                  key={pkg.credits}
                  type="button"
                  onClick={() => setSelectedCredits(pkg.credits)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-500/10'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      {pkg.badge}
                    </span>
                  )}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.label}</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {pkg.credits} <span className="text-xs font-semibold text-slate-400">credits</span>
                  </div>
                  <div className="text-sm font-black text-blue-600 mt-2">
                    ₹{pkg.priceInr} <span className="text-[10px] text-slate-400 font-semibold">(${pkg.priceUsd.toFixed(2)})</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">{pkg.desc}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Mode 2: Weekend Hackathon Pass */}
        {mode === 'hackathon' && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border-2 border-orange-500/30">
            <div className="flex items-center space-x-2 text-orange-600 font-black text-xs uppercase tracking-wider mb-2">
              <Flame size={16} className="fill-orange-500" />
              <span>72-Hour Pro Boost · ₹49 Only</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Weekend Hackathon Pass</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Supercharge your build with 72 hours of uninterrupted Pro tier resources (2 vCPUs, 512MB RAM, 5GB disk) plus 50 bonus credits to keep going.
            </p>
            <div className="space-y-2 text-xs font-bold text-slate-700">
              <div className="flex items-center space-x-2">
                <Check size={14} className="text-emerald-500" />
                <span>Immediate Pro tier upgrade for 72 hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check size={14} className="text-emerald-500" />
                <span>50 permanent credits added to your wallet</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check size={14} className="text-emerald-500" />
                <span>Deploy up to 5 concurrent projects</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-orange-200/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Flat one-time fee:</span>
              <span className="text-xl font-black text-orange-600">₹49 <span className="text-xs font-bold text-slate-400">(~$0.59)</span></span>
            </div>
          </div>
        )}

        {/* Content Mode 3: Custom Credits */}
        {mode === 'custom' && (
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Enter Desired Credits
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none text-base font-black text-slate-900 placeholder-slate-400"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">credits</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                Rate: ₹1.60 per credit (~$0.02). Minimum purchase: 10 credits.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500">Total payable:</span>
                <div className="text-xl font-black text-slate-900">
                  ₹{customInr} <span className="text-xs font-bold text-slate-400">(${customUsd})</span>
                </div>
              </div>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                {parsedCustom || 0} credits
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handlePurchase}
          disabled={loading || (mode === 'custom' && (isNaN(parsedCustom) || parsedCustom < 10))}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Processing Secure Checkout...</span>
            </>
          ) : (
            <>
              <CreditCard size={18} />
              <span>
                {mode === 'hackathon' 
                  ? 'Get Hackathon Pass · ₹49' 
                  : mode === 'custom' 
                    ? `Pay ₹${customInr} Securely` 
                    : `Pay ₹${packages.find(p => p.credits === selectedCredits)?.priceInr || 160} Securely`}
              </span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div className="mt-4 flex items-center justify-center space-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center space-x-1">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span>256-Bit SSL Secure</span>
          </div>
          <span>&bull;</span>
          <span>Instant Credit Activation</span>
          <span>&bull;</span>
          <span>Razorpay</span>
        </div>
      </div>
    </div>
  );
}
