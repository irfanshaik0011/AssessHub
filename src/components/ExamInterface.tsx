import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ExamTimer from './ExamTimer';
import CameraProctor from './CameraProctor';
import { Wifi, WifiOff, ClipboardList, AlertCircle, ChevronLeft, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Question {
  id: string;
  text: string;
  difficulty: string;
  question_type: 'mcq' | 'descriptive';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  imageUrl?: string;
  score?: number;
}

export default function ExamInterface() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSummary, setShowSummary] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!attemptId || !examId) return;
    fetchExamAndQuestions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [examId, attemptId]);

  const fetchExamAndQuestions = async () => {
    setLoading(true);
    try {
      const [examDoc, attemptDoc] = await Promise.all([
        getDoc(doc(db, 'exams', examId!)),
        getDoc(doc(db, 'attempts', attemptId!))
      ]);
      
      if (!examDoc.exists() || !attemptDoc.exists()) {
        setError("Assessment data not found.");
        return;
      }

      const attemptData = attemptDoc.data();
      setExam({ id: examDoc.id, ...examDoc.data() });
      setAttempt({ id: attemptDoc.id, ...attemptData });
      setQuestions(attemptData.assigned_questions || []);
      setAnswers(attemptData.final_answers_map || {});
    } catch (err) {
      setError("Failed to load assessment.");
    } finally {
      setLoading(false);
    }
  };

  const handleViolation = () => {
    // Violation logic disabled in Lite version
  };

  const handleSubmitExam = async (isForced = false) => {
    if (submitting) return;
    setSubmitting(true);
    
    try {
      let obtainedScore = 0;
      questions.forEach((q) => {
        if (q.question_type === 'mcq' && answers[q.id] === q.correct_option) {
          obtainedScore += (q.score || 1);
        }
      });
      
      const totalPossible = attempt?.total_exam_score || 0;
      const finalPercentage = totalPossible > 0 ? Math.round((obtainedScore / totalPossible) * 100) : 0;

      await updateDoc(doc(db, 'attempts', attemptId!), {
        status: isForced ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        submitted_at: serverTimestamp(),
        score: finalPercentage,
        obtained_score: obtainedScore,
        final_answers_map: answers
      });

      navigate('/student', { replace: true });
    } catch (error) { 
      alert('Submission failed.'); 
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;

  const currentQuestion = questions[currentIndex];
  const attemptedCount = Object.keys(answers).filter(k => answers[k] !== '').length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 select-none">
      {showSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6">Exam Summary</h2>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                <span>Attempted</span>
                <span className="font-bold">{attemptedCount} / {questions.length}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSummary(false)} className="flex-1 py-3 border rounded-xl font-bold">Back</button>
              <button onClick={() => handleSubmitExam(false)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between mb-6">
                <h1 className="text-xl font-bold">{exam.title}</h1>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${isOnline ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm text-slate-500 mb-2">Question {currentIndex + 1} of {questions.length}</p>
                <h2 className="text-lg font-medium mb-4">{currentQuestion.text}</h2>
                
                {currentQuestion.question_type === 'mcq' ? (
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <label key={opt} className={`flex items-center p-4 border rounded-lg cursor-pointer ${answers[currentQuestion.id] === opt ? 'border-indigo-600 bg-indigo-50' : ''}`}>
                        <input type="radio" checked={answers[currentQuestion.id] === opt} onChange={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: opt }))} className="w-4 h-4" />
                        <span className="ml-3">{opt}. {currentQuestion[`option_${opt.toLowerCase()}` as keyof Question]}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea value={answers[currentQuestion.id] || ''} onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))} className="w-full border p-4 rounded-lg h-48" placeholder="Type your answer..." />
                )}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="px-6 py-2 bg-slate-100 rounded-lg font-bold">Prev</button>
                <button onClick={() => currentIndex < questions.length - 1 ? setCurrentIndex(currentIndex + 1) : setShowSummary(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">
                  {currentIndex === questions.length - 1 ? 'Review' : 'Next'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <ExamTimer expiresAt={attempt.expires_at} durationMinutes={exam.duration} onTimeExpired={() => handleSubmitExam(true)} />
            <CameraProctor onViolation={handleViolation} />
          </div>
        </div>
      </div>
    </div>
  );
}