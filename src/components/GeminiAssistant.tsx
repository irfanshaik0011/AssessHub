"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Minimize2, Maximize2, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export default function GeminiAssistant({ role }: { role: 'faculty' | 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: `Hello! I'm your AI assistant. Note: Advanced AI features are disabled in this version of the platform.` }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // Simulate a delay then return a static message
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "I'm sorry, but the **AI Assistant** module is not active in this license. Please contact the administrator to upgrade your plan for full generative capabilities." 
      }]);
      setLoading(false);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 transition-all ${isMinimized ? 'h-16' : 'h-[500px]'}`}>
      <div className="p-4 bg-indigo-600 text-white rounded-t-2xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} />
          <span className="font-bold text-sm">AI Assistant (Disabled)</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="hover:bg-white/20 p-1 rounded">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded"><X size={16} /></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none shadow-sm'}`}>
                  <div className="prose prose-sm max-w-none prose-slate">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="AI is disabled..."
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}