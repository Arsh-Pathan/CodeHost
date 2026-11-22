"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Terminal,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Activity,
  Layers,
  Globe,
  AlertCircle,
  FileCode,
  ArrowDown
} from 'lucide-react';

interface LogItem {
  message: string;
  timestamp: string;
  type: string;
}

interface ParsedLog {
  id: string;
  isHttp: boolean;
  time: string;
  method?: string;
  path?: string;
  rawPath?: string;
  status?: number;
  bytes?: string;
  referer?: string | null;
  userAgent?: string | null;
  clientIp?: string | null;
  message: string;
  isError: boolean;
  isWarn: boolean;
  isSystem: boolean;
  raw: string;
}

function formatBytes(bytes?: string | number): string {
  if (!bytes || bytes === "-" || bytes === 0 || bytes === "0") return "-";
  const num = typeof bytes === 'number' ? bytes : parseInt(bytes, 10);
  if (isNaN(num)) return String(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function parseLogLine(raw: string, fallbackTimestamp: string, id: string): ParsedLog {
  const cleanRaw = raw.trim();

  // 1. Nginx / Apache Combined / Common Log Format (with optional Docker ISO timestamp prefix)
  const nginxRegex = /^(?:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+)?(?:[\d\.]+|[a-fA-F0-9:]+)\s+-\s+-\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^"\s]+)(?:\s+HTTP\/[0-9\.]+)?\"\s+(\d{3})\s+(\d+|-)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/;
  const nginxMatch = cleanRaw.match(nginxRegex);

  if (nginxMatch) {
    const [, isoTime, bracketTime, method, rawPath, status, bytes, referer, userAgent, clientIp] = nginxMatch;
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    let timeStr = "";
    if (isoTime) {
      try {
        timeStr = new Date(isoTime).toLocaleTimeString([], { hour12: false });
      } catch {}
    }
    if (!timeStr && bracketTime) {
      const parts = bracketTime.split(":");
      if (parts.length >= 4) {
        timeStr = `${parts[1]}:${parts[2]}:${parts[3].split(" ")[0]}`;
      }
    }
    if (!timeStr && fallbackTimestamp) {
      try {
        timeStr = new Date(fallbackTimestamp).toLocaleTimeString([], { hour12: false });
      } catch {}
    }

    const statusCode = parseInt(status, 10);

    return {
      id,
      isHttp: true,
      time: timeStr || "now",
      method,
      path: decodedPath,
      rawPath,
      status: statusCode,
      bytes: formatBytes(bytes),
      referer: referer && referer !== "-" ? referer : null,
      userAgent: userAgent && userAgent !== "-" ? userAgent : null,
      clientIp: clientIp && clientIp !== "-" ? clientIp : null,
      message: `${method} ${decodedPath} [${statusCode}]`,
      isError: statusCode >= 400,
      isWarn: statusCode >= 300 && statusCode < 400,
      isSystem: false,
      raw: cleanRaw
    };
  }

  // 2. Express / Morgan / Fastify Format: e.g. "GET /api/v1/health 200 4.12 ms - 28"
  const morganRegex = /^(?:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+)?(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s]+)\s+(\d{3})(?:\s+([0-9\.]+\s*(?:ms|s)))?(?:\s+-\s+([0-9]+|-))?/;
  const morganMatch = cleanRaw.match(morganRegex);
  if (morganMatch) {
    const [, isoTime, method, rawPath, status, duration, bytes] = morganMatch;
    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      decodedPath = rawPath;
    }

    let timeStr = "";
    if (isoTime) {
      try {
        timeStr = new Date(isoTime).toLocaleTimeString([], { hour12: false });
      } catch {}
    }
    if (!timeStr && fallbackTimestamp) {
      try {
        timeStr = new Date(fallbackTimestamp).toLocaleTimeString([], { hour12: false });
      } catch {}
    }

    const statusCode = parseInt(status, 10);
    return {
      id,
      isHttp: true,
      time: timeStr || "now",
      method,
      path: decodedPath,
      rawPath,
      status: statusCode,
      bytes: duration || formatBytes(bytes),
      referer: null,
      userAgent: null,
      clientIp: null,
      message: `${method} ${decodedPath} [${statusCode}]`,
      isError: statusCode >= 400,
      isWarn: statusCode >= 300 && statusCode < 400,
      isSystem: false,
      raw: cleanRaw
    };
  }

  // 3. General non-HTTP log (clean message from Docker ISO timestamp if present)
  let cleanTime = "";
  const isoPrefix = cleanRaw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)/);
  let message = cleanRaw;
  if (isoPrefix) {
    try {
      cleanTime = new Date(isoPrefix[1]).toLocaleTimeString([], { hour12: false });
      message = isoPrefix[2];
    } catch {}
  }
  if (!cleanTime && fallbackTimestamp) {
    try {
      cleanTime = new Date(fallbackTimestamp).toLocaleTimeString([], { hour12: false });
    } catch {}
  }

  const isError = /error|failed|exception|fatal|err!|panic:/i.test(message) || message.includes("[ERROR]");
  const isWarn = /warn|warning/i.test(message);
  const isSystem = message.startsWith(">") || message.includes("Ready") || message.includes("listening") || message.includes("Success");

  return {
    id,
    isHttp: false,
    time: cleanTime || "now",
    message,
    isError,
    isWarn,
    isSystem,
    raw: cleanRaw
  };
}

interface LiveConsoleProps {
  logs: LogItem[];
  onClear: () => void;
  status: string;
  statusConfig: { bg: string; color: string; border: string };
}

export default function LiveConsole({
  logs,
  onClear,
  status,
  statusConfig
}: LiveConsoleProps) {
  const [filter, setFilter] = useState<'all' | 'requests' | 'errors' | 'app'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Parse all logs
  const parsedLogs = useMemo(() => {
    return logs.map((log, index) => parseLogLine(log.message, log.timestamp, `log-${index}`));
  }, [logs]);

  // Counts for pills
  const counts = useMemo(() => {
    let requests = 0;
    let errors = 0;
    let app = 0;

    for (const p of parsedLogs) {
      if (p.isHttp) requests++;
      else app++;

      if (p.isError) errors++;
    }

    return { all: parsedLogs.length, requests, errors, app };
  }, [parsedLogs]);

  // Filtered list
  const filteredLogs = useMemo(() => {
    let result = parsedLogs;

    if (filter === 'requests') {
      result = result.filter(l => l.isHttp);
    } else if (filter === 'errors') {
      result = result.filter(l => l.isError);
    } else if (filter === 'app') {
      result = result.filter(l => !l.isHttp);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        if (l.isHttp) {
          return (
            (l.path && l.path.toLowerCase().includes(q)) ||
            (l.method && l.method.toLowerCase().includes(q)) ||
            (l.status && String(l.status).includes(q)) ||
            (l.clientIp && l.clientIp.includes(q))
          );
        }
        return l.message.toLowerCase().includes(q) || l.raw.toLowerCase().includes(q);
      });
    }

    return result;
  }, [parsedLogs, filter, search]);

  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#0b0f19] rounded-3xl shadow-2xl border border-slate-800/80 overflow-hidden flex flex-col flex-1 h-[600px]">
      {/* Top Main Header */}
      <div className="px-5 py-3.5 bg-[#111625] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700/60 shadow-xs">
            <Terminal size={16} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-100 uppercase tracking-widest">Live Terminal</span>
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border flex items-center space-x-1.5 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                {status === 'running' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center space-x-2">
          {/* Formatted vs Raw Mode Toggle */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode('formatted')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                viewMode === 'formatted'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Formatted
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                viewMode === 'raw'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw
            </button>
          </div>

          {/* Auto scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? "Auto-scroll is ON" : "Auto-scroll is OFF"}
            className={`p-1.5 rounded-lg border text-[11px] font-medium transition flex items-center space-x-1 ${
              autoScroll
                ? 'bg-blue-950/60 border-blue-800/80 text-blue-400'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <ArrowDown size={14} className={autoScroll ? 'animate-bounce' : ''} />
          </button>

          {/* Clear button */}
          <button
            onClick={onClear}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sub-bar: Filter Pills & Search */}
      <div className="px-5 py-2.5 bg-[#0e1320] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              filter === 'all'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span>All</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-400">{counts.all}</span>
          </button>

          <button
            onClick={() => setFilter('requests')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              filter === 'requests'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span>Requests</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-400">{counts.requests}</span>
          </button>

          <button
            onClick={() => setFilter('errors')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              filter === 'errors'
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span>Errors</span>
            {counts.errors > 0 ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950/80 text-rose-400 font-mono font-bold">{counts.errors}</span>
            ) : (
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-400">0</span>
            )}
          </button>

          <button
            onClick={() => setFilter('app')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center space-x-1.5 ${
              filter === 'app'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <span>App</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-400">{counts.app}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs or paths..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Console Content Body */}
      <div className="p-3 sm:p-4 flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-700/60">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40 py-12">
            <Terminal size={40} className="text-slate-600" />
            <p className="italic font-medium text-center max-w-xs text-xs text-slate-400">
              Initializing console session. Logs will appear once your application is active.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50 py-12">
            <Search size={28} className="text-slate-600" />
            <p className="text-center text-xs text-slate-400">No logs matching your filter criteria.</p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="text-xs text-blue-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === 'raw' ? (
          /* RAW SHELL VIEW */
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={log.id} className="flex space-x-3 hover:bg-white/[0.04] px-2 py-0.5 rounded transition group">
                <span className="text-slate-600 shrink-0 select-none opacity-40 group-hover:opacity-100 transition-opacity w-14">
                  {log.time}
                </span>
                <span className={`whitespace-pre-wrap break-all ${
                  log.isError ? 'text-red-400' :
                  log.isWarn ? 'text-amber-400' :
                  log.isSystem ? 'text-cyan-400' :
                  'text-slate-300'
                }`}>
                  {log.raw}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* FORMATTED CLEAN VIEW */
          <div className="space-y-1.5">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;

              if (log.isHttp) {
                // HTTP Access Log Row
                return (
                  <div
                    key={log.id}
                    className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden transition"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
                    >
                      {/* Left: Time + Method + Status + Path */}
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {log.time}
                        </span>

                        {/* Method Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          log.method === 'GET' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' :
                          log.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          log.method === 'PUT' || log.method === 'PATCH' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          log.method === 'DELETE' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {log.method}
                        </span>

                        {/* Status Code Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          (log.status || 0) < 300 ? 'text-emerald-400 bg-emerald-500/15' :
                          (log.status || 0) < 400 ? 'text-sky-400 bg-sky-500/15' :
                          (log.status || 0) < 500 ? 'text-amber-400 bg-amber-500/15' :
                          'text-rose-400 bg-rose-500/15'
                        }`}>
                          {log.status}
                        </span>

                        {/* Clean Path */}
                        <span className="font-mono text-slate-200 truncate text-[11px] group-hover:text-white" title={log.path}>
                          {log.path}
                        </span>
                      </div>

                      {/* Right: Size + IP + Chevron */}
                      <div className="flex items-center space-x-2.5 shrink-0 self-end sm:self-center pl-2">
                        {log.bytes && log.bytes !== '-' && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                            {log.bytes}
                          </span>
                        )}
                        {log.clientIp && (
                          <span className="text-[10px] font-mono text-slate-500 hidden md:inline">
                            {log.clientIp}
                          </span>
                        )}
                        <ChevronDown
                          size={13}
                          className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-[#080c14] border-t border-slate-800 text-[11px] font-mono space-y-1.5 text-slate-300">
                        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request Details</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.raw, log.id);
                            }}
                            className="flex items-center space-x-1 text-[10px] text-slate-400 hover:text-white transition"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy Raw</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                          <span className="text-slate-500 sm:col-span-1">Full Path:</span>
                          <span className="text-slate-200 sm:col-span-3 break-all">{log.rawPath}</span>
                        </div>
                        {log.referer && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                            <span className="text-slate-500 sm:col-span-1">Referrer:</span>
                            <span className="text-slate-300 sm:col-span-3 break-all">{log.referer}</span>
                          </div>
                        )}
                        {log.userAgent && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                            <span className="text-slate-500 sm:col-span-1">User Agent:</span>
                            <span className="text-slate-300 sm:col-span-3 break-all text-[10px]">{log.userAgent}</span>
                          </div>
                        )}
                        {log.clientIp && (
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                            <span className="text-slate-500 sm:col-span-1">Client IP:</span>
                            <span className="text-slate-300 sm:col-span-3">{log.clientIp}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 pt-1 border-t border-slate-800/40">
                          <span className="text-slate-500 sm:col-span-1">Raw Log:</span>
                          <span className="text-slate-400 sm:col-span-3 text-[10px] break-all select-all font-mono opacity-80">
                            {log.raw}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Non-HTTP / App Log Row
              return (
                <div
                  key={log.id}
                  className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 rounded-xl px-3 py-2 flex items-start space-x-2.5 transition"
                >
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">
                    {log.time}
                  </span>

                  {/* Type Badge */}
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${
                    log.isError ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    log.isWarn ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    log.isSystem ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700/60'
                  }`}>
                    {log.isError ? 'ERR' : log.isWarn ? 'WARN' : log.isSystem ? 'SYS' : 'LOG'}
                  </span>

                  {/* Message */}
                  <span className={`font-mono text-[11px] whitespace-pre-wrap break-all flex-1 ${
                    log.isError ? 'text-rose-300 font-medium' :
                    log.isWarn ? 'text-amber-300' :
                    log.isSystem ? 'text-cyan-300 font-medium' :
                    'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
