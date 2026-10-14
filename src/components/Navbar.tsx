import React from 'react';
import { ShieldCheck, Server, Lock, LogOut, Globe, Cpu, RefreshCw } from 'lucide-react';
import { UserProfile, Language } from '../types.js';
import { translations } from '../i18n.js';

interface NavbarProps {
  user: UserProfile | null;
  lang: Language;
  onToggleLang: () => void;
  activeTab: 'chat' | 'vault' | 'settings' | 'vps';
  onSelectTab: (tab: 'chat' | 'vault' | 'settings' | 'vps') => void;
  onLogout: () => void;
  vpsStatus: 'online' | 'offline' | 'checking';
  vpsLatency: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  lang,
  onToggleLang,
  activeTab,
  onSelectTab,
  onLogout,
  vpsStatus,
  vpsLatency,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Model Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20 text-zinc-950 font-bold">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-base sm:text-lg">
                {t.appTitle}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                <Cpu className="h-3 w-3" />
                Gemma-4-E2B
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono hidden md:block">
              {t.modelBadge}
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        {user && (
          <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              onClick={() => onSelectTab('chat')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              💬 {t.tabs.chat}
            </button>
            <button
              onClick={() => onSelectTab('vault')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'vault'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              {t.tabs.vault}
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              ⚙️ {t.tabs.settings}
            </button>
            <button
              onClick={() => onSelectTab('vps')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === 'vps'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              {t.tabs.vps}
            </button>
          </nav>
        )}

        {/* Right Status Badges & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* VPS Health Status */}
          <div
            title={`VPS Llama Server Status (${vpsLatency > 0 ? `${vpsLatency}ms` : 'Ready'})`}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-mono text-zinc-300"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                vpsStatus === 'online'
                  ? 'bg-emerald-400 animate-pulse'
                  : vpsStatus === 'checking'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="text-[11px]">
              {vpsStatus === 'online'
                ? `VPS ${vpsLatency}ms`
                : vpsStatus === 'checking'
                ? 'Ping...'
                : 'VPS Ready'}
            </span>
          </div>

          {/* AES-256 Vault Badge */}
          {user && (
            <div
              title="Session is encrypted with AES-256-GCM"
              className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-400 font-mono"
            >
              <Lock className="h-3 w-3" />
              <span className="hidden md:inline">AES-256-GCM</span>
            </div>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLang}
            title="Switch Language (မြန်မာ / English)"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold">{lang === 'my' ? 'မြန်မာ' : 'EN'}</span>
          </button>

          {/* User Profile / Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-1 border-l border-zinc-800">
              <button
                onClick={() => onSelectTab('vault')}
                className="flex items-center gap-1.5 text-left text-xs hover:opacity-80 transition-opacity"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 font-semibold text-emerald-400 border border-zinc-700">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden xl:inline text-zinc-300 font-medium">
                  {user.displayName || user.username}
                </span>
              </button>
              <button
                onClick={onLogout}
                title={t.common.logout}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Subnavigation */}
      {user && (
        <div className="flex lg:hidden overflow-x-auto border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 gap-1 scrollbar-none">
          <button
            onClick={() => onSelectTab('chat')}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            💬 {t.tabs.chat}
          </button>
          <button
            onClick={() => onSelectTab('vault')}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
              activeTab === 'vault'
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            🔒 {t.tabs.vault}
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            ⚙️ {t.tabs.settings}
          </button>
          <button
            onClick={() => onSelectTab('vps')}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
              activeTab === 'vps'
                ? 'bg-emerald-500 text-zinc-950 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            🚀 {t.tabs.vps}
          </button>
        </div>
      )}
    </header>
  );
};
