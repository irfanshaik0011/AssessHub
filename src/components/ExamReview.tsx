import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Power, RotateCcw, PlayCircle, Eye, X, CheckCircle2, XCircle, AlertCircle, ShieldAlert, FileText } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { useExams } from '../hooks/useExams';
import { useAuth } from '../contexts/AuthContext';

interface Attempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_roll_number?: string;
  student_branch?: string;
  student_section?: string;
  status: string;
  score: number;
  obtained_score?: number;
  total_exam_score?: number;
  started_at: any;
  submitted_at: any;
  final_answers_map?: Record<string, string>;
  assigned_questions?: any[];
  violations?: Array<{ type: string; reason: string; timestamp: string }>;
  force_submitted_by_faculty?: boolean;
}

export default function ExamReview() {
  const { examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { forceSubmit, restartAttempt, resumeAttempt } = useExams(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    fetchData();
  }, [examId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examSnap, attemptsSnap] = await Promise.all([
        getDoc(doc(db, 'exams', examId!)),
        getDocs(query(collection(db, 'attempts'), where('exam_id', '==', examId), orderBy('started_at', 'desc')))
      ]);

      if (examSnap.exists()) {
        const examData = examSnap.data();
        if (user?.role !== 'admin' && examData.faculty_id !== user?.id) {
          navigate('/faculty');
          return;
        }
        setExam({ id: examSnap.id, ...examData });
      }
      setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Attempt[]);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAction = async (action: () => Promise<void>, id: string) => {
    setProcessingId(id);
    try {
      await action();
      await fetchData();
    } catch (error) {
      alert('Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportAutoAndForceStops = () => {
    const filtered = attempts.filter(a => 
      a.status === 'AUTO_SUBMITTED' || a.force_submitted_by_faculty === true
    );

    if (filtered.length === 0) {
      alert('No auto-submitted or force-stopped attempts found for this exam.');
      return;
    }

    const csvData = filtered.map(a => ({
      'Roll Number': a.student_roll_number || 'N/A',
      'Student Name': a.student_name
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Violations");
    XLSX.writeFile(wb, `Violations_Report_${exam?.title || examId}.csv`);
  };

  const handleExportAllResults = () => {
    const data = attempts
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map(a => ({
        'Roll Number': a.student_roll_number || 'N/A',
        'Student Name': a.student_name,
        'Branch': a.student_branch || 'N/A',
        'Section': a.student_section || 'N/A',
        'Total Marks': a.total_exam_score || 100,
        'Obtained Marks': a.obtained_score || 0,
        'Percentage': `${a.score || 0}%`,
        'Status': a.status
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, `Full_Results_${examId}.csv`);
  };

  const handleDownloadStudentReport = (attempt: Attempt) => {
    if (!attempt.assigned_questions) return;

    let rightAnswersCount = 0;
    const reportData = attempt.assigned_questions.map((q, index) => {
      const studentAnswer = attempt.final_answers_map?.[q.id] || '';
      const correctAnswer = q.correct_option || 'N/A';
      const isCorrect = q.question_type === 'mcq' && studentAnswer.toUpperCase() === correctAnswer.toUpperCase();
      
      if (isCorrect) rightAnswersCount++;

      return {
        'Q.No': index + 1,
        'Question': q.text,
        'Correct Answer': correctAnswer,
        'Student Answer': studentAnswer || '(Not Attempted)',
        'Status': studentAnswer === '' ? 'Not Attempted' : isCorrect ? 'Correct' : 'Wrong',
        'Points': isCorrect ? (q.score || 1) : 0
      };
    });

    // Add Summary Rows
    reportData.push({} as any); // Empty row
    reportData.push({
      'Q.No': 'SUMMARY',
      'Question': 'Total Questions',
      'Correct Answer': attempt.assigned_questions.length,
      'Student Answer': '',
      'Status': '',
      'Points': ''
    } as any);
    reportData.push({
      'Q.No': '',
      'Question': 'Right Answers',
      'Correct Answer': rightAnswersCount,
      'Student Answer': '',
      'Status': '',
      'Points': ''
    } as any);
    reportData.push({
      'Q.No': '',
      'Question': 'Final Score',
      'Correct Answer': `${attempt.score}%`,
      'Student Answer': '',
      'Status': '',
      'Points': ''
    } as any);

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Report");
    XLSX.writeFile(wb, `Report_${attempt.student_roll_number || 'Student'}_${attempt.student_name.replace(/\s+/g, '_')}.csv`);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <button onClick={() => navigate('/faculty')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} /> Back to Dashboard
          </button>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button 
              onClick={handleExportAutoAndForceStops} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-rose-700 transition-all"
            >
              <ShieldAlert size={18} /> Download Violations Report
            </button>
            <button 
              onClick={handleExportAllResults} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-700 transition-all"
            >
              <Download size={18} /> Export All Results
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Score</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attempts.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {a.student_name}
                        {(a.violations && a.violations.length > 0) && (
                          <span className="text-rose-500" title={`${a.violations.length} violations detected`}>
                            <AlertCircle size={14} />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{a.student_roll_number || 'N/A'} | {a.student_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                        a.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' : 
                        a.status === 'AUTO_SUBMITTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>{a.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">
                      {a.obtained_score || 0}/{a.total_exam_score || 0} ({a.score || 0}%)
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedAttempt(a)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Answers"
                        >
                          <Eye size={18} />
                        </button>
                        {a.status === 'IN_PROGRESS' && (
                          <button 
                            onClick={() => handleAction(() => forceSubmit(a.id), a.id)}
                            disabled={processingId === a.id}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Force Submit"
                          >
                            <Power size={18} />
                          </button>
                        )}
                        {a.status === 'AUTO_SUBMITTED' && (
                          <button 
                            onClick={() => handleAction(() => resumeAttempt(a.id), a.id)}
                            disabled={processingId === a.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Resume Exam"
                          >
                            <PlayCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleAction(() => restartAttempt(a.id), a.id)}
                          disabled={processingId === a.id}
                          className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                          title="Restart Attempt"
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAttempt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedAttempt.student_name}'s Submission</h3>
                  <p className="text-xs text-slate-500">Score: {selectedAttempt.obtained_score}/{selectedAttempt.total_exam_score} ({selectedAttempt.score}%)</p>
                </div>
                <button 
                  onClick={() => handleDownloadStudentReport(selectedAttempt)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all"
                >
                  <FileText size={14} /> Download Report
                </button>
              </div>
              <button onClick={() => setSelectedAttempt(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {selectedAttempt.violations && selectedAttempt.violations.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-6">
                  <h4 className="text-rose-700 font-bold text-sm mb-2 flex items-center gap-2">
                    <ShieldAlert size={16} /> Integrity Violations Log
                  </h4>
                  <div className="space-y-2">
                    {selectedAttempt.violations.map((v, i) => (
                      <div key={i} className="text-xs text-rose-600 flex justify-between">
                        <span>{v.type}: {v.reason}</span>
                        <span className="opacity-70">{new Date(v.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedAttempt.assigned_questions || selectedAttempt.assigned_questions.length === 0) ? (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle className="mx-auto mb-2" size={32} />
                  <p>No question data available for this attempt.</p>
                </div>
              ) : (
                selectedAttempt.assigned_questions.map((q: any, i: number) => {
                  const studentAnswer = selectedAttempt.final_answers_map?.[q.id] || '';
                  const isCorrect = q.question_type === 'mcq' && studentAnswer.toUpperCase() === q.correct_option?.toUpperCase();
                  
                  return (
                    <div key={q.id} className="border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                      <div className="flex gap-4">
                        <div className="shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-sm">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <p className="text-base font-medium text-slate-800">{q.text}</p>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {isCorrect ? q.score : 0} / {q.score} Points
                            </span>
                          </div>

                          {q.question_type === 'mcq' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                              {['A', 'B', 'C', 'D'].map(opt => (
                                <div key={opt} className={`p-3 rounded-lg border text-xs ${
                                  q.correct_option === opt ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' :
                                  studentAnswer === opt ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-100 text-slate-500'
                                }`}>
                                  {opt}. {q[`option_${opt.toLowerCase()}`]}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Student Answer</p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{studentAnswer || 'No answer provided.'}</p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            {studentAnswer === '' ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase"><AlertCircle size={12} /> Not Attempted</span>
                            ) : isCorrect ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase"><CheckCircle2 size={12} /> Correct</span>
                            ) : q.question_type === 'mcq' ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase"><XCircle size={12} /> Incorrect</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase"><CheckCircle2 size={12} /> Submitted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}