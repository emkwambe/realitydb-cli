import { useState } from 'react';

export type AppMode = 'training' | 'assessment';

interface Props {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeToggle({ mode, onModeChange }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = (target: AppMode) => {
    if (target === mode) return;
    if (target === 'assessment') {
      setShowConfirm(true);
    } else {
      onModeChange('training');
    }
  };

  return (
    <>
      <div className="flex items-center bg-bg-card border border-[var(--border)] rounded-md overflow-hidden">
        <button
          onClick={() => handleClick('training')}
          className={`px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
            mode === 'training'
              ? 'bg-[#22c55e]/15 text-[#22c55e] border-r border-[#22c55e]/30'
              : 'text-[var(--muted)] hover:text-white border-r border-[var(--border)]'
          }`}
        >
          <span className="text-sm">&#x1F393;</span> Training
        </button>
        <button
          onClick={() => handleClick('assessment')}
          className={`px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
            mode === 'assessment'
              ? 'bg-[#eab308]/15 text-[#eab308]'
              : 'text-[var(--muted)] hover:text-white'
          }`}
        >
          <span className="text-sm">&#x1F4DD;</span> Assessment
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-card border border-[var(--border)] rounded-lg p-5 max-w-sm mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-2">Switch to Assessment Mode?</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Assessment Mode disables AI assistance and records your scores. Switch?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onModeChange('assessment');
                }}
                className="px-3 py-1.5 text-xs bg-[#eab308]/15 text-[#eab308] border border-[#eab308]/30 rounded hover:bg-[#eab308]/25 transition-colors font-medium"
              >
                Switch to Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
