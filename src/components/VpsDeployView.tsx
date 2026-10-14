import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Download,
  Box,
  FileCode,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Language } from '../types.js';
import { translations } from '../i18n.js';

interface VpsDeployViewProps {
  lang: Language;
}

export const VpsDeployView: React.FC<VpsDeployViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [scripts, setScripts] = useState<{
    bashScript: string;
    dockerCompose: string;
    pythonSessionScript: string;
    huggingFaceUrl: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/vps/scripts')
      .then((res) => res.json())
      .then((data) => setScripts(data))
      .catch((err) => console.error('Failed to load scripts', err));
  }, []);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const systemdService = `[Unit]
Description=Gemma 4 E2B Abliterated Llama.cpp Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/gemma-vps/llama.cpp
ExecStart=/root/gemma-vps/llama.cpp/build/bin/llama-server \\
  -m /root/gemma-vps/models/gemma-4-E2B-abliterated-btx-Q8_0.gguf \\
  --host 0.0.0.0 \\
  --port 8080 \\
  -c 8192 \\
  -ngl 99
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.vps.title}</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">{t.vps.subtitle}</p>
            </div>
          </div>

          <a
            href="https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/blob/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-semibold text-white transition-colors border border-zinc-700/60 shadow-md cursor-pointer self-start md:self-auto"
          >
            <ExternalLink className="h-4 w-4 text-emerald-400" />
            <span>{t.vps.hfLinkText}</span>
          </a>
        </div>
      </div>

      {/* Model Spec Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>Quantization Level</span>
          </div>
          <p className="text-sm font-bold text-white font-mono">Q8_0 (8-bit High Precision)</p>
          <span className="text-[11px] text-zinc-500">Near FP16 quality, ~2.6 GB VRAM/RAM</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Abliteration / Safety</span>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">btx Abliterated</p>
          <span className="text-[11px] text-zinc-500">Uncensored reasoning & deep context</span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <FileCode className="h-4 w-4 text-emerald-400" />
            <span>Storage Format</span>
          </div>
          <p className="text-sm font-bold text-cyan-400 font-mono">Python Session .session.enc</p>
          <span className="text-[11px] text-zinc-500">AES-256-GCM + PBKDF2</span>
        </div>
      </div>

      {/* Step 1: Bash Deployment Script */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>{t.vps.step1Title}</span>
          </div>
          <button
            onClick={() => scripts?.bashScript && copyToClipboard(scripts.bashScript, 'bash')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            {copiedSection === 'bash' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === 'bash' ? t.vps.copied : t.vps.copy}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{t.vps.step1Desc}</p>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-72 leading-relaxed">
          {scripts?.bashScript || 'Loading script...'}
        </pre>
      </div>

      {/* Step 2: Docker Compose */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Box className="h-4 w-4 text-emerald-400" />
            <span>{t.vps.step2Title}</span>
          </div>
          <button
            onClick={() => scripts?.dockerCompose && copyToClipboard(scripts.dockerCompose, 'docker')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            {copiedSection === 'docker' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === 'docker' ? t.vps.copied : t.vps.copy}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{t.vps.step2Desc}</p>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-64 leading-relaxed">
          {scripts?.dockerCompose || 'Loading docker-compose.yml...'}
        </pre>
      </div>

      {/* Step 3: Python Session File Handler (session_manager.py) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileCode className="h-4 w-4 text-emerald-400" />
            <span>{t.vps.step3Title}</span>
          </div>
          <button
            onClick={() =>
              scripts?.pythonSessionScript &&
              copyToClipboard(scripts.pythonSessionScript, 'py')
            }
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            {copiedSection === 'py' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === 'py' ? t.vps.copied : t.vps.copy}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{t.vps.step3Desc}</p>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto max-h-64 leading-relaxed">
          {scripts?.pythonSessionScript || 'Loading Python session script...'}
        </pre>
      </div>

      {/* Step 4: Systemd Service */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Server className="h-4 w-4 text-emerald-400" />
            <span>4. Systemd Background Service (`/etc/systemd/system/llama-gemma.service`)</span>
          </div>
          <button
            onClick={() => copyToClipboard(systemdService, 'systemd')}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            {copiedSection === 'systemd' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSection === 'systemd' ? t.vps.copied : t.vps.copy}</span>
          </button>
        </div>
        <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
          {systemdService}
        </pre>
      </div>

      {/* Step 5: GitHub Repository Push Guide */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-zinc-900 via-zinc-950 to-emerald-950/20 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-xl">
              🐙
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>GitHub Repository: takerdeaker-code/aivps</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                  main branch
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Remote URL: https://github.com/takerdeaker-code/aivps.git
              </p>
            </div>
          </div>

          <a
            href="/api/git/download-archive"
            download="aivps-repository.tar.gz"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors border border-zinc-700 self-start sm:self-auto cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download .tar.gz Archive</span>
          </a>
        </div>

        {/* Option A: Push via Personal Access Token */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 space-y-3">
          <label className="text-xs font-semibold text-zinc-200 block">
            နည်းလမ်း (၁) - GitHub Personal Access Token (PAT) ဖြင့် တိုက်ရိုက် Push မည်:
          </label>
          <p className="text-[11px] text-zinc-400">
            GitHub Settings → Developer settings → Personal access tokens မှ <code className="text-emerald-400 font-mono">repo</code> permission ပါသော token (ghp_...) ကို ထည့်ပြီး Push ခလုတ်ကို နှိပ်ပါ။
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              id="github-token-input"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                const input = document.getElementById('github-token-input') as HTMLInputElement;
                const statusDiv = document.getElementById('github-push-status');
                if (!input || !input.value.trim()) {
                  alert('Please enter your GitHub Personal Access Token');
                  return;
                }
                if (statusDiv) {
                  statusDiv.innerText = 'Pushing to https://github.com/takerdeaker-code/aivps...';
                  statusDiv.className = 'text-xs text-amber-400 font-mono mt-2';
                }
                try {
                  const res = await fetch('/api/git/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: input.value.trim() }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    if (statusDiv) {
                      statusDiv.innerText = '✓ Success! Code pushed to https://github.com/takerdeaker-code/aivps';
                      statusDiv.className = 'text-xs text-emerald-400 font-semibold mt-2';
                    }
                    input.value = '';
                  } else {
                    if (statusDiv) {
                      statusDiv.innerText = '✗ Error: ' + (data.error || 'Push failed') + (data.details ? ' (' + data.details + ')' : '');
                      statusDiv.className = 'text-xs text-rose-400 font-mono mt-2';
                    }
                  }
                } catch (err: any) {
                  if (statusDiv) {
                    statusDiv.innerText = '✗ Error: ' + err.message;
                    statusDiv.className = 'text-xs text-rose-400 font-mono mt-2';
                  }
                }
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer"
            >
              🚀 Push to GitHub
            </button>
          </div>
          <div id="github-push-status" className="text-xs text-zinc-400"></div>
        </div>

        {/* Option B: Run locally via Git CLI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span className="font-semibold">နည်းလမ်း (၂) - မိမိ Terminal မှ Command ရိုက်ပြီး Push ရန်:</span>
            <button
              onClick={() =>
                copyToClipboard(
                  `git remote set-url origin https://github.com/takerdeaker-code/aivps.git\ngit branch -M main\ngit push -u origin main`,
                  'git-cli'
                )
              }
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              {copiedSection === 'git-cli' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'git-cli' ? t.vps.copied : 'Copy Commands'}</span>
            </button>
          </div>
          <pre className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed select-all">
{`git remote set-url origin https://github.com/takerdeaker-code/aivps.git
git branch -M main
git push -u origin main`}
          </pre>
        </div>
      </div>
    </div>
  );
};
