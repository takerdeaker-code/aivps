/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { AuthModal } from './components/AuthModal.js';
import { ChatView } from './components/ChatView.js';
import { VaultView } from './components/VaultView.js';
import { SettingsView } from './components/SettingsView.js';
import { VpsDeployView } from './components/VpsDeployView.js';
import { UserProfile, ModelSettings, ChatMessage, Language } from './types.js';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gemma_auth_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('gemma_lang');
    return (saved === 'en' ? 'en' : 'my') as Language;
  });
  const [activeTab, setActiveTab] = useState<'chat' | 'vault' | 'settings' | 'vps'>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [vpsStatus, setVpsStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [vpsLatency, setVpsLatency] = useState(0);

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'my' ? 'en' : 'my';
      localStorage.setItem('gemma_lang', next);
      return next;
    });
  };

  // Fetch current authenticated user
  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSettings(data.user.settings);
      } else {
        localStorage.removeItem('gemma_auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  }, []);

  // Fetch chat history
  const fetchChatHistory = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/chat/history', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, []);

  // Ping VPS endpoint
  const pingVps = useCallback(async (endpointUrl?: string) => {
    setVpsStatus('checking');
    try {
      const target = endpointUrl || settings?.vpsLlamaEndpoint || 'http://localhost:8080';
      const res = await fetch('/api/vps/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: target }),
      });
      const data = await res.json();
      if (data.status === 'online') {
        setVpsStatus('online');
        setVpsLatency(data.latencyMs || 12);
      } else {
        setVpsStatus('offline');
        setVpsLatency(0);
      }
      return data;
    } catch {
      setVpsStatus('offline');
      setVpsLatency(0);
      return { status: 'offline' };
    }
  }, [settings?.vpsLlamaEndpoint]);

  // Initial load
  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
      fetchChatHistory(token);
    }
  }, [token, fetchCurrentUser, fetchChatHistory]);

  // Auto-ping when settings are available
  useEffect(() => {
    if (settings?.vpsLlamaEndpoint) {
      pingVps(settings.vpsLlamaEndpoint);
    }
  }, [settings?.vpsLlamaEndpoint, pingVps]);

  const handleLoginSuccess = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('gemma_auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setSettings(newUser.settings);
    fetchChatHistory(newToken);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('gemma_auth_token');
    setToken(null);
    setUser(null);
    setChatHistory([]);
  };

  const handleSendMessage = async (text: string) => {
    if (!token) return;
    setChatLoading(true);

    // Optimistic user message insertion
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      // Replace temporary and add model message
      setChatHistory((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        data.modelMessage,
      ]);

      // Refresh user vault stats (turn count, bytes)
      fetchCurrentUser(token);
    } catch (err: any) {
      // Append system error message
      setChatHistory((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'system',
          content: `Inference Error: ${err.message || 'Model backend did not respond.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChatHistory([]);
        fetchCurrentUser(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (newSettings: ModelSettings) => {
    if (!token) return;
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      fetchCurrentUser(token);
      pingVps(data.settings.vpsLlamaEndpoint);
    } else {
      throw new Error('Failed to save settings');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navigation */}
      <Navbar
        user={user}
        lang={lang}
        onToggleLang={toggleLanguage}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
        vpsStatus={vpsStatus}
        vpsLatency={vpsLatency}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {!user ? (
          <AuthModal lang={lang} onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'chat' && settings && (
              <ChatView
                lang={lang}
                user={user}
                settings={settings}
                chatHistory={chatHistory}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                loading={chatLoading}
              />
            )}

            {activeTab === 'vault' && (
              <VaultView lang={lang} user={user} />
            )}

            {activeTab === 'settings' && settings && (
              <SettingsView
                lang={lang}
                initialSettings={settings}
                onSave={handleSaveSettings}
                onTestPing={pingVps}
              />
            )}

            {activeTab === 'vps' && (
              <VpsDeployView lang={lang} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
