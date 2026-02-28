"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, Check, Code, Search, Settings } from 'lucide-react';

export default function NewProject() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Create the project record
      const data = await fetchApi('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.toLowerCase() }),
      });
      
      // Navigate to project layout where they can upload zip
      router.push(`/dashboard/project/${data.project.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
             <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition">
               <ArrowLeft className="h-5 w-5" />
             </Link>
             <h1 className="text-lg font-semibold text-slate-900">Create New Project</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Wizard Steps */}
        <nav aria-label="Progress" className="mb-12">
          <ol role="list" className="flex items-center justify-center space-x-8">
            <li className="flex items-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'border-2 border-slate-300 bg-white text-slate-500'}`}>
                1
              </span>
              <span className={`ml-3 text-sm font-medium ${step >= 1 ? 'text-blue-600' : 'text-slate-500'}`}>Information</span>
            </li>
            <div className="w-16 border-t-2 border-slate-200"></div>
            <li className="flex items-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'border-2 border-slate-300 bg-white text-slate-500'}`}>
                2
              </span>
              <span className={`ml-3 text-sm font-medium ${step >= 2 ? 'text-blue-600' : 'text-slate-500'}`}>Deploy</span>
            </li>
          </ol>
        </nav>

        {/* Step 1 Content */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Name Your Project</h2>
              <p className="mt-2 text-slate-500">Choose a unique name. This will be used in your public URL.</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900 mb-2">Project Name</label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    className="block w-full rounded-md border-0 py-3 px-4 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="my-awesome-app"
                  />
                </div>
                {name.length > 0 && (
                  <p className="mt-2 text-sm text-slate-500 flex items-center">
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    Your URL will be: <span className="font-semibold text-slate-700 ml-1">host.arsh-io.website/user/{name}</span>
                  </p>
                )}
              </div>

              <button
                onClick={handleCreate}
                disabled={name.length < 3 || loading}
                className="w-full rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {loading ? 'Creating...' : 'Continue to Upload'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
