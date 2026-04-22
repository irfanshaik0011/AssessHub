import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  description?: string;
}

export default function StatCard({ title, value, icon: Icon, color, description }: StatCardProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`${color.replace('bg-', 'text-')} sm:w-6 sm:h-6`} size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-xs sm:text-sm font-medium mb-1">{title}</h3>
        <div className="text-xl sm:text-2xl font-bold text-slate-900">{value}</div>
        {description && <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}