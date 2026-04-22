import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Activity, Camera, Mic, AlertTriangle, Power, RotateCcw, Loader2, Server, CheckCircle2, XCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useExams } from '../hooks/useExams';

interface Attempt {
  id: string;
  student_name: string;
  student_email: string;
  student_roll_number?: string;
  status: string;
  started_at: any;
  live_snapshot?: string;
  live_noise_level?: number;
  last_snapshot_at?: any;
}

export default function LiveMonitor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { forceSubmit, restartAttempt } = useExams(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [refreshFrequency, setRefreshFrequency] = useState(5); // Default 5s

  const checkBackendHealth = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const cleanBase = base.replace(/\/$/, '');
      const res = await fetch(`${cleanBase}/health`);
      if (res.ok) setBackendStatus('online');
      else setBackendStatus('offline');
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  const fetchConfig = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'exam_config'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.snapshots_frequency) {
          setRefreshFrequency(data.snapshots_frequency);
        }
      }
    } catch (err) {
      console.error('Error fetching monitor config:', err);
    }
  };

  const fetchAttempts = async (isInitial = false) => {
    if (!examId) return;
    if (isInitial) setLoading(true);

    try {
      const attemptsRef = collection(db, 'attempts');
      const q = query(attemptsRef, where('exam_id', '==', examId), orderBy('started_at', 'desc'));
      const snapshot = await getDocs(q);
      
      const attemptsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attempt[];
      
      const sorted = [...attemptsData].sort((a, b) => {
        if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
        if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1;
        return 0;
      });

      setAttempts(sorted);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Monitor fetch error:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts(true);
    fetchConfig();
    checkBackendHealth();
    
    const pollInterval = setInterval(() => {
      fetchAttempts();
      checkBackendHealth();
      fetchConfig(); // Keep frequency in sync
    }, 60000);

    return () => clearInterval(pollInterval);
  }, [examId]);

  // Separate effect for image refresh to handle dynamic frequency changes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(Date.now());
    }, refreshFrequency * 1000);

    return () => clearInterval(interval);
  }, [refreshFrequency]);

  const handleForceSubmit = async (id: string) => {
    if (!confirm('Are you sure you want to force-submit this exam?')) return;
    setProcessingId(id);
    try {
      await forceSubmit(id);
      await fetchAttempts();
    } catch (error) {
      alert('Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestart = async (id: string) => {
    if (!confirm('This will delete the current attempt and clear all answers. Continue?')) return;
    setProcessingId(id);
    try {
      await restartAttempt(id);
      await fetchAttempts();
    } catch (error) {
      alert('Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleImageLoad = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: false }));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Connecting to live feed...</p>
      </div>
    </div>
  );

  const activeAttempts = attempts.filter(a => a.status === 'IN_PROGRESS');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <button onClick={() => navigate('/faculty')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-2">
              <ChevronLeft size={20} /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="text-rose-500" />
              Live Proctoring Monitor
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${
              backendStatus === 'online' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
              backendStatus === 'offline' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              <Server size={14} />
              API Server: {backendStatus}
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
              <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                Refreshing every {refreshFrequency}s
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="text-xs font-bold text-slate-500">
                Last Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="text-xs font-bold text-emerald-600">
                {activeAttempts.length} Active
              </div>
            </div>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Activity className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-slate-900">No attempts found</h3>
            <p className="text-slate-500">No students have started this examination yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {attempts.map(attempt => (
              <div key={attempt.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all ${attempt.status === 'IN_PROGRESS' ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-200 opacity-75'}`}>
                <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{attempt.student_name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">{attempt.student_roll_number || 'N/A'}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    attempt.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {attempt.status === 'IN_PROGRESS' ? '● Live' : attempt.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="aspect-video bg-slate-900 relative group">
                  {attempt.live_snapshot && !imageErrors[attempt.id] ? (
                    <img 
                      key={`${attempt.id}-${refreshKey}`}
                      src={`${attempt.live_snapshot}?t=${refreshKey}`} 
                      alt="Live Feed" 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={() => handleImageError(attempt.id)}
                      onLoad={() => handleImageLoad(attempt.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-800">
                      <Camera size={32} className="opacity-20" />
                      <span className="text-[10px] font-medium">Feed Offline</span>
                    </div>
                  )}
                  
                  {attempt.status === 'IN_PROGRESS' && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-white">
                        <Mic size={10} className={attempt.live_noise_level && attempt.live_noise_level > 80 ? "text-rose-400" : "text-emerald-400"} />
                        <span className="text-[10px] font-bold">{attempt.live_noise_level || 0}dB</span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    {attempt.status === 'IN_PROGRESS' && (
                      <button 
                        onClick={() => handleForceSubmit(attempt.id)}
                        disabled={processingId === attempt.id}
                        className="p-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors"
                        title="Force Submit"
                      >
                        <Power size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleRestart(attempt.id)}
                      disabled={processingId === attempt.id}
                      className="p-3 bg-slate-700 text-white rounded-full hover:bg-slate-800 transition-colors"
                      title="Restart Attempt"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      Started: {attempt.started_at?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {attempt.live_noise_level && attempt.live_noise_level > 85 && (
                      <span className="flex items-center gap-1 text-rose-600 font-bold">
                        <AlertTriangle size={10} /> High Noise
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}