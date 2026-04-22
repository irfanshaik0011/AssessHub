"use client";

import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';

export default function PendingApproval() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Clock size={40} className="animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Approval</h1>
        <p className="text-slate-500 mb-8">
          Hello <span className="font-bold text-slate-700">{user?.name}</span>, your faculty account has been created successfully. 
          An administrator needs to verify and approve your account before you can access the dashboard.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
          <ShieldAlert className="text-amber-600 shrink-0" size={20} />
          <p className="text-xs text-amber-800 leading-relaxed">
            Verification usually takes 24-48 hours. You will be able to access all faculty features once approved.
          </p>
        </div>

        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}