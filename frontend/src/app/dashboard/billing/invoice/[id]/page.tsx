"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { Printer, ArrowLeft, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  wallet: {
    user: {
      email: string;
      name: string | null;
      username: string;
    };
  };
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/billing/transactions/${id}`)
      .then((res) => {
        setTransaction(res.transaction);
      })
      .catch((err) => {
        alert(err.message || 'Invoice not found');
        router.push('/dashboard/billing');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!transaction) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Actions - Hidden on print */}
        <div className="flex items-center justify-between print:hidden">
          <Link href="/dashboard/billing">
            <button className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={16} />
              <span>Back to Billing</span>
            </button>
          </Link>
          <button 
            onClick={() => window.print()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-md hover:shadow-lg"
          >
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>

        {/* Invoice Paper */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 print:shadow-none print:border-none print:p-0">
          
          <div className="flex justify-between items-start border-b border-slate-100 pb-10">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="text-white" size={20} />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">CodeHost</span>
              </div>
              <p className="text-sm text-slate-500 font-medium max-w-xs">
                CodeHost Online Services<br/>
                contact@code-host.online
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-4xl font-black text-slate-200 tracking-tighter uppercase mb-2">Invoice</h1>
              <p className="text-sm font-bold text-slate-900">#{transaction.id.split('-')[0].toUpperCase()}</p>
              <p className="text-xs text-slate-500 mt-1">Date: {new Date(transaction.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 py-10 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</p>
              <h3 className="text-lg font-bold text-slate-900">{transaction.wallet.user.name || transaction.wallet.user.username}</h3>
              <p className="text-sm text-slate-500">{transaction.wallet.user.email}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Details</p>
              {transaction.razorpayPaymentId ? (
                <>
                  <p className="text-sm text-slate-900 font-medium"><span className="font-bold">Order ID:</span> {transaction.razorpayOrderId}</p>
                  <p className="text-sm text-slate-900 font-medium"><span className="font-bold">Payment ID:</span> {transaction.razorpayPaymentId}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-md">Paid</span>
                </>
              ) : (
                <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-md">{transaction.type.replace('_', ' ')}</span>
              )}
            </div>
          </div>

          <div className="py-10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-black text-slate-400 uppercase tracking-widest pb-4">Description</th>
                  <th className="text-right text-xs font-black text-slate-400 uppercase tracking-widest pb-4">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-6 border-b border-slate-100 text-sm font-bold text-slate-900">
                    {transaction.description || 'Credit Purchase'}
                  </td>
                  <td className="py-6 border-b border-slate-100 text-sm font-bold text-slate-900 text-right">
                    {transaction.amount} Credits
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-6">
            <div className="w-64">
              <div className="flex justify-between items-center py-2 text-sm text-slate-500 font-medium">
                <span>Subtotal</span>
                <span>{transaction.amount} Credits</span>
              </div>
              <div className="flex justify-between items-center py-4 border-t border-slate-200 mt-2">
                <span className="text-base font-black text-slate-900">Total</span>
                <span className="text-2xl font-black text-slate-900">{transaction.amount} <span className="text-sm text-slate-500 font-bold">Credits</span></span>
              </div>
              <p className="text-right text-[10px] text-slate-400 mt-2">All amounts are in CodeHost Credits.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
