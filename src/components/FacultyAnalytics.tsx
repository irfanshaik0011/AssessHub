import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, HelpCircle, TrendingUp, Users, Download } from 'lucide-react';

interface AnalyticsProps {
  data: {
    metrics: {
      active_exams: number;
      live_attempts: number;
      total_submissions: number;
      total_attempts: number;
      avg_class_score: number;
    };
    violationStats: Array<{ name: string; value: number }>;
    difficultQuestions: Array<{ text: string; exam_title: string; success_rate: number; question_type: string }>;
  };
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function FacultyAnalytics({ data }: AnalyticsProps) {
  const { metrics, violationStats, difficultQuestions } = data;

  const handleExport = () => {
    alert('Data export is disabled in this version.');
  };

  const completionRate = metrics.total_attempts > 0 
    ? Math.round((metrics.total_submissions / metrics.total_attempts) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Class Analytics</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-slate-200 text-slate-500 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-bold"
        >
          <Download size={18} />
          Export Summary Report (Locked)
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Avg. Class Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.avg_class_score)}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Users size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Completion Rate</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{completionRate}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <HelpCircle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Submissions</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.total_submissions}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Live Attempts</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.live_attempts}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Violation Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" />
            Integrity Overview (Violations)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {violationStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficult Questions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <HelpCircle size={20} className="text-amber-500" />
            Most Challenging Questions
          </h3>
          <div className="space-y-4">
            {difficultQuestions.length > 0 ? (
              difficultQuestions.map((q, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{q.exam_title}</span>
                    <span className="text-xs font-bold text-rose-600">{Math.round(q.success_rate)}% Success</span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2 font-medium">{q.text}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">No question data available yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}