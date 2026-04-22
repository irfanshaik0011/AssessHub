import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ClipboardList, Calendar, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import QuestionManager from './QuestionManager';

interface Task {
  id: string;
  title: string;
  subject: string;
  task_deadline: any;
  instructions: string;
  status: string;
}

export default function FacultyTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'exams'),
      where('faculty_id', '==', user.id),
      where('status', '==', 'assigned')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'exams', taskId), {
        status: 'pending_approval', // Move to pending for Admin approval
        updated_at: serverTimestamp()
      });
      setSelectedTaskId(null);
    } catch (error) {
      alert('Failed to submit task');
    }
  };

  if (loading) return <div className="py-12 text-center text-slate-500">Loading tasks...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <ClipboardList size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assigned Tasks</h2>
          <p className="text-slate-500 text-sm">Manage question preparation for Admin-assigned assessments.</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <CheckCircle2 className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
          <p className="text-slate-500">No new assessment tasks have been assigned to you.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Action Required</span>
                      <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={16} />
                        Deadline: {task.task_deadline?.toDate().toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={16} />
                        Subject: {task.subject}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Instructions</p>
                      <p className="text-sm text-slate-700">{task.instructions}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        selectedTaskId === task.id ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {selectedTaskId === task.id ? 'Close Manager' : 'Prepare Questions'}
                      <ChevronRight size={18} className={selectedTaskId === task.id ? 'rotate-90' : ''} />
                    </button>
                  </div>
                </div>

                {selectedTaskId === task.id && (
                  <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold text-slate-900">Question Preparation</h4>
                      <button 
                        onClick={() => handleCompleteTask(task.id)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Submit for Approval
                      </button>
                    </div>
                    <QuestionManager examId={task.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}