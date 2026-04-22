"use client";

import React from 'react';
import { Check, X, Image as ImageIcon } from 'lucide-react';

interface QuestionEntryFormProps {
  isEditing?: boolean;
  type: 'mcq' | 'descriptive';
  setType: (type: 'mcq' | 'descriptive') => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (diff: 'easy' | 'medium' | 'hard') => void;
  text: string;
  setText: (text: string) => void;
  options: { a: string; b: string; c: string; d: string };
  setOptions: (options: { a: string; b: string; c: string; d: string }) => void;
  correctOption: string;
  setCorrectOption: (opt: string) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  loading: boolean;
  examMode: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const QuestionEntryForm = ({
  isEditing = false,
  type,
  setType,
  difficulty,
  setDifficulty,
  text,
  setText,
  options,
  setOptions,
  correctOption,
  setCorrectOption,
  imageUrl,
  setImageUrl,
  loading,
  examMode,
  onSubmit,
  onCancel
}: QuestionEntryFormProps) => {

  const handleImageUpload = () => {
    alert('Image uploads are disabled in this version.');
  };

  return (
    <form onSubmit={onSubmit} className="bg-gray-50 p-4 sm:p-6 rounded-xl mb-4 border border-blue-100 shadow-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h5 className="text-sm sm:text-base font-bold text-blue-800">
            {isEditing ? 'Edit Question' : 'Add New Question'}
          </h5>
          {isEditing && (
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Question Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'mcq' | 'descriptive')}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={examMode !== 'mixed'}
            >
              {examMode !== 'descriptive' && <option value="mcq">Multiple Choice (MCQ)</option>}
              {examMode !== 'quiz' && <option value="descriptive">Descriptive / Essay</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Question Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
            placeholder="Enter the question content here..."
            required
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Question Image (Disabled)</label>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={handleImageUpload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-sm font-medium cursor-not-allowed"
            >
              <ImageIcon size={18} />
              Upload Image
            </button>
          </div>
        </div>

        {type === 'mcq' && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-2">Options & Correct Answer</p>
            {['A', 'B', 'C', 'D'].map((opt) => (
              <div key={opt} className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctOption === opt}
                    onChange={() => setCorrectOption(opt)}
                    className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                </div>
                <span className="text-sm font-bold text-slate-400 w-4">{opt}</span>
                <input
                  type="text"
                  value={options[opt.toLowerCase() as keyof typeof options]}
                  onChange={(e) => setOptions({ ...options, [opt.toLowerCase()]: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={`Option ${opt}`}
                  required={type === 'mcq'}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-100"
          >
            {loading ? 'Saving...' : isEditing ? <><Check size={18} /> Update Question</> : <><Check size={18} /> Add Question</>}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg hover:bg-slate-300 text-sm font-bold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
};

export default QuestionEntryForm;