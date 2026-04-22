import { useEffect, useRef, useState } from 'react';
import { Camera, Bug } from 'lucide-react';

interface CameraProctorProps {
  onViolation: (type: string, reason: string) => void;
}

export default function CameraProctor({ onViolation }: CameraProctorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240 },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsMonitoring(true);
          };
        }
      } catch (err) {
        console.warn('Camera access denied or not available');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Camera size={16} className={isMonitoring ? "text-green-600" : "text-gray-400"} />
            Live Proctoring
          </h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            {isMonitoring ? 'Active' : 'Initializing'}
          </span>
        </div>
        <video
          ref={videoRef}
          className="w-full rounded border border-gray-300 bg-black aspect-video object-cover"
          autoPlay
          muted
          playsInline
        />
      </div>

      {/* Keep Debug UI but remove logic */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-700 font-mono text-[10px] space-y-3 opacity-50">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <div className="flex items-center gap-2 text-rose-400">
            <Bug size={14} />
            <span className="font-bold uppercase">Proctoring Debugger (Lite)</span>
          </div>
        </div>
        <p className="text-slate-400 italic">Advanced monitoring disabled in this version.</p>
      </div>
    </div>
  );
}