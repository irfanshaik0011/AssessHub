import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Mail, Lock, User, Send, ArrowLeft, GraduationCap, ShieldCheck, Hash, Building2, Calendar, Timer } from 'lucide-react';

type AuthView = 'role-selection' | 'login' | 'register' | 'forgot-password' | 'magic-link' | 'verify-email';

const BRANCHES = ['CSE', 'IT', 'MECH', 'CIVIL', 'CSD', 'CSM', 'AIML'];
const YEARS = ['1', '2', '3', '4'];

export default function Auth() {
  const [view, setView] = useState<AuthView>('role-selection');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  
  // Extended Student Fields
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [dob, setDob] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const { login, register, resetPassword, sendMagicLink, completeMagicLinkSignIn } = useAuth();

  useEffect(() => {
    const emailForSignIn = window.localStorage.getItem('emailForSignIn');
    if (emailForSignIn && window.location.pathname === '/auth/callback') {
      setLoading(true);
      completeMagicLinkSignIn(emailForSignIn)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, []);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setInterval(() => {
        setLockoutSeconds(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutSeconds]);

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    setView('login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (view === 'login') {
        await login(email, password, role);
      } else if (view === 'register') {
        const extraData = role === 'student' ? {
          rollNumber,
          branch,
          year,
          section,
          dob
        } : {};
        
        await register(email, password, name, role, extraData);
        setMessage('A verification link has been sent to your Gmail account. Please verify before login.');
        setView('login');
      } else if (view === 'forgot-password') {
        await resetPassword(email);
        setMessage('Password reset link sent to your email.');
      } else if (view === 'magic-link') {
        await sendMagicLink(email);
        setMessage('Magic link sent! Check your inbox.');
      }
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait before trying again.');
        setLockoutSeconds(60); // Standard 60 second cooldown
        return;
      }
      
      if (err.message.includes('Email not verified')) {
        setMessage('A verification link has been sent to your Gmail account. Please verify before login.');
        setView('login');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'role-selection') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">ExamPro</h1>
          <p className="text-slate-500 mt-2 text-lg">Select your portal to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <button onClick={() => handleRoleSelect('student')} className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all text-left">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <User size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Student Portal</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Access exams, view results, and track performance.</p>
            <div className="mt-6 flex items-center text-indigo-600 font-bold text-sm">Enter Portal <ArrowLeft size={16} className="ml-2 rotate-180" /></div>
          </button>

          <button onClick={() => handleRoleSelect('faculty')} className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all text-left">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Faculty Portal</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Create assessments, monitor live attempts, and review submissions.</p>
            <div className="mt-6 flex items-center text-emerald-600 font-bold text-sm">Enter Portal <ArrowLeft size={16} className="ml-2 rotate-180" /></div>
          </button>

          <button onClick={() => handleRoleSelect('admin')} className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-rose-500 hover:shadow-xl transition-all text-left">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Admin Panel</h3>
            <p className="text-slate-500 text-sm leading-relaxed">Manage users, configure settings, and oversee platform integrity.</p>
            <div className="mt-6 flex items-center text-rose-600 font-bold text-sm">Enter Portal <ArrowLeft size={16} className="ml-2 rotate-180" /></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl shadow-lg mb-4">
            <BookOpen className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ExamPro</h1>
          <p className="text-slate-500 text-sm mt-1 capitalize">{role} Authentication</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {view === 'login' && 'Sign In'}
                {view === 'register' && 'Create Account'}
                {view === 'forgot-password' && 'Reset Password'}
              </h2>
              <button onClick={() => setView('role-selection')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium">
                <ArrowLeft size={18} /> Back
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-3">
                {lockoutSeconds > 0 && <Timer size={18} className="animate-pulse" />}
                <span>{error} {lockoutSeconds > 0 && `(Wait ${lockoutSeconds}s)`}</span>
              </div>
            )}
            {message && <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">{message}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {view === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" required />
                    </div>
                  </div>

                  {role === 'student' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Roll Number</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="21XX..." required />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" required>
                              <option value="">Select</option>
                              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year</label>
                          <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required>
                            <option value="">Select Year</option>
                            {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Section</label>
                          <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. A" required />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="name@example.com" required />
                </div>
              </div>

              {(view === 'login' || view === 'register') && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    {view === 'login' && <button type="button" onClick={() => setView('forgot-password')} className="text-xs font-semibold text-indigo-600">Forgot?</button>}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" required />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || lockoutSeconds > 0} 
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {loading ? 'Processing...' : lockoutSeconds > 0 ? `Wait ${lockoutSeconds}s` : (
                  <div className="flex items-center justify-center gap-2">
                    {view === 'login' ? 'Sign In' : 'Create Account'}
                    <Send size={18} />
                  </div>
                )}
              </button>
            </form>

            {view === 'login' && (
              <div className="mt-6 text-center">
                <button onClick={() => setView('register')} className="text-sm font-semibold text-indigo-600">Don't have an account? Sign up</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}