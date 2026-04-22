import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Clock, Target, Award, Download } from 'lucide-react';

interface AnalyticsProps {
  data: {
    metrics: {
      assigned_count: number;
      completed_count: number;
      total_minutes: number;
      average_score: number;
    };
    performanceTrend: Array<{ name: string; score: number; date: string }>;
    timeData: Array<{ name: string; minutes: number }>;
  };
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StudentAnalytics({ data }: AnalyticsProps) {
  const { metrics, performanceTrend, timeData } = data;

  const handleExport = () => {
    alert('Performance report export is disabled in this version.');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Performance Overview</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-slate-200 text-slate-500 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-bold"
        >
          <Download size={18} />
          Export Performance Report (Locked)
        </button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Target size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Avg. Score</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.average_score)}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Award size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Completion</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics.assigned_count > 0 
              ? Math.round((metrics.completed_count / metrics.assigned_count) * 100) 
              : 0}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Time</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{Math.round(metrics.total_minutes)}m</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Exams Taken</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics.completed_count}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Performance Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  hide 
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Time Spent (Minutes)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                  {timeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}