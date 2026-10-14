import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Cpu,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Code2,
  Clock,
  Sparkles,
  ShieldCheck,
  FileCode,
  X,
} from 'lucide-react';
import { ChatMessage, Language, ModelSettings, UserProfile } from '../types.js';
import { translations } from '../i18n.js';

interface ChatViewProps {
  lang: Language;
  user: UserProfile;
  settings: ModelSettings;
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => Promise<any>;
  onClearHistory: () => Promise<void>;
  loading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  lang,
  user,
  settings,
  chatHistory,
  onSendMessage,
  onClearHistory,
  loading,
}) => {
  const t = translations[lang];
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  // Generate Gemma Turn Format preview from current conversation state
  const generateGemmaPreview = () => {
    const parts: string[] = [];
    if (settings.systemPrompt) {
      parts.push(`<start_of_turn>system\n${settings.systemPrompt.trim()}<end_of_turn>`);
    }
    const recent = chatHistory.slice(-settings.contextWindowDepth);
    for (const msg of recent) {
      parts.push(`<start_of_turn>${msg.role}\n${msg.content.trim()}<end_of_turn>`);
    }
    parts.push(`<start_of_turn>user\n[Current User Message]<end_of_turn>\n<start_of_turn>model`);
    return parts.join('\n');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-5xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Banner / Status info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{settings.modelIdentifier}</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                Q8_0 Quantized
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              {t.chat.memoryActive} ({t.chat.memoryTurns.replace('{n}', String(settings.contextWindowDepth))})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormatModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-300 hover:text-emerald-400 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.chat.inspectFormat}</span>
          </button>
          {chatHistory.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-400 hover:text-rose-400 hover:border-rose-900/40 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.chat.clear}</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 sm:pr-2">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 shadow-xl mb-4">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{t.chat.welcomeTitle}</h3>
            <p className="max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
              {t.chat.welcomeDesc}
            </p>

            {/* Quick Prompt Cards */}
            <div className="w-full max-w-xl text-left">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                {t.chat.shortcuts.title}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  t.chat.shortcuts.q1,
                  t.chat.shortcuts.q2,
                  t.chat.shortcuts.q3,
                  t.chat.shortcuts.q4,
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="flex items-start gap-2 p-3 text-left rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-emerald-500/40 transition-all text-xs text-zinc-300 group cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-500 text-zinc-950 font-medium rounded-br-sm shadow-md'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm shadow-lg'
                  }`}
                >
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap break-words font-sans">
                    {msg.content}
                  </div>

                  {/* Metadata footer */}
                  <div
                    className={`mt-2 flex items-center gap-2 text-[10px] ${
                      isUser ? 'text-zinc-900/80' : 'text-zinc-500'
                    }`}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                    {!isUser && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-mono ml-auto">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        <span>AES-256</span>
                      </span>
                    )}

                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      title="Copy text"
                      className={`ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20 cursor-pointer ${
                        isUser ? 'text-zinc-950' : 'text-zinc-400'
                      }`}
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 shadow-md mt-0.5">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
              <span className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-zinc-400 font-mono ml-2">Gemma-4 reasoning & retrieving encrypted context...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="pt-2">
        <div className="relative flex items-end rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputResize}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            disabled={loading}
            className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none max-h-48"
          />
          <div className="p-2 shrink-0">
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 transition-colors shadow-md cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-zinc-500 font-mono">
          <span>Target: {settings.vpsLlamaEndpoint || 'VPS Engine'}</span>
          <span>Shift + Enter for new line • Multi-turn active</span>
        </div>
      </form>

      {/* Clear History Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-2">{t.chat.clear}</h4>
            <p className="text-xs text-zinc-400 mb-4">{t.chat.clearConfirm}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                onClick={async () => {
                  setShowClearConfirm(false);
                  await onClearHistory();
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {t.chat.clear}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemma Turn Format Inspector Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span>Gemma 4 Turn Template Inspector</span>
              </div>
              <button
                onClick={() => setShowFormatModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 my-2">
              This demonstrates how the chat history turns and system prompt are concatenated using Gemma&apos;s special tokens (`&lt;start_of_turn&gt;` / `&lt;end_of_turn&gt;`) before reaching the GGUF model:
            </p>
            <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap select-all">
              {generateGemmaPreview()}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowFormatModal(false)}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
