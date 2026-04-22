import { useState } from 'react';
import { ShieldAlert, CheckCircle2, X, Play } from 'lucide-react';

interface ExamRulesModalProps {
  examTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  isStarting: boolean;
}

export default function ExamRulesModal({ examTitle, onCancel, onConfirm, isStarting }: ExamRulesModalProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header - Fixed */}
        <div className="bg-blue-600 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} />
            <div>
              <h2 className="text-xl font-bold">Exam Rules & Instructions</h2>
              <p className="text-blue-100 text-sm">{examTitle}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        {/* Scrollable Rules Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 -webkit-overflow-scrolling-touch">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">Fullscreen Mode:</span> The exam must be taken in fullscreen. Exiting fullscreen will record a violation.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">Tab Switching:</span> Switching tabs or windows is strictly prohibited and monitored.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">AI Proctoring:</span> Your camera and microphone will be active. Ensure you are in a well-lit, quiet room alone.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">Violation Limit:</span> Reaching 3 proctoring violations will result in an <span className="text-red-600 font-bold">automatic submission</span>.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">Restricted Actions:</span> Copying, pasting, and right-clicking are disabled throughout the exam.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
              <p className="text-gray-700 text-sm sm:text-base">
                <span className="font-bold">Stable Connection:</span> Ensure you have a stable internet connection. Progress is saved automatically, but disconnections may affect proctoring.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer - Always Visible */}
        <div className="p-6 border-t bg-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 shrink-0"
              />
              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                I have read and understood the rules. I agree to be monitored via camera and microphone, and I understand that any violation may lead to automatic submission.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!accepted || isStarting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              {isStarting ? 'Starting...' : 'Start Exam Now'}
              <Play size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}