import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: any;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, 'notifications');
    // Optimized: Only listen to the 10 most recent notifications to save reads
    const q = query(
      notificationsRef, 
      where('user_id', '==', user.id), 
      orderBy('created_at', 'desc'), 
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(data);
    }, (error) => {
      console.error('Notification listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.is_read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { is_read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <XCircle className="text-rose-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed md:absolute right-0 md:right-0 top-16 md:top-auto md:mt-2 w-full md:w-80 bg-white md:rounded-2xl shadow-2xl border-b md:border border-slate-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Check size={14} />
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-120px)] md:max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold text-slate-900 truncate ${!n.is_read ? 'pr-4' : ''}`}>{n.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2">
                          {n.created_at?.toDate ? n.created_at.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                    {!n.is_read && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}