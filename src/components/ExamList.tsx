import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useExams, Exam } from '../hooks/useExams';
import { ExamCard } from './ExamCard';
import QuestionManager from './QuestionManager';
import ExamRulesModal from './ExamRulesModal';

interface ExamListProps {
  readonly?: boolean;
  filterStatus?: string[];
  onEditExam?: (exam: Exam) => void;
}

export default function ExamList({ readonly = false, filterStatus, onEditExam }: ExamListProps) {
  const navigate = useNavigate();
  const { 
    exams, loading, attempts, distributingId, startingExamId, currentTime,
    toggleActive, togglePublish, deleteExam, distributeQuestions, startExam 
  } = useExams(readonly);
  
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [showRulesFor, setShowRulesFor] = useState<Exam | null>(null);

  const getExamStatus = (exam: Exam) => {
    if (exam.status === 'approved') {
      const now = currentTime.getTime();
      const start = exam.start_time?.toDate?.().getTime() || 0;
      const end = exam.end_time?.toDate?.().getTime() || 0;
      if (now < start) return 'PENDING';
      if (now >= start && now <= end) return 'READY';
      return 'COMPLETED';
    }
    return exam.status.toUpperCase();
  };

  const handleStartClick = (exam: Exam) => {
    const attempt = attempts[exam.id];
    if (attempt && ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'].includes(attempt.status)) {
      if (exam.is_published) navigate(`/student/results/${attempt.id}`);
      return;
    }
    if (attempt) navigate(`/exam/${exam.id}/${attempt.id}`);
    else setShowRulesFor(exam);
  };

  if (loading && exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading examinations...</p>
      </div>
    );
  }

  const filteredExams = filterStatus 
    ? exams.filter(e => filterStatus.includes(e.status)) 
    : exams;

  return (
    <div className="space-y-4">
      {showRulesFor && (
        <ExamRulesModal 
          examTitle={showRulesFor.title}
          onCancel={() => setShowRulesFor(null)}
          onConfirm={() => startExam(showRulesFor)}
          isStarting={startingExamId === showRulesFor.id}
        />
      )}

      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <BookOpen className="text-slate-300 mx-auto mb-2" size={32} />
          <p className="text-slate-400 text-sm">No assessments in this category</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredExams.map((exam) => (
            <React.Fragment key={exam.id}>
              <ExamCard 
                exam={exam}
                status={getExamStatus(exam)}
                readonly={readonly}
                attempt={attempts[exam.id]}
                distributingId={distributingId}
                startingExamId={startingExamId}
                isSelected={selectedExamId === exam.id}
                onSelect={() => setSelectedExamId(selectedExamId === exam.id ? null : exam.id)}
                onToggleActive={() => toggleActive(exam.id, exam.is_active)}
                onTogglePublish={() => togglePublish(exam.id, exam.is_published)}
                onDistribute={() => distributeQuestions(exam.id)}
                onMonitor={() => navigate(`/faculty/monitor/${exam.id}`)}
                onReview={() => navigate(`/faculty/review/${exam.id}`)}
                onStart={() => handleStartClick(exam)}
                onDelete={() => deleteExam(exam.id)}
                onEdit={() => onEditExam?.(exam)}
              />
              {selectedExamId === exam.id && !readonly && (
                <div className="mt-2 p-6 bg-white rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <QuestionManager examId={exam.id} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}