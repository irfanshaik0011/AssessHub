import { useAuth } from './contexts/AuthContext';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import FacultyDashboard from './components/FacultyDashboard';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import ExamInterface from './components/ExamInterface';
import ExamReview from './components/ExamReview';
import LiveMonitor from './components/LiveMonitor';
import StudentResults from './components/StudentResults';
import PendingApproval from './components/PendingApproval';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Initializing ExamPro...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.emailVerified) {
    return (
      <Routes>
        <Route path="/auth/callback" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  // Handle Pending Faculty
  if (user.role === 'faculty' && user.status === 'pending') {
    return (
      <Routes>
        <Route path="*" element={<PendingApproval />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/student" element={user.role === 'student' ? <StudentDashboard /> : <Navigate to="/" replace />} />
      <Route path="/student/results/:attemptId" element={user.role === 'student' ? <StudentResults /> : <Navigate to="/" replace />} />
      <Route path="/exam/:examId/:attemptId" element={user.role === 'student' ? <ExamInterface /> : <Navigate to="/" replace />} />
      <Route path="/faculty" element={user.role === 'faculty' ? <FacultyDashboard /> : <Navigate to="/" replace />} />
      <Route path="/faculty/review/:examId" element={user.role === 'faculty' ? <ExamReview /> : <Navigate to="/" replace />} />
      <Route path="/faculty/monitor/:examId" element={user.role === 'faculty' ? <LiveMonitor /> : <Navigate to="/" replace />} />
      <Route path="/admin" element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} />
      <Route path="/" element={<Navigate to={user.role === 'admin' ? "/admin" : user.role === 'faculty' ? "/faculty" : "/student"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;