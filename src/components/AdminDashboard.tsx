"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Database, Activity, CheckCircle, LogOut, Search, UserX, UserCheck, GraduationCap, User, Check, Users, FileCheck, Trash2, XCircle, Menu, X, CalendarDays, Filter, Settings, Save, Zap, Bug, ChevronDown, Clock, Volume2, AlertOctagon } from 'lucide-react';
import AssignmentForm from './AssignmentForm';
import GeminiAssistant from './GeminiAssistant';
import StatCard from './StatCard';
import ConfirmationModal from './ConfirmationModal';
import ServerStatus from './ServerStatus';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, getDoc, setDoc, limit, startAfter, where } from 'firebase/firestore';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  branch?: string;
  section?: string;
  rollNumber?: string;
  year?: string;
}

interface Exam {
  id: string;
  title: string;
  faculty_id: string;
  faculty_name: string;
  start_time: any;
  end_time: any;
  is_active: boolean;
  is_deleted?: boolean;
  status: string;
  created_at: any;
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'students' | 'faculty' | 'exams' | 'approvals' | 'settings'>('stats');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [pendingFaculty, setPendingFaculty] = useState<UserData[]>([]);
  const [pendingExams, setPendingExams] = useState<Exam[]>([]);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

  // Pagination State
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // System Settings State
  const [settings, setSettings] = useState({
    auto_save_enabled: false,
    auto_save_frequency: 300,
    snapshots_enabled: true,
    snapshots_frequency: 3,
    proctoring_enabled: true,
    debug_mode: false,
    violation_limit: 5,
    noise_threshold: 85
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'exam_config');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'exam_config'), {
        ...settings,
        updated_at: serverTimestamp()
      });
      alert('System settings updated successfully');
    } catch (error) {
      alert('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchData = async () => {
    try {
      const pendingFacultyQuery = query(collection(db, 'users'), where('role', '==', 'faculty'), where('status', '==', 'pending'));
      const pendingExamsQuery = query(collection(db, 'exams'), where('status', '==', 'pending_approval'));
      
      const [pendingFacultySnap, pendingExamsSnap] = await Promise.all([
        getDocs(pendingFacultyQuery),
        getDocs(pendingExamsQuery)
      ]);

      setPendingFaculty(pendingFacultySnap.docs.map(d => ({ id: d.id, ...d.data() })) as UserData[]);
      setPendingExams(pendingExamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Exam[]);

      if (activeTab === 'students' || activeTab === 'faculty') {
        const roleToFetch = activeTab === 'students' ? 'student' : 'faculty';
        const usersQuery = query(
          collection(db, 'users'), 
          where('role', '==', roleToFetch),
          orderBy('name'), 
          limit(50)
        );
        const usersSnap = await getDocs(usersQuery);
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as UserData[];
        setUsers(usersData);
        setLastVisible(usersSnap.docs[usersSnap.docs.length - 1]);
        setHasMore(usersSnap.docs.length === 50);
      }

      if (activeTab === 'exams' || activeTab === 'stats') {
        const examsSnap = await getDocs(query(collection(db, 'exams'), orderBy('created_at', 'desc')));
        const examsData = examsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Exam))
          .filter(e => !e.is_deleted);
        setExams(examsData);
      }

      if (activeTab === 'stats') {
        const attemptsSnap = await getDocs(collection(db, 'attempts'));
        setAttemptsCount(attemptsSnap.size);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  const loadMoreUsers = async () => {
    if (!lastVisible || loadingMore) return;
    setLoadingMore(true);
    try {
      const roleToFetch = activeTab === 'students' ? 'student' : 'faculty';
      const nextQuery = query(
        collection(db, 'users'), 
        where('role', '==', roleToFetch),
        orderBy('name'), 
        startAfter(lastVisible), 
        limit(50)
      );
      const snap = await getDocs(nextQuery);
      const nextUsers = snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserData[];
      
      setUsers(prev => [...prev, ...nextUsers]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 50);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleApproveExam = async (examId: string, facultyId: string, title: string) => {
    setProcessingId(examId);
    try {
      await updateDoc(doc(db, 'exams', examId), {
        status: 'approved',
        is_active: false
      });
      
      await addDoc(collection(db, 'notifications'), {
        user_id: facultyId,
        title: 'Exam Approved',
        message: `Your exam "${title}" has been approved. You can now unlock it for students.`,
        type: 'success',
        is_read: false,
        created_at: serverTimestamp()
      });

      setPendingExams(prev => prev.filter(e => e.id !== examId));
      setExams(prev => prev.map(e => e.id === examId ? { ...e, status: 'approved', is_active: false } : e));
    } catch (error) {
      alert('Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectExam = async (examId: string, facultyId: string, title: string) => {
    setProcessingId(examId);
    try {
      await updateDoc(doc(db, 'exams', examId), {
        status: 'rejected'
      });
      
      await addDoc(collection(db, 'notifications'), {
        user_id: facultyId,
        title: 'Exam Rejected',
        message: `Your exam "${title}" has been rejected by the administrator.`,
        type: 'error',
        is_read: false,
        created_at: serverTimestamp()
      });

      setPendingExams(prev => prev.filter(e => e.id !== examId));
      setExams(prev => prev.map(e => e.id === examId ? { ...e, status: 'rejected' } : e));
    } catch (error) {
      alert('Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await updateDoc(doc(db, 'exams', examToDelete.id), { is_deleted: true });
      setExams(prev => prev.filter(e => e.id !== examToDelete.id));
      setExamToDelete(null);
    } catch (error) {
      alert('Delete failed');
    }
  };

  const handleApproveFaculty = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { status: 'active' });
      setPendingFaculty(prev => prev.filter(u => u.id !== userId));
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      
      await addDoc(collection(db, 'notifications'), {
        user_id: userId,
        title: 'Account Approved',
        message: 'Your faculty account has been approved. You can now access your dashboard.',
        type: 'success',
        is_read: false,
        created_at: serverTimestamp()
      });
    } catch (error) {
      alert('Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    setProcessingId(userId);
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (error) {
      alert('Update failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = activeTab === 'students' ? u.role === 'student' : u.role === 'faculty';
    if (!matchesRole) return false;

    if (activeTab === 'students') {
      if (selectedYear !== 'ALL' && u.year !== selectedYear) return false;
      if (selectedSection !== 'ALL' && u.section !== selectedSection) return false;
    }
    
    const s = (searchTerm || "").toLowerCase();
    const name = (u.name || "").toString().toLowerCase();
    const email = (u.email || "").toString().toLowerCase();
    const section = (u.section || "").toString().toLowerCase();
    const year = (u.year || "").toString().toLowerCase();
    
    return name.includes(s) || email.includes(s) || section.includes(s) || year.includes(s);
  });

  const uniqueYears = Array.from(new Set(users.filter(u => u.role === 'student').map(u => u.year).filter(Boolean))).sort();
  const uniqueSections = Array.from(new Set(users.filter(u => u.role === 'student').map(u => u.section).filter(Boolean))).sort();

  const approvedExams = exams.filter(e => e.status === 'approved' || e.status === 'rejected');
  const totalPending = pendingExams.length + pendingFaculty.length;

  const stats = {
    faculty: users.filter(u => u.role === 'faculty').length,
    students: users.filter(u => u.role === 'student').length,
    exams: exams.length,
    submissions: attemptsCount
  };

  const groupedStudents = filteredUsers.reduce((acc, u) => {
    const year = u.year || 'N/A';
    const section = u.section || 'N/A';
    if (!acc[year]) acc[year] = {};
    if (!acc[year][section]) acc[year][section] = [];
    acc[year][section].push(u);
    return acc;
  }, {} as Record<string, Record<string, UserData[]>>);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <ConfirmationModal 
        isOpen={!!examToDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${examToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDeleteExam}
        onCancel={() => setExamToDelete(null)}
      />

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-400" size={24} />
              <span className="font-bold text-xl">AdminPanel</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
          </div>
          <nav className="space-y-1">
            <button onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'stats' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Activity size={20} /> Overview</button>
            <button onClick={() => { setActiveTab('approvals'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium relative transition-colors ${activeTab === 'approvals' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}>
              <CheckCircle size={20} /> Approvals
              {totalPending > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalPending}</span>}
            </button>
            <button onClick={() => { setActiveTab('students'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'students' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><User size={20} /> Students</button>
            <button onClick={() => { setActiveTab('faculty'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'faculty' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><GraduationCap size={20} /> Faculty</button>
            <button onClick={() => { setActiveTab('exams'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'exams' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Database size={20} /> Assessments</button>
            <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600' : 'text-slate-400 hover:bg-slate-800'}`}><Settings size={20} /> System Settings</button>
          </nav>
        </div>
        <div className="p-6 border-t border-slate-800 bg-slate-900">
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors font-medium"><LogOut size={18} /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <h1 className="text-lg font-bold text-slate-800 capitalize">{activeTab === 'approvals' ? 'Pending Approvals' : activeTab}</h1>
          </div>
          <div className="flex items-center gap-4">
            <ServerStatus />
            {activeTab === 'exams' && <button onClick={() => setShowAssignForm(true)} className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm shadow-sm shadow-indigo-100">Assign Task</button>}
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {showAssignForm && <div className="mb-8"><AssignmentForm onSuccess={() => setShowAssignForm(false)} onCancel={() => setShowAssignForm(false)} /></div>}

          {activeTab === 'stats' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard title="Total Faculty" value={stats.faculty} icon={GraduationCap} color="bg-indigo-600" />
              <StatCard title="Total Students" value={stats.students} icon={Users} color="bg-emerald-600" />
              <StatCard title="Total Assessments" value={stats.exams} icon={Database} color="bg-amber-600" />
              <StatCard title="Total Submissions" value={stats.submissions} icon={FileCheck} color="bg-rose-600" />
            </div>
          ) : activeTab === 'settings' ? (
            <div className="max-w-2xl bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b bg-slate-50">
                <div className="flex items-center gap-3">
                  <Zap className="text-amber-500" size={24} />
                  <div>
                    <h3 className="font-bold text-slate-900">System Performance & Monitoring</h3>
                    <p className="text-sm text-slate-500">Configure global behavior for exam attempts.</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">Global AI Proctoring</h4>
                      <p className="text-xs text-slate-500">Enable/Disable violation detection and monitoring.</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, proctoring_enabled: !prev.proctoring_enabled }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.proctoring_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.proctoring_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-2">
                      <AlertOctagon size={14} className="text-rose-500" />
                      Violation Limit
                    </label>
                    <input 
                      type="number" 
                      value={settings.violation_limit} 
                      onChange={e => setSettings(prev => ({ ...prev, violation_limit: parseInt(e.target.value) || 5 }))}
                      className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="5"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Auto-submit after this many violations.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-2">
                      <Volume2 size={14} className="text-indigo-500" />
                      Noise Threshold (dB)
                    </label>
                    <input 
                      type="number" 
                      value={settings.noise_threshold} 
                      onChange={e => setSettings(prev => ({ ...prev, noise_threshold: parseInt(e.target.value) || 85 }))}
                      className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="85"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Sensitivity for microphone proctoring.</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bug size={16} className="text-rose-500" />
                        Proctoring Debug Mode
                      </h4>
                      <p className="text-xs text-slate-500">Show real-time proctoring status overlay to students.</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, debug_mode: !prev.debug_mode }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.debug_mode ? 'bg-rose-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.debug_mode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">Background Auto-save</h4>
                      <p className="text-xs text-slate-500">Periodically sync student answers to the database.</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, auto_save_enabled: !prev.auto_save_enabled }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.auto_save_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.auto_save_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  {settings.auto_save_enabled && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Frequency (Seconds)</label>
                      <input 
                        type="number" 
                        value={settings.auto_save_frequency} 
                        onChange={e => setSettings(prev => ({ ...prev, auto_save_frequency: parseInt(e.target.value) || 300 }))}
                        className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="300"
                      />
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">Live Snapshots</h4>
                      <p className="text-xs text-slate-500">Capture and upload student camera feed for monitoring.</p>
                    </div>
                    <button 
                      onClick={() => setSettings(prev => ({ ...prev, snapshots_enabled: !prev.snapshots_enabled }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.snapshots_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.snapshots_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  {settings.snapshots_enabled && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Frequency (Seconds)</label>
                      <input 
                        type="number" 
                        value={settings.snapshots_frequency} 
                        onChange={e => setSettings(prev => ({ ...prev, snapshots_frequency: parseInt(e.target.value) || 3 }))}
                        className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="3"
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {savingSettings ? 'Saving...' : 'Save System Configuration'}
                </button>
              </div>
            </div>
          ) : activeTab === 'approvals' ? (
            <div className="space-y-12">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-800">Pending Faculty Registrations</h2>
                </div>
                {pendingFaculty.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <UserCheck className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-slate-400 text-sm">No faculty accounts awaiting approval</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Faculty Member</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pendingFaculty.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-sm text-slate-900">{u.name}</td>
                            <td className="px-6 py-4 text-xs text-slate-500">{u.email}</td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleApproveFaculty(u.id)} 
                                disabled={processingId === u.id}
                                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <Check size={14} /> Approve Account
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-lg font-bold text-slate-800">Pending Assessment Approvals</h2>
                </div>
                {pendingExams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <FileCheck className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-slate-400 text-sm">No assessments awaiting approval</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Assessment</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Faculty</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {pendingExams.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="font-bold text-sm">{e.title}</div>
                              <div className="text-[10px] text-slate-500">Created {e.created_at?.toDate?.().toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">{e.faculty_name}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleApproveExam(e.id, e.faculty_id, e.title)} disabled={processingId === e.id} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"><Check size={14} /> Approve</button>
                                <button onClick={() => handleRejectExam(e.id, e.faculty_id, e.title)} disabled={processingId === e.id} className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition-colors"><XCircle size={14} /> Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : activeTab === 'exams' ? (
            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Assessment</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Created At</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {approvedExams.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm">{e.title}</div>
                        <div className="text-[10px] text-slate-500">By {e.faculty_name}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{e.created_at?.toDate ? e.created_at.toDate().toLocaleString() : 'N/A'}</td>
                      <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${e.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{e.status}</span></td>
                      <td className="px-6 py-4"><button onClick={() => setExamToDelete(e)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Assessment"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'students' ? (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-3 flex-1 w-full">
                  <Search className="text-slate-400" size={20} />
                  <input type="text" placeholder="Search students..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4">
                  <Filter className="text-slate-400" size={18} />
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-slate-50 border-none text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Years</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                  <select 
                    value={selectedSection} 
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="bg-slate-50 border-none text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Sections</option>
                    {uniqueSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </select>
                </div>
              </div>
              
              {Object.entries(groupedStudents).sort(([a], [b]) => a.localeCompare(b)).map(([year, sections]) => (
                <div key={year} className="space-y-6">
                  <div className="flex items-center gap-3 px-2">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                      <CalendarDays size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Year {year}</h2>
                  </div>

                  <div className="grid gap-8 pl-4 border-l-2 border-slate-200">
                    {Object.entries(sections).sort(([a], [b]) => a.localeCompare(b)).map(([section, students]) => (
                      <div key={section} className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 px-2">
                          <Users size={16} className="text-indigo-500" />
                          Section {section}
                          <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{students.length}</span>
                        </h3>
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                          <table className="w-full text-left">
                            <tbody className="divide-y">
                              {students.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-sm">{u.name}</div>
                                    <div className="text-[10px] text-slate-500">{u.email} | Roll: {u.rollNumber || 'N/A'} | {u.branch || 'N/A'}</div>
                                  </td>
                                  <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{u.status}</span></td>
                                  <td className="px-6 py-4">
                                    <button onClick={() => handleToggleUserStatus(u.id, u.status)} disabled={processingId === u.id} className={`p-2 rounded-lg ${u.status === 'blocked' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`} title={u.status === 'blocked' ? 'Unblock User' : 'Block User'}>
                                      {u.status === 'blocked' ? <UserCheck size={18} /> : <UserX size={18} />}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button 
                    onClick={loadMoreUsers}
                    disabled={loadingMore}
                    className="flex items-center gap-2 bg-white border border-slate-200 px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    {loadingMore ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <ChevronDown size={20} />}
                    Load More Students
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border shadow-sm">
                <Search className="text-slate-400" size={20} />
                <input type="text" placeholder="Search faculty..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{u.status}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {u.role === 'faculty' && u.status === 'pending' && (
                              <button onClick={() => handleApproveFaculty(u.id)} disabled={processingId === u.id} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve Faculty"><Check size={18} /></button>
                            )}
                            <button onClick={() => handleToggleUserStatus(u.id, u.status)} disabled={processingId === u.id} className={`p-2 rounded-lg ${u.status === 'blocked' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-rose-600 hover:bg-rose-50'}`} title={u.status === 'blocked' ? 'Unblock User' : 'Block User'}>
                              {u.status === 'blocked' ? <UserCheck size={18} /> : <UserX size={18} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <GeminiAssistant role="admin" />
    </div>
  );
}