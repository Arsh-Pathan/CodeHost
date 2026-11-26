"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export default function DocsSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('search') || '';
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    const normalized = query.trim().toLowerCase();
    const sections = document.querySelectorAll<HTMLElement>('main section[id]');
    sections.forEach((section) => {
      if (!normalized) {
        section.style.display = '';
        return;
      }
      const text = (section.textContent || '').toLowerCase();
      section.style.display = text.includes(normalized) ? '' : 'none';
    });
  }, [query]);

  const updateUrlQuery = (next: string) => {
    setQuery(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) {
      params.set('search', next);
    } else {
      params.delete('search');
    }
    const qs = params.toString();
    router.replace(qs ? `/docs?${qs}` : '/docs', { scroll: false });
  };

  return (
    <div className="mb-10">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => updateUrlQuery(e.target.value)}
          placeholder="Search documentation (e.g. MCP, Python, Hackathon)..."
          aria-label="Search documentation"
          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => updateUrlQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
