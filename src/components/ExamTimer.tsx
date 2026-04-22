import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ExamTimerProps {
  expiresAt: any; // Firestore Timestamp
  durationMinutes: number;
  onTimeExpired: () => void;
}

export default function ExamTimer({ expiresAt, durationMinutes, onTimeExpired }: ExamTimerProps) {
  const calculateTimeLeft = () => {
    if (!expiresAt) return 0;
    const end = expiresAt.toDate ? expiresAt.toDate().getTime() : new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 1000));
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const initialRemaining = calculateTimeLeft();
    if (initialRemaining <= 0) {
      onTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 300) { // 5 minutes warning
        setIsWarning(true);
      }

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onTimeExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = durationMinutes * 60;
  const percent = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

  return (
    <div className={`p-4 rounded-lg ${isWarning ? 'bg-red-50' : 'bg-blue-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        {isWarning && <AlertCircle className="text-red-600" size={20} />}
        <span className={`font-semibold ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>
          Time Remaining
        </span>
      </div>
      <div className="text-2xl font-bold mb-2">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isWarning ? 'bg-red-600' : 'bg-blue-600'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}