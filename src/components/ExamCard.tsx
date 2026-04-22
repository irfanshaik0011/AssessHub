import { useState } from 'react';
import { Clock, Calendar, Users, ChevronRight, Loader2, Share2, Lock, Unlock, Eye, EyeOff, Activity, ClipboardCheck, Award, Trash2, HelpCircle, Settings } from 'lucide-react';
import { Exam } from '../hooks/useExams';
import { ExamStatusBadge } from './ExamStatusBadge';
import ConfirmationModal from './ConfirmationModal';

interface ExamCardProps {
  exam: Exam;
  status: string;
  readonly: boolean;
  attempt?: any;
  distributingId: string | null;
  startingExamId: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
  onTogglePublish: () => void;
  onDistribute: () => void;
  onMonitor: () => void;
  onReview: () => void;
  onStart: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const ExamCard = ({
  exam, status, readonly, attempt, distributingId, startingExamId, isSelected,
  onSelect, onToggleActive, onTogglePublish, onDistribute, onMonitor, onReview, onStart, onDelete, onEdit
}: ExamCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isCompleted = attempt && ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADED'].includes(attempt.status);
  const isInProgress = attempt && attempt.status === 'IN_PROGRESS';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${exam.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          onDelete?.();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{exam.title}</h3>
              <div className="flex flex-wrap gap-1.5">
                <ExamStatusBadge status={status} />
                {!readonly && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${exam.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                    {exam.is_active ? 'Unlocked' : 'Locked'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs sm:text-sm text-slate-500">
              <div className="flex items-center gap-1.5" title="Published by">
                <Users size={14} className="text-indigo-500" /> 
                <span className="font-medium">By {exam.faculty_name}</span>
              </div>
              <div className="flex items-center gap-1.5" title="Duration">
                <Clock size={14} className="text-amber-500" /> 
                <span>{exam.duration} Minutes</span>
              </div>
              <div className="flex items-center gap-1.5" title="Schedule">
                <Calendar size={14} className="text-emerald-500" /> 
                <span>{exam.start_time?.toDate?.().toLocaleDateString()}</span>
              </div>
            </div>

            {readonly && exam.questions_per_student && (
              <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-slate-600">
                  <HelpCircle size={14} className="text-slate-400" />
                  Total Questions: {exam.questions_per_student}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                    Easy: {exam.easy_count || 0}
                  </span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100">
                    Medium: {exam.medium_count || 0}
                  </span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100">
                    Hard: {exam.hard_count || 0}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!readonly ? (
              <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                <button onClick={onEdit} className="p-2 text-slate-600 hover:bg-slate-200 rounded-md" title="Edit Details">
                  <Settings size={18} />
                </button>
                <button onClick={onDistribute} disabled={distributingId === exam.id} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-md" title="Distribute Questions">
                  {distributingId === exam.id ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                </button>
                <button onClick={onToggleActive} className={`p-2 rounded-md ${exam.is_active ? 'text-rose-600 hover:bg-rose-100' : 'text-indigo-600 hover:bg-indigo-100'}`} title={exam.is_active ? 'Lock Exam' : 'Unlock Exam'}>
                  {exam.is_active ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
                <button onClick={onTogglePublish} className={`p-2 rounded-md ${exam.is_published ? 'text-amber-600 hover:bg-amber-100' : 'text-emerald-600 hover:bg-emerald-100'}`} title={exam.is_published ? 'Unpublish Results' : 'Publish Results'}>
                  {exam.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={onMonitor} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-md" title="Live Monitor"><Activity size={18} /></button>
                <button onClick={onReview} className="p-2 text-slate-600 hover:bg-slate-200 rounded-md" title="Review Submissions"><ClipboardCheck size={18} /></button>
                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-md" title="Delete Assessment"><Trash2 size={18} /></button>
                <button onClick={onSelect} className={`p-2 rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                  <ChevronRight size={18} className={`transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={onStart}
                disabled={startingExamId === exam.id || (isCompleted && !exam.is_published) || status === 'PENDING'}
                className={`px-6 py-2 rounded-lg font-bold transition-all text-sm ${
                  isCompleted && exam.is_published ? 'bg-emerald-600 text-white' : 
                  isCompleted ? 'bg-slate-100 text-slate-400' : 
                  status === 'PENDING' ? 'bg-amber-50 text-amber-400' : 'bg-indigo-600 text-white'
                }`}
              >
                {isCompleted && exam.is_published ? <><Award size={14} className="inline mr-1" /> Results</> : 
                 isInProgress ? 'Continue' : isCompleted ? 'Submitted' : status === 'PENDING' ? 'Upcoming' : 'Start Exam'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};