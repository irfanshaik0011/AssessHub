interface ExamStatusBadgeProps {
  status: string;
}

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft': return 'bg-slate-100 text-slate-600';
    case 'pending_approval': return 'bg-amber-100 text-amber-700';
    case 'approved': return 'bg-emerald-100 text-emerald-700';
    case 'rejected': return 'bg-rose-100 text-rose-700';
    case 'archived': return 'bg-slate-100 text-slate-400';
    case 'ready': return 'bg-emerald-100 text-emerald-700';
    case 'completed': return 'bg-slate-100 text-slate-700';
    default: return 'bg-blue-100 text-blue-700';
  }
};

export const ExamStatusBadge = ({ status }: ExamStatusBadgeProps) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${getStatusStyles(status)}`}>
    {status.replace('_', ' ')}
  </span>
);