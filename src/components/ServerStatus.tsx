"use client";

import { useState, useEffect } from 'react';
import { Server, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ServerStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Sanitize URL: remove trailing slash and ensure protocol
      const cleanBase = base.replace(/\/$/, '');
      const url = `${cleanBase}/health`;
      
      const res = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        setStatus('online');
      } else {
        console.warn(`Server health check failed with status: ${res.status}`);
        setStatus('offline');
      }
    } catch (error) {
      console.error('Server health check error:', error);
      setStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
      status === 'online' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
      status === 'offline' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'
    }`}>
      <Server size={14} />
      <span className="hidden sm:inline">API Server:</span> {status}
      {loading ? (
        <Loader2 size={12} className="animate-spin ml-1" />
      ) : status === 'online' ? (
        <CheckCircle2 size={12} className="ml-1" />
      ) : (
        <button 
          onClick={(e) => {
            e.preventDefault();
            checkHealth();
          }}
          className="ml-2 bg-rose-600 text-white px-2 py-0.5 rounded hover:bg-rose-700 flex items-center gap-1 animate-pulse"
          title="Wake Server"
        >
          <RefreshCw size={10} /> Wake
        </button>
      )}
    </div>
  );
}