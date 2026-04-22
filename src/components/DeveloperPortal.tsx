import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, Database, Activity, CheckCircle, UserPlus, LogOut, Search, Settings, AlertTriangle, Save, Zap } from 'lucide-react';
import StatCard from './StatCard';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface SystemStats {
  total_users: number;
  total_faculty: number;
  total_students: number;
  total_exams: number;
  total_attempts: number;
  active_attempts: number;
}

interface MaintenanceSettings {
  is_enabled: boolean;
  admin_message: string;
  faculty_message: string;
  student_message: string;
}

interface RateLimitSettings {
  window_ms: number;
  max_requests: number;
}

export default function DeveloperPortal() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'maintenance' | 'limits'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null);
  const [limits, setLimits] = useState<RateLimitSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as User[]);
      } else if (activeTab === 'stats') {
        const usersSnap = await getDocs(collection(db, 'users'));
        const examsSnap = await getDocs(collection(db, 'exams'));
        const attemptsSnap = await getDocs(collection(db, 'attempts'));
        
        setStats({
          total_users: usersSnap.size,
          total_faculty: usersSnap.docs.filter(d => d.data().role === 'faculty').length,
          total_students: usersSnap.docs.filter(d => d.data().role === 'student').length,
          total_exams: examsSnap.size,
          total_attempts: attemptsSnap.size,
          active_attempts: attemptsSnap.docs.filter(d => d.data().status === 'IN_PROGRESS').length
        });
      } else if (activeTab === 'maintenance') {
        const d = await getDoc(doc(db, 'settings', 'maintenance'));
        if (d.exists()) setMaintenance(d.data() as MaintenanceSettings);
        else setMaintenance({ is_enabled: false, admin_message: '', faculty_message: '', student_message: '' });
      } else if (activeTab === 'limits') {
        const d = await getDoc(doc(db, 'settings', 'rate_limits'));
        if (d.exists()) setLimits(d.data() as RateLimitSettings);
        else setLimits({ window_ms: 60000, max_requests: 300 });
      }
    } catch (error) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenance) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'maintenance'), maintenance);
      alert('Maintenance settings updated');
    } catch (error) {
      alert('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limits) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'rate_limits'), limits);
      alert('Rate limits updated');
    } catch (error) {
      alert('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (userId: string, currentRole: string) => {
    if (currentRole === 'admin') return;
    if (!confirm('Are you sure you want to promote this user to Admin?')) return;
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'admin' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin' } : u));
    } catch (error) {
      alert('Promotion failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveFaculty = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'active' });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
    } catch (error) {
      alert('Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const s = (searchTerm || "").toLowerCase();
    const name = (u.name || "").toString().toLowerCase();
    const email = (u.email || "").toString().toLowerCase();
    return name.includes(s) || email.includes(s);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Shield className="text-indigo-400" size={24} />
            <span className="font-bold text-xl">DevPortal</span>
          </div>
          
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Users size={20} /> User Management
            </button>
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Activity size={20} /> System Stats
            </button>
            <button onClick={() => setActiveTab('maintenance')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'maintenance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Settings size={20} /> Maintenance
            </button>
            <button onClick={() => setActiveTab('limits')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'limits' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Zap size={20} /> Rate Limits
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold">{user?.name?.[0]}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all font-medium">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-slate-800">
            {activeTab === 'users' ? 'User Management' : activeTab === 'stats' ? 'System Overview' : activeTab === 'maintenance' ? 'Maintenance Mode' : 'Rate Limit Configuration'}
          </h1>
        </header>

        <div className="p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'stats' ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats?.total_users || 0} icon={Users} color="bg-blue-600" />
                <StatCard title="Total Exams" value={stats?.total_exams || 0} icon={Database} color="bg-indigo-600" />
                <StatCard title="Active Attempts" value={stats?.active_attempts || 0} icon={Activity} color="bg-rose-600" />
              </div>
            </div>
          ) : activeTab === 'maintenance' ? (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`p-6 flex items-center justify-between border-b ${maintenance?.is_enabled ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={maintenance?.is_enabled ? 'text-rose-600' : 'text-emerald-600'} size={24} />
                    <div>
                      <h3 className="font-bold text-slate-900">System Status</h3>
                      <p className={`text-sm ${maintenance?.is_enabled ? 'text-rose-700' : 'text-emerald-700'}`}>{maintenance?.is_enabled ? 'Maintenance Mode is ACTIVE' : 'System is running normally'}</p>
                    </div>
                  </div>
                  <button onClick={() => setMaintenance(prev => prev ? { ...prev, is_enabled: !prev.is_enabled } : null)} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${maintenance?.is_enabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}>
                    {maintenance?.is_enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
                <form onSubmit={handleUpdateMaintenance} className="p-6 space-y-6">
                  {['admin', 'faculty', 'student'].map(role => (
                    <div key={role}>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 capitalize">{role} Message</label>
                      <textarea value={(maintenance as any)?.[`${role}_message`] || ''} onChange={(e) => setMaintenance(prev => prev ? { ...prev, [`${role}_message`]: e.target.value } : null)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={2} />
                    </div>
                  ))}
                  <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50">
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Maintenance Settings'}
                  </button>
                </form>
              </div>
            </div>
          ) : activeTab === 'limits' ? (
            <div className="max-w-2xl">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Zap className="text-amber-500" size={24} />
                    <div>
                      <h3 className="font-bold text-slate-900">API Throttling</h3>
                      <p className="text-sm text-slate-500">Configure global rate limits for the platform.</p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handleUpdateLimits} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Window Size (Milliseconds)</label>
                    <input type="number" value={limits?.window_ms || 60000} onChange={(e) => setLimits(prev => prev ? { ...prev, window_ms: parseInt(e.target.value) } : null)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-slate-400 mt-1">Default: 60000 (1 minute)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Max Requests per Window</label>
                    <input type="number" value={limits?.max_requests || 300} onChange={(e) => setLimits(prev => prev ? { ...prev, max_requests: parseInt(e.target.value) } : null)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-slate-400 mt-1">Default: 300 requests</p>
                  </div>
                  <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50">
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Rate Limits'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <Search className="text-slate-400" size={20} />
                <input type="text" placeholder="Search users..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No users found</td></tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${u.role === 'admin' ? 'bg-rose-100 text-rose-700' : u.role === 'faculty' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{u.role}</span></td>
                          <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{u.status}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {u.role === 'faculty' && u.status === 'pending' && <button onClick={() => handleApproveFaculty(u.id)} disabled={processingId === u.id} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><CheckCircle size={18} /></button>}
                              {u.role !== 'admin' && <button onClick={() => handlePromote(u.id, u.role)} disabled={processingId === u.id} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><UserPlus size={18} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}