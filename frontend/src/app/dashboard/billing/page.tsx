"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi, API_URL } from '@/lib/api';
import PanelLayout from '@/components/PanelLayout';
import { CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Loader2, Zap, Package } from 'lucide-react';

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

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; username: string; name?: string | null; role: string } | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRazorpayScript();
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
        setTransactions(txRes.transactions);
        setPackages(tierRes.creditPackages);
        if (tierRes.razorpayKeyId) {
          setRazorpayKeyId(tierRes.razorpayKeyId);
        }
      })
      .catch((err: any) => { if (err.status === 401 || err.status === 403) router.push('/login') })
      .finally(() => setLoading(false));
  }, [router]);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPaymentError(null);
    setPaymentSuccess(null);
    setPurchasing(pkg.credits);

    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Failed to load Razorpay payment gateway. Please check your internet connection.');
      }

      // Step 1: Create order on backend
      const orderData = await fetchApi('/billing/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({ credits: pkg.credits, currency: 'INR' }),
      });

      const key = orderData.key_id || orderData.keyId || razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      // Step 2: Open Razorpay checkout modal
      const options = {
        key,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CodeHost',
        description: `${pkg.label} (${pkg.credits} Credits)`,
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
        handler: async function (response: any) {
          // Step 3: Verify payment signature on backend
          try {
            const verifyRes = await fetchApi('/billing/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                credits: pkg.credits,
              }),
            });

            if (verifyRes.success) {
              setPaymentSuccess(`Payment successful! ${pkg.credits} credits have been added to your wallet.`);
              // Refresh wallet & transactions
              const [walletRes, txRes] = await Promise.all([
                fetchApi('/billing/wallet'),
                fetchApi('/billing/transactions'),
              ]);
              setWallet(walletRes.wallet);
              setTransactions(txRes.transactions);
            } else {
              setPaymentError(verifyRes.error || 'Payment verification failed');
            }
          } catch (verifyErr: any) {
            setPaymentError(verifyErr.message || 'Payment verification failed');
          } finally {
            setPurchasing(null);
          }
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setPaymentError(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
        setPurchasing(null);
      });
      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to initiate payment');
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <PanelLayout user={user} projectName="Billing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout user={user} projectName="Billing">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Alerts */}
        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center justify-between text-sm font-bold shadow-sm">
            <span>{paymentSuccess}</span>
            <button onClick={() => setPaymentSuccess(null)} className="text-emerald-600 hover:text-emerald-900 ml-4 font-black">✕</button>
          </div>
        )}
        {paymentError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-2xl flex items-center justify-between text-sm font-bold shadow-sm">
            <span>{paymentError}</span>
            <button onClick={() => setPaymentError(null)} className="text-red-600 hover:text-red-900 ml-4 font-black">✕</button>
          </div>
        )}

        {/* Wallet Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Wallet Balance</p>
              <div className="flex items-baseline space-x-3">
                <span className="text-6xl font-black">{wallet?.balance || 0}</span>
                <span className="text-slate-400 font-bold text-lg">credits</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">100 credits = ₹160 ($2.00)</p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-blue-600/20 flex items-center justify-center">
              <Wallet size={36} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Buy Credits */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center">
            <Package size={16} className="mr-2 text-blue-600" />
            Buy Credits (Razorpay Checkout)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.credits}
                className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-black text-slate-900">{pkg.credits}</h3>
                  <Zap size={20} className="text-yellow-500" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Credits</p>
                <div className="flex items-baseline space-x-2 mb-2">
                  <span className="text-3xl font-black text-slate-900">
                    {pkg.priceInr ? `₹${pkg.priceInr}` : `$${pkg.priceUsd.toFixed(2)}`}
                  </span>
                  {pkg.priceInr && (
                    <span className="text-xs font-bold text-slate-400">
                      (${pkg.priceUsd.toFixed(2)})
                    </span>
                  )}
                </div>
                {pkg.savings && (
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                    {pkg.savings}
                  </span>
                )}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                  className="w-full mt-4 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20"
                >
                  {purchasing === pkg.credits ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Pay with Razorpay</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6">Transaction History</h2>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm font-medium">
                No transactions yet. Purchase credits to get started.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="text-left p-4 pl-6">Date</th>
                    <th className="text-left p-4">Type</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-right p-4 pr-6">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 text-xs font-medium text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          tx.type === 'purchase' ? 'bg-blue-50 text-blue-600' :
                          tx.type === 'tier_charge' ? 'bg-orange-50 text-orange-600' :
                          tx.type === 'refund' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {tx.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-600">{tx.description || '-'}</td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`flex items-center space-x-1 text-sm font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            <span>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                          </span>
                          {(tx.type === 'purchase' || tx.type === 'admin_grant') && (
                            <Link href={`/dashboard/billing/invoice/${tx.id}`}>
                              <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                View Invoice
                              </button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PanelLayout>
  );
}
