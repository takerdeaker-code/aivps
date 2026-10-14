import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Hash,
  Database,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { Language, UserProfile, RawEncryptedPayload } from '../types.js';
import { translations } from '../i18n.js';

interface VaultViewProps {
  lang: Language;
  user: UserProfile;
}

export const VaultView: React.FC<VaultViewProps> = ({ lang, user }) => {
  const t = translations[lang];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [sessionFileContent, setSessionFileContent] = useState<RawEncryptedPayload | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const fetchSessionFile = async () => {
    setLoadingFile(true);
    try {
      const token = localStorage.getItem('gemma_auth_token');
      const res = await fetch('/api/vault/session-file', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSessionFileContent(data.rawEncryptedPayload);
      }
    } catch (err) {
      console.error('Failed to load session file:', err);
    } finally {
      setLoadingFile(false);
    }
  };

  useEffect(() => {
    fetchSessionFile();
  }, [user]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const token = localStorage.getItem('gemma_auth_token');
      const res = await fetch('/api/vault/verify-cipher', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err: any) {
      setVerificationResult({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const downloadSessionFile = () => {
    if (!sessionFileContent) return;
    const blob = new Blob([JSON.stringify(sessionFileContent, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.username}.session.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pythonSnippet = `# Python 3.8+ Decryption for ${user.username}.session.enc
import json, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

with open("${user.username}.session.enc", "r") as f:
    data = json.load(f)

salt = bytes.fromhex(data['salt'])
iv = bytes.fromhex(data['iv'])
tag = bytes.fromhex(data['authTag'])
cipher = bytes.fromhex(data['ciphertext'])

# Derive key using PBKDF2 (100,000 iterations, SHA-512)
key = hashlib.pbkdf2_hmac('sha512', b'gemma_shield_master_key_secure_2026', salt, 100000, 32)
decrypted_json = AESGCM(key).decrypt(iv, cipher + tag, None).decode('utf-8')
session = json.loads(decrypted_json)
print(f"Decrypted user: {session['username']} | Chat turns: {len(session['chatHistory'])}")`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-950 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{t.vault.title}</span>
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-mono font-medium">
                Active Vault
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">{t.vault.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleVerifyIntegrity}
            disabled={verifying}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{verifying ? t.common.loading : t.vault.verifyTag}</span>
          </button>
          <button
            onClick={downloadSessionFile}
            disabled={!sessionFileContent}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{t.vault.downloadFile}</span>
          </button>
        </div>
      </div>

      {/* Verification Notice */}
      {verificationResult && (
        <div
          className={`rounded-xl border p-4 flex items-center gap-3 text-xs ${
            verificationResult.valid
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
          }`}
        >
          {verificationResult.valid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <div>
            <p className="font-semibold">{verificationResult.message || (verificationResult.valid ? 'Session Integrity Verified' : 'Integrity Error')}</p>
            {verificationResult.valid && (
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                AuthTag: {verificationResult.authTagHex?.slice(0, 32)}... | Algorithm: {verificationResult.algorithm}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Grid: Cryptographic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Database className="h-4 w-4 text-emerald-400" />
            <span>{t.vault.fileInfo}</span>
          </div>
          <p className="font-mono text-xs font-bold text-white break-all">
            {user.vaultInfo.sessionFile}
          </p>
          <span className="text-[11px] text-zinc-500 block mt-1">
            Path: ./data/sessions/
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>{t.vault.algorithm}</span>
          </div>
          <p className="font-mono text-xs font-bold text-emerald-400">
            {user.vaultInfo.cipherAlgorithm}
          </p>
          <span className="text-[11px] text-zinc-500 block mt-1">
            Authenticated Encryption (AEAD)
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Key className="h-4 w-4 text-emerald-400" />
            <span>{t.vault.keyDerivation}</span>
          </div>
          <p className="font-mono text-xs font-bold text-white">
            PBKDF2-HMAC-SHA512
          </p>
          <span className="text-[11px] text-zinc-500 block mt-1">
            100,000 Rounds of Iteration
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-1">
            <Hash className="h-4 w-4 text-emerald-400" />
            <span>{t.vault.fingerprint}</span>
          </div>
          <p className="font-mono text-xs font-bold text-cyan-400 truncate">
            {user.vaultInfo.fingerprint || 'N/A'}
          </p>
          <span className="text-[11px] text-zinc-500 block mt-1">
            Payload SHA-256 Digest
          </span>
        </div>
      </div>

      {/* Cryptographic Inspector details */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="h-4 w-4 text-emerald-400" />
          <span>Cryptographic Envelope Parameters</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Salt */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-medium">{t.vault.salt}</span>
              <button
                onClick={() => copyToClipboard(user.vaultInfo.saltHex, 'salt')}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                {copiedKey === 'salt' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="font-mono text-xs text-zinc-300 break-all select-all">
              {user.vaultInfo.saltHex || 'Fetching...'}
            </p>
          </div>

          {/* IV */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-medium">{t.vault.iv}</span>
              <button
                onClick={() => copyToClipboard(user.vaultInfo.ivHex, 'iv')}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                {copiedKey === 'iv' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="font-mono text-xs text-zinc-300 break-all select-all">
              {user.vaultInfo.ivHex || 'Fetching...'}
            </p>
          </div>

          {/* Auth Tag */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-medium">{t.vault.authTag}</span>
              <button
                onClick={() => copyToClipboard(user.vaultInfo.authTagHex, 'tag')}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                {copiedKey === 'tag' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="font-mono text-xs text-zinc-300 break-all select-all">
              {user.vaultInfo.authTagHex || 'Fetching...'}
            </p>
          </div>
        </div>

        {/* Ciphertext view */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-white">{t.vault.ciphertext}</span>
              <span className="text-[11px] text-zinc-500">
                ({sessionFileContent?.ciphertext ? `${sessionFileContent.ciphertext.length / 2} bytes` : 'Loading...'})
              </span>
            </div>
            <button
              onClick={() =>
                sessionFileContent?.ciphertext &&
                copyToClipboard(sessionFileContent.ciphertext, 'cipher')
              }
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 cursor-pointer"
            >
              {copiedKey === 'cipher' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{t.vault.copyCiphertext}</span>
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto rounded-lg bg-zinc-900/90 p-3 font-mono text-[11px] text-zinc-400 break-all leading-relaxed select-all">
            {sessionFileContent?.ciphertext || 'Loading encrypted bytes from disk...'}
          </div>
        </div>
      </div>

      {/* Python Interoperability Guide */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>{t.vault.pythonBridgeTitle}</span>
          </div>
          <button
            onClick={() => copyToClipboard(pythonSnippet, 'python')}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 cursor-pointer"
          >
            {copiedKey === 'python' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Copy Python Script</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {t.vault.pythonBridgeDesc}
        </p>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
          {pythonSnippet}
        </pre>
      </div>
    </div>
  );
};
