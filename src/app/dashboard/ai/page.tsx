'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, Bot, User, Trash2, Copy, CheckCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  'Generate a 5-question quiz on data privacy',
  'Write lesson content on workplace safety',
  'Summarize ISO 9001 requirements for employees',
  'Create onboarding checklist for new engineers',
  'Explain GDPR in simple terms',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your HR OS AI Assistant powered by Claude. I can help you:\n\n• **Generate quiz questions** from topics or existing content\n• **Write training content** and lesson materials\n• **Summarize documents** and policies\n• **Create onboarding checklists**\n• **Explain HR policies** in plain language\n\nNote: I cannot directly edit official records. All changes must be made by an authorized user.\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
          context: 'hr_assistant',
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content ?? 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API configuration.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyMsg = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-6 pt-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
              </div>
              <p className="text-indigo-200 text-sm">Powered by Claude · Cannot modify official records</p>
            </div>
            <button
              onClick={() => setMessages(msgs => [msgs[0]])}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
            >
              <Trash2 size={14} /> Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex gap-4 min-h-0">

        {/* Quick prompts sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Prompts</p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left text-xs text-gray-600 px-3 py-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-gray-100 hover:border-indigo-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 260px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                )}>
                  {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className={cn('max-w-[80%] group relative', msg.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-400">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyMsg(idx, msg.content)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 text-gray-400 transition-all"
                      >
                        {copied === idx ? <CheckCheck size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={15} className="text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the AI assistant... (Shift+Enter for new line)"
                rows={2}
                className="flex-1 resize-none px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Button onClick={() => sendMessage()} loading={loading} disabled={!input.trim()} className="h-10 px-4">
                <Send size={16} />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Sparkles size={10} /> AI responses are for guidance only. Do not use for official HR decisions without human review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
