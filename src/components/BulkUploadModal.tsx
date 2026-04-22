"use client";

import { useState } from 'react';
import { X, Upload, FileText, Check, AlertTriangle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ParsedQuestion {
  text: string;
  question_type: 'mcq' | 'descriptive';
  difficulty: 'easy' | 'medium' | 'hard';
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  errors: string[];
}

interface BulkUploadModalProps {
  onClose: () => void;
  onUpload: (questions: ParsedQuestion[]) => Promise<void>;
  isUploading: boolean;
  maxQuestions?: number;
}

const BulkUploadModal = ({ onClose, onUpload, isUploading, maxQuestions = 200 }: BulkUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError("Bulk processing is disabled in this version. Please add questions manually.");
  };

  const handleDownloadTemplate = () => {
    alert("Template download is disabled in this version.");
  };

  const handleConfirmUpload = async () => {
    alert("Bulk upload feature is locked. Please upgrade your license.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Upload size={20} />
            <h3 className="font-bold">Bulk Upload (Disabled)</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
            <div>
              <p className="text-sm font-bold text-rose-900">Feature Locked</p>
              <p className="text-xs text-rose-700">Bulk question importing is an advanced feature not included in your current plan.</p>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-white text-rose-600 px-4 py-2 rounded-lg text-xs font-bold border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <Download size={14} /> Download Template
            </button>
          </div>

          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-not-allowed bg-slate-50">
              <Upload className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">Bulk upload is disabled</p>
              <input type="file" className="hidden" disabled />
            </label>
          ) : (
            <div className="space-y-4 opacity-50">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-sm font-bold">{selectedFile.name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {error && <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}
        </div>

        <div className="p-6 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl font-bold">Cancel</button>
          <button 
            onClick={handleConfirmUpload} 
            disabled={true}
            className="flex-1 py-2.5 bg-slate-300 text-white rounded-xl font-bold cursor-not-allowed"
          >
            Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;