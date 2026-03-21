import { useEffect, useRef } from 'react';
import type { PersistedSession } from './persistence';

interface ResumeDialogProps {
  session: PersistedSession;
  templateName: string;
  onResume: () => void;
  onStartFresh: () => void;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function ResumeDialog({ session, templateName, onResume, onStartFresh }: ResumeDialogProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onStartFresh();
    }, 30000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onStartFresh]);

  const queryCount = session.queryHistory?.length ?? 0;
  const templateProgress = session.templateId ? session.challengeProgress?.[session.templateId] : null;
  const completedChallenges = templateProgress
    ? Object.values(templateProgress).filter((c) => c.completed).length
    : 0;
  const totalChallenges = templateProgress ? Object.keys(templateProgress).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-lg">&#128194;</span>
          Resume Previous Session?
        </h2>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Template</span>
            <span className="text-white font-medium">{templateName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Last active</span>
            <span className="text-white">{timeAgo(session.timestamp)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Queries</span>
            <span className="text-white">{queryCount} in history</span>
          </div>
          {totalChallenges > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Challenges</span>
              <span className="text-white">{completedChallenges} of {totalChallenges} completed</span>
            </div>
          )}
          {session.mode === 'assessment' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Mode</span>
              <span className="text-[#eab308] font-medium">Assessment</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onResume}
            className="flex-1 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/80 transition-colors"
          >
            Resume Session
          </button>
          <button
            onClick={onStartFresh}
            className="flex-1 px-4 py-2.5 bg-bg-elevated border border-[var(--border)] text-sm text-[var(--muted)] rounded-lg hover:text-white hover:border-accent/40 transition-colors"
          >
            Start Fresh
          </button>
        </div>

        <p className="text-[10px] text-[var(--muted)] text-center mt-3">
          Auto-dismisses in 30 seconds
        </p>
      </div>
    </div>
  );
}
