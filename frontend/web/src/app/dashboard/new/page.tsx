"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import PanelLayout from '@/components/PanelLayout';
import { Check, Code, Settings, Loader2, Cpu, HardDrive, Database, Layers } from 'lucide-react';

interface TierInfo {
  id: string;
  label: string;
  memory: number;
  cpus: number;
  storage: number;
  creditsPerMonth: number;
  maxProjects: number;
  priceInr: number;
}

export default function NewProject() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string; username: string; role: string } | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    Promise.all([
      fetchApi('/auth/me'),
      fetchApi('/billing/tiers'),
      fetchApi('/billing/wallet'),
    ])
      .then(([authRes, tierRes, walletRes]) => {
        setUser(authRes.user);
        setTiers(tierRes.tiers);
        setWalletBalance(walletRes.wallet.balance);
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  };

  const selectedTier = tiers.find(t => t.id === tier);

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchApi('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.toLowerCase(), tier }),
      });
      router.push(`/dashboard/project/${data.project.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <PanelLayout user={user} projectName="New Project">
      <div className="max-w-4xl mx-auto py-8">
        {/* Wizard Steps */}
        <nav aria-label="Progress" className="mb-12">
          <ol role="list" className="flex items-center justify-center space-x-12">
            {[
              { id: 1, label: 'Information', icon: Settings },
              { id: 2, label: 'Plan', icon: Layers },
              { id: 3, label: 'Deploy', icon: Code },
            ].map((s) => (
              <li key={s.id} className="flex items-center group">
                <div className={`flex items-center space-x-3 transition-all ${step >= s.id ? 'opacity-100' : 'opacity-40'}`}>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all ${
                    step === s.id ? 'bg-blue-600 text-white scale-110' :
                    step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step > s.id ? <Check size={20} /> : <s.icon size={20} />}
                  </span>
                  <span className={`text-sm font-black uppercase tracking-widest ${step >= s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {s.id < 3 && <div className="ml-12 w-16 h-px bg-slate-200" />}
              </li>
            ))}
          </ol>
        </nav>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Name Your Project</h2>
              <p className="mt-2 text-slate-500 font-medium">Choose a unique name. This will be your permanent app identifier.</p>
            </div>

            <div className="max-w-md mx-auto space-y-8">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 px-1">Project Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Code size={18} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    className="block w-full rounded-2xl border-2 border-slate-100 py-4 pl-12 pr-4 text-slate-900 font-semibold focus:border-blue-600 focus:ring-0 transition-all outline-none bg-slate-50/50 focus:bg-white sm:text-lg"
                    placeholder="my-cool-app"
                  />
                </div>
                {name.length > 0 && (
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <p className="text-xs text-blue-700/70 font-bold uppercase tracking-widest mb-1 items-center flex">
                      <Check className="h-3 w-3 mr-1.5" />
                      Public Preview URL
                    </p>
                    <p className="font-mono text-sm text-blue-900 font-bold break-all">
                      {name || 'my-app'}.code-host.online
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setError(''); setStep(2); }}
                disabled={name.length < 3}
                className="w-full rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-30 transition-all hover:-translate-y-1 active:translate-y-0.5 flex items-center justify-center space-x-2"
              >
                <span>Next: Choose Plan</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Tier Selection */}
        {step === 2 && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Choose a Plan</h2>
              <p className="mt-2 text-slate-500 font-medium">
                Select resources for your project. Wallet balance: <span className="font-black text-slate-900">{walletBalance} credits</span>
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 mb-6">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {tiers.map((t) => {
                const isSelected = tier === t.id;
                const canAfford = t.creditsPerMonth === 0 || walletBalance >= t.creditsPerMonth;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTier(t.id)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-500/10'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    } ${!canAfford ? 'opacity-50' : ''}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="text-lg font-black text-slate-900 mb-1">{t.label}</h3>
                    <div className="text-2xl font-black text-slate-900 mb-4">
                      {t.creditsPerMonth === 0 ? (
                        <span className="text-emerald-600">Free</span>
                      ) : (
                        <>
                          {t.creditsPerMonth} <span className="text-sm font-bold text-slate-400">credits/mo</span>
                        </>
                      )}
                    </div>
                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <HardDrive size={12} className="text-blue-500" />
                        <span>{formatBytes(t.memory)} RAM</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cpu size={12} className="text-purple-500" />
                        <span>{t.cpus} {t.cpus === 1 ? 'core' : 'cores'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Database size={12} className="text-emerald-500" />
                        <span>{formatBytes(t.storage)} storage</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Layers size={12} className="text-orange-500" />
                        <span>Max {t.maxProjects} project{t.maxProjects > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {t.priceInr > 0 && (
                      <p className="mt-3 text-[10px] font-bold text-slate-400">≈ ₹{t.priceInr}/month</p>
                    )}
                    {!canAfford && t.creditsPerMonth > 0 && (
                      <p className="mt-2 text-[10px] font-bold text-red-500">Insufficient credits</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-4 max-w-md mx-auto">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-2xl border-2 border-slate-200 px-6 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || (selectedTier && selectedTier.creditsPerMonth > 0 && walletBalance < selectedTier.creditsPerMonth)}
                className="flex-1 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center space-x-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <span>Create Project</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
