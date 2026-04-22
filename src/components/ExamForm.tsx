import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Users, Building2, Calendar, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';

interface ExamFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  examId?: string;
}

const BRANCHES = ['CSE', 'IT', 'MECH', 'CIVIL', 'CSD', 'CSM', 'AIML'];
const YEARS = ['1', '2', '3', '4'];
const STATIC_SECTIONS = ['A', 'B', 'C', 'D'];

export default function ExamForm({ onSuccess, onCancel, initialData, examId }: ExamFormProps) {
  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    // Adjust to local timezone for datetime-local input
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [title, setTitle] = useState(initialData?.title || '');
  const [duration, setDuration] = useState(initialData?.duration?.toString() || '');
  const [mode, setMode] = useState(initialData?.exam_mode || 'mixed');
  const [startTime, setStartTime] = useState(formatTimestamp(initialData?.start_time));
  const [endTime, setEndTime] = useState(formatTimestamp(initialData?.end_time));
  
  const [targetBranch, setTargetBranch] = useState(initialData?.target_branch || 'ALL');
  const [targetYear, setTargetYear] = useState(initialData?.target_year || 'ALL');
  const [targetSection, setTargetSection] = useState(initialData?.target_section || 'ALL');

  const [sections, setSections] = useState<string[]>(() => {
    const cached = localStorage.getItem('dynamic_sections_cache');
    return cached ? JSON.parse(cached) : STATIC_SECTIONS;
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDynamicSections = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snap = await getDocs(q);
        const uniqueSections = Array.from(new Set(
          snap.docs
            .map(d => d.data().section)
            .filter(s => !!s)
            .map(s => String(s).toUpperCase().trim())
        )).sort();

        if (uniqueSections.length > 0) {
          setSections(uniqueSections);
          localStorage.setItem('dynamic_sections_cache', JSON.stringify(uniqueSections));
        }
      } catch (err) {
        console.error('Failed to fetch dynamic sections:', err);
      }
    };
    fetchDynamicSections();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const dur = parseInt(duration);

    if (dur <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    if (start < new Date() && !examId) {
      setError('Start time cannot be in the past');
      return;
    }

    if (start >= end) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const examData = {
        title,
        duration: dur,
        exam_mode: mode,
        start_time: Timestamp.fromDate(start),
        end_time: Timestamp.fromDate(end),
        target_branch: targetBranch,
        target_year: targetYear,
        target_section: targetSection,
        updated_at: serverTimestamp(),
      };

      if (examId) {
        await updateDoc(doc(db, 'exams', examId), examData);
      } else {
        await addDoc(collection(db, 'exams'), {
          ...examData,
          faculty_id: user.id,
          faculty_name: user.name,
          is_published: false,
          is_active: false,
          status: 'pending_approval',
          created_at: serverTimestamp(),
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">{examId ? 'Edit Assessment Details' : 'Create New Examination'}</h3>
        <button onClick={onCancel} className="text-indigo-100 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="e.g. Mid-term Assessment" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Branch</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={targetBranch} 
                  onChange={(e) => setTargetBranch(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Branches</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Year</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={targetYear} 
                  onChange={(e) => setTargetYear(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Years</option>
                  {YEARS.map(y => <option key={y} value={y}>{y} Year</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Section</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={targetSection} 
                  onChange={(e) => setTargetSection(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Sections</option>
                  {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Time</label>
              <input 
                type="datetime-local" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Time</label>
              <input 
                type="datetime-local" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)} 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (min)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="e.g. 60"
                  required 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Mode</label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value)} 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="mixed">Mixed (MCQ + Descriptive)</option>
                <option value="quiz">Quiz (MCQ Only)</option>
                <option value="descriptive">Descriptive Only</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : examId ? 'Update Assessment' : 'Submit for Approval'}
            </button>
            <button 
              type="button" 
              onClick={onCancel} 
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}