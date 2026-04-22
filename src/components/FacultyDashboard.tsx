import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, BookOpen, BarChart3, ClipboardList, Users, CheckCircle, Menu, X } from 'lucide-react';
import ExamForm from './ExamForm';
import ExamList from './ExamList';
import FacultyTasks from './FacultyTasks';
import FacultyAnalytics from './FacultyAnalytics';
import GeminiAssistant from './GeminiAssistant';
import StatCard from './StatCard';
import ServerStatus from './ServerStatus';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'tasks'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [stats, setStats] = useState({
    assigned: 0,
    conducted: 0,
    students: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const examsRef = collection(db, 'exams');
      const usersRef = collection(db, 'users');

      const examsSnap = await getDocs(query(examsRef, where('faculty_id', '==', user.id)));
      const exams = examsSnap.docs.map(d => d.data());
      
      const studentsSnap = await getDocs(query(usersRef, where('role', '==', 'student'), where('status', '==', 'active')));

      setStats({
        assigned: exams.filter(e => e.status === 'assigned').length,
        conducted: exams.filter(e => e.status === 'approved' || e.status === 'completed').length,
        students: studentsSnap.size
      });
    };

    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user || activeTab !== 'analytics') return;

    const fetchAnalytics = async () => {
      const examsRef = collection(db, 'exams');
      const attemptsRef = collection(db, 'attempts');

      const examsSnap = await getDocs(query(examsRef, where('faculty_id', '==', user.id)));
      const attemptsSnap = await getDocs(query(attemptsRef, where('status', 'in', ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'])));
      
      const myExams = examsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myExamIds = myExams.map(e => e.id);
      const myAttempts = attemptsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((a: any) => myExamIds.includes(a.exam_id));

      const totalSubmissions = myAttempts.length;
      const avgScore = totalSubmissions > 0 
        ? myAttempts.reduce((acc, curr: any) => acc + (curr.score || 0), 0) / totalSubmissions 
        : 0;

      const violationStats = [
        { name: 'Tab Switch', value: 12 },
        { name: 'No Face', value: 5 },
        { name: 'Multiple Faces', value: 2 },
        { name: 'Noise', value: 8 }
      ];

      setAnalyticsData({
        metrics: {
          active_exams: myExams.filter((e: any) => e.status === 'approved' && e.is_active).length,
          live_attempts: 0,
          total_submissions: totalSubmissions,
          total_attempts: totalSubmissions,
          avg_class_score: avgScore
        },
        violationStats,
        difficultQuestions: []
      });
    };

    fetchAnalytics();
  }, [user, activeTab]);

  const handleEditExam = (exam: any) => {
    setEditingExam(exam);
    setShowExamForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseForm = () => {
    setShowExamForm(false);
    setEditingExam(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
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
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button 
              onClick={() => { setActiveTab('tasks'); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <ClipboardList size={20} /> Tasks
            </button>
            <button 
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BarChart3 size={20} /> Analytics
            </button>
          </nav>
        </div>
        <div className="p-6 border-t bg-white">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">Faculty Member</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-red-600 transition-colors font-medium text-sm">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-bold text-slate-800 capitalize">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-4">
            <ServerStatus />
            <button 
              onClick={() => setShowExamForm(true)} 
              className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100"
            >
              Create Exam
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                <StatCard title="Assigned Tasks" value={stats.assigned} icon={ClipboardList} color="bg-amber-600" />
                <StatCard title="Exams Conducted" value={stats.conducted} icon={CheckCircle} color="bg-emerald-600" />
                <StatCard title="Total Students" value={stats.students} icon={Users} color="bg-indigo-600" />
              </div>

              {showExamForm && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <ExamForm 
                    initialData={editingExam}
                    examId={editingExam?.id}
                    onSuccess={handleCloseForm} 
                    onCancel={handleCloseForm} 
                  />
                </div>
              )}

              <div className="space-y-8 sm:space-y-12">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <h2 className="text-lg font-bold text-slate-800">Approved Assessments</h2>
                  </div>
                  <ExamList filterStatus={['approved']} onEditExam={handleEditExam} />
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <h2 className="text-lg font-bold text-slate-800">Awaiting Admin Approval</h2>
                  </div>
                  <ExamList filterStatus={['pending_approval']} onEditExam={handleEditExam} />
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    <h2 className="text-lg font-bold text-slate-800">Drafts</h2>
                  </div>
                  <ExamList filterStatus={['draft']} onEditExam={handleEditExam} />
                </section>
              </div>
            </>
          )}
          
          {activeTab === 'tasks' && <FacultyTasks />}
          {activeTab === 'analytics' && (
            analyticsData ? (
              <FacultyAnalytics data={analyticsData} />
            ) : (
              <div className="py-12 text-center text-slate-500">Gathering analytics data...</div>
            )
          )}
        </div>
      </main>
      <GeminiAssistant role="faculty" />
    </div>
  );
}