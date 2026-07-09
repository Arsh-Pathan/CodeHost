"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  priceInr: number;
  label: string;
  savings: string | null;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    // Load Razorpay checkout script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
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
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(pkg.credits);
    try {
      const orderData = await fetchApi('/billing/purchase', {
        method: 'POST',
        body: JSON.stringify({ credits: pkg.credits }),
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CodeHost',
        description: `${pkg.credits} Credits`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await fetchApi('/billing/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                credits: pkg.credits,
                amount: orderData.amount,
              }),
            });
            // Refresh wallet and transactions
            const [walletRes, txRes] = await Promise.all([
              fetchApi('/billing/wallet'),
              fetchApi('/billing/transactions'),
            ]);
            setWallet(walletRes.wallet);
            setTransactions(txRes.transactions);
          } catch (err) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          email: user?.email,
        },
        theme: {
          color: '#2563EB',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate payment');
    } finally {
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
        {/* Wallet Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Wallet Balance</p>
              <div className="flex items-baseline space-x-3">
                <span className="text-6xl font-black">{wallet?.balance || 0}</span>
                <span className="text-slate-400 font-bold text-lg">credits</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">1 credit = ₹2</p>
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
            Buy Credits
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
                <div className="flex items-baseline space-x-1 mb-2">
                  <span className="text-3xl font-black text-slate-900">₹{pkg.priceInr}</span>
                </div>
                {pkg.savings && (
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                    {pkg.savings}
                  </span>
                )}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                  className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center space-x-2"
                >
                  {purchasing === pkg.credits ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Buy Now</span>
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
                        <span className={`flex items-center justify-end space-x-1 text-sm font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          <span>{tx.amount > 0 ? '+' : ''}{tx.amount}</span>
                        </span>
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
