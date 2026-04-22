import { useState, useEffect } from 'react';
import { Upload, Settings2, Plus, Trash2, Edit2, Sparkles, Save } from 'lucide-react';
import BulkUploadModal from './BulkUploadModal';
import QuestionEntryForm from './QuestionEntryForm';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'descriptive';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  imageUrl?: string;
  created_at?: string;
}

export default function QuestionManager({ examId }: { examId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalPerStudent, setTotalPerStudent] = useState(0);
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  
  const [scoreEasy, setScoreEasy] = useState(1);
  const [scoreMedium, setScoreMedium] = useState(2);
  const [scoreHard, setScoreHard] = useState(3);

  const [loading, setLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [examMode, setExamMode] = useState('mixed');

  const [qType, setQType] = useState<'mcq' | 'descriptive'>('mcq');
  const [qDiff, setQDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState({ a: '', b: '', c: '', d: '' });
  const [qCorrect, setQCorrect] = useState('A');
  const [qImage, setQImage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchQuestions(); }, [examId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const bankDoc = await getDoc(doc(db, 'exams', examId, 'question_data', 'bank'));
      const fetchedQuestions = bankDoc.exists() ? (bankDoc.data().questions || []) : [];
      setQuestions(fetchedQuestions);
      
      const examDoc = await getDoc(doc(db, 'exams', examId));
      if (examDoc.exists()) {
        const data = examDoc.data();
        setTotalPerStudent(data.questions_per_student || 0);
        setEasyCount(data.easy_count || 0);
        setMediumCount(data.medium_count || 0);
        setHardCount(data.hard_count || 0);
        setScoreEasy(data.score_easy || 1);
        setScoreMedium(data.score_medium || 2);
        setScoreHard(data.score_hard || 3);
        setExamMode(data.exam_mode || 'mixed');
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDistribution = async () => {
    const sum = easyCount + mediumCount + hardCount;
    if (sum !== totalPerStudent) {
      alert(`Invalid distribution! Sum (${sum}) must equal Total per Student (${totalPerStudent}).`);
      return;
    }

    try {
      setLoading(true);
      // We only save the settings. The actual allocation happens when the student starts the exam.
      await updateDoc(doc(db, 'exams', examId), {
        questions_per_student: totalPerStudent,
        easy_count: easyCount,
        medium_count: mediumCount,
        hard_count: hardCount,
        score_easy: scoreEasy,
        score_medium: scoreMedium,
        score_hard: scoreHard,
        updated_at: serverTimestamp()
      });
      
      alert('Distribution settings saved! Students will receive unique shuffled questions.');
    } catch (error) { 
      alert('Save failed'); 
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newQuestion: Question = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        text: qText,
        question_type: qType,
        difficulty: qDiff,
        imageUrl: qImage,
        ...(qType === 'mcq' ? {
          option_a: qOptions.a,
          option_b: qOptions.b,
          option_c: qOptions.c,
          option_d: qOptions.d,
          correct_option: qCorrect
        } : {}),
        created_at: new Date().toISOString()
      };

      await runTransaction(db, async (transaction) => {
        const bankRef = doc(db, 'exams', examId, 'question_data', 'bank');
        const bankDoc = await transaction.get(bankRef);
        const currentQuestions = bankDoc.exists() ? (bankDoc.data().questions || []) : [];
        
        let updatedList;
        if (editingId) {
          updatedList = currentQuestions.map((q: any) => q.id === editingId ? newQuestion : q);
        } else {
          updatedList = [...currentQuestions, newQuestion];
        }

        transaction.set(bankRef, {
          questions: updatedList,
          updated_at: serverTimestamp()
        });
        
        setQuestions(updatedList);
      });

      resetManualForm();
    } catch (error) {
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const bankRef = doc(db, 'exams', examId, 'question_data', 'bank');
        const bankDoc = await transaction.get(bankRef);
        const currentQuestions = bankDoc.exists() ? (bankDoc.data().questions || []) : [];
        
        const updatedList = currentQuestions.filter((q: any) => q.id !== id);
        
        transaction.set(bankRef, {
          questions: updatedList,
          updated_at: serverTimestamp()
        });
        
        setQuestions(updatedList);
      });
    } catch (error) {
      alert('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (parsed: any[]) => {
    setLoading(true);
    try {
      const newQuestions = parsed.map(q => ({
        ...q,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      }));

      await runTransaction(db, async (transaction) => {
        const bankRef = doc(db, 'exams', examId, 'question_data', 'bank');
        const bankDoc = await transaction.get(bankRef);
        const currentQuestions = bankDoc.exists() ? (bankDoc.data().questions || []) : [];
        
        const updatedList = [...currentQuestions, ...newQuestions];

        transaction.set(bankRef, {
          questions: updatedList,
          updated_at: serverTimestamp()
        });
        
        setQuestions(updatedList);
      });

      setShowBulkModal(false);
    } catch (error) { 
      alert('Upload failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const resetManualForm = () => {
    setQText('');
    setQOptions({ a: '', b: '', c: '', d: '' });
    setQCorrect('A');
    setQImage('');
    setEditingId(null);
    setShowManualForm(false);
  };

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setQText(q.text);
    setQType(q.question_type);
    setQDiff(q.difficulty);
    setQImage(q.imageUrl || '');
    if (q.question_type === 'mcq') {
      setQOptions({ a: q.option_a || '', b: q.option_b || '', c: q.option_c || '', d: q.option_d || '' });
      setQCorrect(q.correct_option || 'A');
    }
    setShowManualForm(true);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-emerald-50 text-emerald-600';
      case 'medium': return 'bg-amber-50 text-amber-600';
      case 'hard': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold flex items-center gap-2"><Settings2 size={18} /> Distribution & Scoring</h4>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-bold text-slate-500 block mb-1">Total Questions</label>
            <input type="number" value={totalPerStudent} onChange={e => setTotalPerStudent(parseInt(e.target.value) || 0)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-600 block mb-1">Easy Count</label>
            <input type="number" value={easyCount} onChange={e => setEasyCount(parseInt(e.target.value) || 0)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-amber-600 block mb-1">Medium Count</label>
            <input type="number" value={mediumCount} onChange={e => setMediumCount(parseInt(e.target.value) || 0)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-rose-600 block mb-1">Hard Count</label>
            <input type="number" value={hardCount} onChange={e => setHardCount(parseInt(e.target.value) || 0)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Score (Easy)</label>
            <input type="number" value={scoreEasy} onChange={e => setScoreEasy(parseInt(e.target.value) || 1)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Score (Medium)</label>
            <input type="number" value={scoreMedium} onChange={e => setScoreMedium(parseInt(e.target.value) || 2)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Score (Hard)</label>
            <input type="number" value={scoreHard} onChange={e => setScoreHard(parseInt(e.target.value) || 3)} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Bank Status: {questions.filter(q => q.difficulty === 'easy').length} Easy, {questions.filter(q => q.difficulty === 'medium').length} Medium, {questions.filter(q => q.difficulty === 'hard').length} Hard
          </p>
          <button 
            onClick={handleSaveDistribution} 
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Distribution Settings'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h4 className="font-bold">Question Bank ({questions.length})</h4>
        <div className="flex gap-3">
          <button onClick={() => setShowManualForm(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
            <Plus size={18} /> Add Question
          </button>
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 text-indigo-600 font-bold text-sm border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-50">
            <Upload size={18} /> Bulk Upload
          </button>
        </div>
      </div>

      {showManualForm && (
        <QuestionEntryForm 
          isEditing={!!editingId}
          type={qType}
          setType={setQType}
          difficulty={qDiff}
          setDifficulty={setQDiff}
          text={qText}
          setText={setQText}
          options={qOptions}
          setOptions={setQOptions}
          correctOption={qCorrect}
          setCorrectOption={setQCorrect}
          imageUrl={qImage}
          setImageUrl={setQImage}
          loading={loading}
          examMode={examMode}
          onSubmit={handleManualSubmit}
          onCancel={resetManualForm}
        />
      )}

      {showBulkModal && <BulkUploadModal onClose={() => setShowBulkModal(false)} onUpload={handleBulkUpload} isUploading={loading} />}
      
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white p-4 border rounded-xl shadow-sm group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 rounded">#{i+1}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getDifficultyColor(q.difficulty)}`}>{q.difficulty}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-50 text-slate-500 rounded">{q.question_type}</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(q)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(q.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex gap-4">
              {q.imageUrl && (
                <img src={q.imageUrl} alt="Question" className="w-20 h-20 object-cover rounded-lg border shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{q.text}</p>
                {q.question_type === 'mcq' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <div key={opt} className={`text-[10px] p-1.5 rounded border ${q.correct_option === opt.toUpperCase() ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        {opt.toUpperCase()}. {q[`option_${opt}` as keyof Question]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}