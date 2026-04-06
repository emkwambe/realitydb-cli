import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useSchemaStore } from '../store';

interface AIGeneratorModalProps {
  onClose: () => void;
}

export default function AIGeneratorModal({ onClose }: AIGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { importSchema } = useSchemaStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    // TODO: Replace with actual AI API call
    // For now, show a placeholder message
    setTimeout(() => {
      setLoading(false);
      alert('AI generation is not yet connected. This feature will use an AI model to generate a schema from your description.');
    }, 1500);
  };

  const examples = [
    'E-commerce platform with users, products, orders, and reviews',
    'SaaS app with tenants, users, subscriptions, and invoices',
    'Social media with profiles, posts, comments, and likes',
    'Hospital system with patients, doctors, appointments, and prescriptions',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            Generate with AI
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Describe your schema
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the database schema you want to create..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-28"
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Examples</p>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="px-2 py-1 text-[10px] text-slate-500 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 rounded-md border border-slate-100 hover:border-purple-200 transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className="px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : 'Generate Schema'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
