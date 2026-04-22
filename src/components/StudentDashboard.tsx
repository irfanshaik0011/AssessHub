import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, BookOpen, Award, CheckCircle, BarChart3, UserCircle, Save, Loader2, Menu, X } from 'lucide-react';
import ExamList from './ExamList';
import StatCard from './StatCard';
import StudentAnalytics from './StudentAnalytics';
import NotificationBell from './NotificationBell';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

const BRANCHES = ['CSE', 'IT', 'MECH', 'CIVIL', 'CSD', 'CSM', 'AIML'];
const YEARS = ['1', '2', '3', '4'];

export default function StudentDashboard() {
  const { user, logout, updateProfile } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || '');
  const [editBranch, setEditBranch] = useState(user?.branch || '');
  const [editYear, setEditYear] = useState(user?.year || '');
  const [editSection, setEditSection] = useState(user?.section || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const examsRef = collection(db, 'exams');
    const attemptsRef = collection(db, 'attempts');

    const unsubscribeAttempts = onSnapshot(query(attemptsRef, where('student_id', '==', user.id)), async (attemptsSnap) => {
      const attempts = attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter exams based on student's targeting and published status
      const examsSnap = await getDocs(query(examsRef, where('status', '==', 'published')));
      const filteredExams = examsSnap.docs.filter(doc => {
        const data = doc.data();
        const branchMatch = data.target_branch === 'ALL' || data.target_branch === user.branch;
        const yearMatch = data.target_year === 'ALL' || data.target_year === user.year;
        const sectionMatch = data.target_section === 'ALL' || data.target_section === user.section;
        return branchMatch && yearMatch && sectionMatch;
      });

      const assignedCount = filteredExams.length;
      const completedAttempts = attempts.filter((a: any) => ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'].includes(a.status));
      
      const totalMinutes = completedAttempts.reduce((acc, curr: any) => {
        if (curr.started_at && curr.submitted_at) {
          const start = curr.started_at.toDate().getTime();
          const end = curr.submitted_at.toDate().getTime();
          return acc + (end - start) / 60000;
        }
        return acc;
      }, 0);

      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((acc, curr: any) => acc + (curr.score || 0), 0) / completedAttempts.length
        : 0;

      setStats({
        metrics: {
          assigned_count: assignedCount,
          completed_count: completedAttempts.length,
          total_minutes: totalMinutes,
          average_score: avgScore
        },
        recentActivity: attempts.sort((a: any, b: any) => (b.updated_at?.toDate?.() || 0) - (a.updated_at?.toDate?.() || 0)).slice(0, 5),
        performanceTrend: completedAttempts.map((a: any) => ({ name: 'Exam', score: a.score, date: a.submitted_at?.toDate?.() })),
        timeData: completedAttempts.map(() => ({ name: 'Exam', minutes: 60 }))
      });
    });

    return () => unsubscribeAttempts();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: editName,
        branch: editBranch,
        year: editYear,
        section: editSection
      });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r flex flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <BookOpen className="text-indigo-600" size={24} />
              <span className="font-bold text-xl">ExamPro</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
            <button onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}><BarChart3 size={20} /> Analytics</button>
            <button onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}><UserCircle size={20} /> My Profile</button>
          </nav>
        </div>
        <div className="p-6 border-t bg-white">
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 transition-colors font-medium"><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 capitalize">{activeTab}</h1>
          </div>
          <NotificationBell />
        </header>

        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'dashboard' ? (
            <>
              <div className="mb-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, {user?.name}!</h2>
                <p className="text-indigo-100 opacity-90 text-sm sm:text-base">{user?.branch} | Year {user?.year} | Section {user?.section}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <StatCard title="Assigned" value={stats?.metrics?.assigned_count || 0} icon={BookOpen} color="bg-indigo-600" />
                <StatCard title="Completed" value={stats?.metrics?.completed_count || 0} icon={CheckCircle} color="bg-emerald-600" />
                <StatCard title="Avg. Score" value={`${Math.round(stats?.metrics?.average_score || 0)}%`} icon={Award} color="bg-amber-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Available Assessments</h2>
                  <ExamList readonly />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Activity</h2>
                  <div className="bg-white rounded-2xl border overflow-hidden">
                    {stats?.recentActivity?.map((activity: any, i: number) => (
                      <div key={i} className="p-4 border-b last:border-0 hover:bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900">{activity.exam_title}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-slate-500">{activity.status}</span>
                          <span className="text-[10px] font-bold text-indigo-600">
                            Score: {activity.obtained_score || 0}/{activity.total_exam_score || 0} ({activity.score || 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'analytics' ? (
            stats && <StudentAnalytics data={stats} />
          ) : (
            <div className="max-w-2xl bg-white rounded-2xl border p-6 sm:p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Edit Profile Details</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
                    <select value={editBranch} onChange={(e) => setEditBranch(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none" required>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year</label>
                    <select value={editYear} onChange={(e) => setEditYear(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none" required>
                      {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Section</label>
                    <input type="text" value={editSection} onChange={(e) => setEditSection(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. A" required />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Changes
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}