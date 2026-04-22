"use client";

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, Award, BookOpen, HelpCircle, Target, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Question {
  id: string;
  text: string;
  question_type: 'mcq' | 'descriptive';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  score?: number;
}

export default function StudentResults() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId) return;
      try {
        const attemptDoc = await getDoc(doc(db, 'attempts', attemptId));
        if (!attemptDoc.exists()) {
          navigate('/student');
          return;
        }
        const attemptData = attemptDoc.data();
        setAttempt({ id: attemptDoc.id, ...attemptData });

        const examDoc = await getDoc(doc(db, 'exams', attemptData.exam_id));
        if (examDoc.exists()) {
          const examData = examDoc.data();
          setExam({ id: examDoc.id, ...examData });
          
          // CRITICAL: Use questions from the attempt document
          setQuestions(attemptData.assigned_questions || []);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [attemptId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!exam?.is_published) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <HelpCircle size={64} className="text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Results Not Released</h2>
        <p className="text-slate-500 mt-2">The faculty has not yet released the results for this examination.</p>
        <button onClick={() => navigate('/student')} className="mt-6 text-indigo-600 font-bold flex items-center gap-2">
          <ChevronLeft size={20} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const answers = attempt.final_answers_map || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6">
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8">
          <div className="bg-indigo-600 p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
                <div className="flex flex-wrap gap-4 mt-4">
                  <p className="text-indigo-100 flex items-center gap-2 text-sm">
                    <BookOpen size={18} /> {exam.subject || 'General Assessment'}
                  </p>
                  <p className="text-indigo-100 flex items-center gap-2 text-sm">
                    <Target size={18} /> Total Marks: {attempt.total_exam_score || 0}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center min-w-[140px]">
                <Award className="mx-auto mb-2 text-amber-300" size={32} />
                <div className="text-2xl font-black">
                  Score: {attempt.obtained_score || 0}/{attempt.total_exam_score || 0} ({attempt.score || 0}%)
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2">Final Result</div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Detailed Performance Review</h2>
            <div className="space-y-8">
              {questions.map((q: Question, index: number) => {
                const studentAnswer = String(answers[q.id] || '').trim();
                const correctAnswer = String(q.correct_option || '').trim();
                const isAttempted = studentAnswer !== '';
                const isCorrect = isAttempted && q.question_type === 'mcq' && studentAnswer.toUpperCase() === correctAnswer.toUpperCase();
                const pointsEarned = isCorrect ? (q.score || 1) : 0;
                
                return (
                  <div key={q.id} className="border-b border-slate-100 last:border-0 pb-8 last:pb-0">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-500 text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-lg font-medium text-slate-800">{q.text}</p>
                          <div className="text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${!isAttempted ? 'bg-slate-100 text-slate-500' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {pointsEarned} / {q.score || 1} Points
                            </span>
                          </div>
                        </div>
                        
                        {q.question_type === 'mcq' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {['A', 'B', 'C', 'D'].map((opt) => {
                              const optionText = q[`option_${opt.toLowerCase()}` as keyof Question];
                              const isCorrectOption = correctAnswer.toUpperCase() === opt;
                              const isStudentChoice = studentAnswer.toUpperCase() === opt;

                              return (
                                <div 
                                  key={opt}
                                  className={`p-4 rounded-xl border-2 transition-all ${
                                    isCorrectOption 
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                                      : isStudentChoice && !isCorrectOption
                                      ? 'bg-rose-50 border-rose-500 text-rose-900'
                                      : 'bg-white border-slate-100 text-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isCorrectOption ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                      {opt}
                                    </span>
                                    <span className="text-sm font-medium">{optionText}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Your Answer</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{studentAnswer || 'No answer provided.'}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            !isAttempted ? 'bg-slate-100 text-slate-500' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {!isAttempted ? <AlertCircle size={14} /> : isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {!isAttempted ? 'Not Attempted' : isCorrect ? 'Correct' : 'Incorrect'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}