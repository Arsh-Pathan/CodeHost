"use client";

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi, API_URL } from '@/lib/api';

interface McpSetupCardProps {
  projectId?: string;
  projectName?: string;
  compact?: boolean;
}

export default function McpSetupCard({
  projectId,
  projectName,
  compact = false,
}: McpSetupCardProps) {
  const mcpEndpoint = `${API_URL.replace(/\/$/, '')}/mcp`;

  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedType, setCopiedType] = useState<'prompt' | 'config' | 'token' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintOrReuseToken = async (forceRefresh = false): Promise<string | null> => {
    if (mcpToken && !forceRefresh) return mcpToken;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchApi('/auth/mcp-token', { method: 'POST' });
      if (res?.token) {
        setMcpToken(res.token);
        return res.token;
      }
    } catch {
      // Fallback to active session JWT if /auth/mcp-token is unavailable
    } finally {
      setGenerating(false);
    }

    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (sessionToken) {
      setMcpToken(sessionToken);
      return sessionToken;
    }

    setError('Please sign in again to generate an MCP token.');
    return null;
  };

  const buildConfigJson = (token: string) =>
    JSON.stringify(
      {
        mcpServers: {
          codehost: {
            url: mcpEndpoint,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
      null,
      2
    );

  const buildAgentPrompt = (token: string) => {
    const configBlock = buildConfigJson(token);
    if (projectId && projectName) {
      return [
        `Set up the CodeHost MCP server (if not already configured) and deploy this workspace to my CodeHost project "${projectName}" (projectId: "${projectId}").`,
        '',
        '1. MCP Server Configuration (Streamable HTTP):',
        `   - URL: ${mcpEndpoint}`,
        `   - Header: Authorization: Bearer ${token}`,
        '',
        '   Add this to your MCP config (e.g. ~/.cursor/mcp.json, claude_desktop_config.json, or .mcp.json):',
        '```json',
        configBlock,
        '```',
        '',
        '2. Deploy Instructions:',
        `   - Use the \`write_project_files\` MCP tool with \`projectId: "${projectId}"\` to upload the project source files (skip node_modules, .git, .next, dist, and .env secrets).`,
        `   - Call \`deploy_files\` with \`projectId: "${projectId}"\` to build and launch the container.`,
        `   - Call \`get_project_logs\` with \`projectId: "${projectId}"\` to monitor build progress and verify the app starts cleanly.`,
        `   - Once running, confirm the live URL: https://${projectName.toLowerCase()}.code-host.online`,
      ].join('\n');
    }

    return [
      'Set up the CodeHost MCP server (if not already configured) and deploy this project to CodeHost.',
      '',
      '1. MCP Server Configuration (Streamable HTTP):',
      `   - URL: ${mcpEndpoint}`,
      `   - Header: Authorization: Bearer ${token}`,
      '',
      '   Add this to your MCP config (e.g. ~/.cursor/mcp.json, claude_desktop_config.json, or .mcp.json):',
      '```json',
      configBlock,
      '```',
      '',
      '2. Deploy Instructions:',
      '   - Call `list_projects` to see existing projects, or call `create_project` (with a unique lowercase subdomain name and tier="free") to create one.',
      '   - Either call `deploy_github` if deploying a public GitHub repo, OR upload local workspace files with `write_project_files` (excluding node_modules, .git, .next, dist, and .env) followed by `deploy_files`.',
      '   - Call `get_project_logs` to monitor the build and confirm the container is healthy and live.',
    ].join('\n');
  };

  const copyWithFeedback = async (type: 'prompt' | 'config' | 'token', forceRefresh = false) => {
    const token = await mintOrReuseToken(forceRefresh);
    if (!token) return;

    const text =
      type === 'prompt'
        ? buildAgentPrompt(token)
        : type === 'config'
          ? buildConfigJson(token)
          : token;

    await navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType((prev) => (prev === type ? null : prev));
    }, 2500);
  };

  const previewText = buildAgentPrompt(mcpToken || 'YOUR_90_DAY_MCP_TOKEN');

  return (
    <div
      className={
        compact
          ? 'space-y-3'
          : 'bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5'
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          {!compact && (
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={compact ? 'text-xs font-black uppercase tracking-widest text-slate-900' : 'text-sm font-black uppercase tracking-widest text-slate-900'}>
                AI Agent &amp; MCP Deployment
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                90-Day Token
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Copy a ready-to-paste prompt for Cursor, Claude Code, Antigravity, or Windsurf to connect MCP and deploy automatically.
            </p>
          </div>
        </div>

        {!compact && (
          <button
            type="button"
            onClick={() => void mintOrReuseToken(true)}
            disabled={generating}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>{mcpToken ? 'Regenerate Token' : 'Generate Token'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className={compact ? 'space-y-2' : 'flex flex-wrap items-center gap-2.5'}>
        <button
          type="button"
          onClick={() => void copyWithFeedback('prompt')}
          disabled={generating}
          className={`${compact ? 'w-full py-3' : 'px-5 py-3'} rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/15 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50`}
        >
          {generating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : copiedType === 'prompt' ? (
            <Check size={15} />
          ) : (
            <Sparkles size={15} />
          )}
          <span>{copiedType === 'prompt' ? 'Prompt + Token Copied!' : 'Copy Prompt for Coding Agent'}</span>
        </button>

        <button
          type="button"
          onClick={() => void copyWithFeedback('config')}
          disabled={generating}
          className={`${compact ? 'w-full py-2.5' : 'px-4 py-3'} rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50`}
        >
          {copiedType === 'config' ? <Check size={14} className="text-emerald-400" /> : <Terminal size={14} />}
          <span>{copiedType === 'config' ? 'MCP JSON Copied!' : 'Copy MCP Config JSON'}</span>
        </button>

        <button
          type="button"
          onClick={() => void copyWithFeedback('token')}
          disabled={generating}
          className={`${compact ? 'w-full py-2.5' : 'px-4 py-3'} rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50`}
        >
          {copiedType === 'token' ? <Check size={14} className="text-emerald-600" /> : <Key size={14} />}
          <span>{copiedType === 'token' ? 'Token Copied!' : 'Copy Bearer Token'}</span>
        </button>
      </div>

      {/* Masked Token Display */}
      {mcpToken && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              MCP Bearer Token (Expires in 90 days)
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showToken ? 'Hide' : 'Reveal'}</span>
              </button>
              <button
                type="button"
                onClick={() => void copyWithFeedback('token')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
              >
                {copiedType === 'token' ? <Check size={13} /> : <Copy size={13} />}
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200 break-all select-all">
            {showToken ? mcpToken : `${mcpToken.slice(0, 14)}${'•'.repeat(24)}${mcpToken.slice(-8)}`}
          </div>
          <p className="text-[11px] text-amber-700 font-medium flex items-center space-x-1.5">
            <ShieldAlert size={13} className="shrink-0" />
            <span>Keep this token private—treat it like a password and never commit it to Git.</span>
          </p>
        </div>
      )}

      {/* Prompt Preview Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showPreview ? 'Hide Agent Prompt Preview' : 'Preview Agent Prompt'}</span>
        </button>

        {showPreview && (
          <pre className="mt-2 p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
            {previewText}
          </pre>
        )}
      </div>
    </div>
  );
}
