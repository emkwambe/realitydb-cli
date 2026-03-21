import { useState } from 'react';
import type { SuggestedQuery } from './templates';
import type { AppMode } from './ModeToggle';
import type { ChallengeScore } from './App';
import type { StudentSession } from './ClassroomService';

interface HistoryEntry {
  sql: string;
  rowCount: number;
  duration: number;
  timestamp: number;
}

interface Props {
  queries: SuggestedQuery[];
  history: HistoryEntry[];
  onSelect: (sql: string) => void;
  onSelectChallenge?: (query: SuggestedQuery) => void;
  mode?: AppMode;
  challengeScores?: Map<string, ChallengeScore>;
  classroomAssignedIndices?: number[] | null;
  studentSession?: StudentSession | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green/10 text-green',
  intermediate: 'bg-amber/10 text-amber',
  advanced: 'bg-purple/10 text-purple',
};

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green/10 text-green',
  B: 'bg-cyan-400/10 text-cyan-400',
  C: 'bg-amber/10 text-amber',
  D: 'bg-red-400/10 text-red-400',
  F: 'bg-red-400/10 text-red-400',
};

export function QuerySuggestions({ queries, history, onSelect, onSelectChallenge, mode = 'training', challengeScores, classroomAssignedIndices, studentSession }: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const isAssessment = mode === 'assessment';
  const isClassroomStudent = classroomAssignedIndices != null;

  // Filter queries for classroom mode
  const displayQueries = isClassroomStudent
    ? classroomAssignedIndices.map(i => ({ query: queries[i], originalIndex: i })).filter(({ query }) => query != null)
    : queries.map((query, i) => ({ query, originalIndex: i }));

  const completedCount = isClassroomStudent && studentSession
    ? classroomAssignedIndices.filter(i => studentSession.scores[String(i)]).length
    : 0;

  return (
    <div className="p-3 flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          {isClassroomStudent ? (
            <>
              <span>&#x1F3AF;</span> Assigned Challenges
              <span className="ml-auto text-[10px] font-normal text-cyan-400">
                {completedCount}/{classroomAssignedIndices.length} completed
              </span>
            </>
          ) : (
            <>
              <span>&#x1F4A1;</span> Suggested Queries
            </>
          )}
        </h2>
        <div className="space-y-2">
          {displayQueries.map(({ query, originalIndex: i }) => {
            const scoreData = isAssessment && challengeScores ? challengeScores.get(query.label) : undefined;
            const isLocked = isAssessment && scoreData && scoreData.attempts >= 3;

            return (
              <button
                key={i}
                onClick={() => {
                  if (isLocked) return;
                  if (query.checkable && onSelectChallenge) {
                    onSelectChallenge(query);
                  } else {
                    onSelect(query.sql);
                  }
                }}
                className={`w-full bg-bg-card border rounded-lg p-3 text-left transition-all group ${
                  isLocked
                    ? 'border-[var(--border)] opacity-60 cursor-not-allowed'
                    : query.checkable ? 'border-amber/20 hover:border-accent/40' : 'border-[var(--border)] hover:border-accent/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-medium transition-colors ${isLocked ? 'text-[var(--muted)]' : 'text-white group-hover:text-accent'}`}>
                    {query.checkable && (
                      <span className="mr-1" title={isLocked ? 'Submitted' : 'Checkable challenge'}>
                        {isLocked ? '\u{1F512}' : '\u{1F3AF}'}
                      </span>
                    )}
                    {query.label}
                  </span>
                  {isAssessment && scoreData && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${GRADE_COLORS[scoreData.grade] || ''}`}>
                      {scoreData.grade}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DIFFICULTY_COLORS[query.difficulty] || ''}`}
                  >
                    {query.difficulty}
                  </span>
                  <span className="text-[10px] text-[var(--muted)] font-mono">{query.concept}</span>
                  {query.checkable && !isAssessment && (
                    <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber/10 text-amber">
                      checkable
                    </span>
                  )}
                  {isAssessment && scoreData && (
                    <span className="ml-auto text-[10px] text-[var(--muted)] font-mono">
                      {scoreData.score}/100
                    </span>
                  )}
                  {isClassroomStudent && studentSession?.scores[String(i)] && (
                    <span className="ml-auto flex items-center gap-1">
                      <span className="text-green-400 text-xs">&#x2713;</span>
                      <span className="text-[10px] text-[var(--muted)] font-mono">
                        {studentSession.scores[String(i)].score}/100
                      </span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span className={`text-[10px] transition-transform ${historyOpen ? 'rotate-90' : ''}`}>
              &#x25B6;
            </span>
            History ({history.length})
          </button>
          {historyOpen && (
            <div className="space-y-1">
              {history.slice(0, 10).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(entry.sql)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-bg-card transition-colors"
                >
                  <p className="text-[11px] font-mono text-gray-400 truncate">{entry.sql}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {entry.rowCount} rows &middot; {entry.duration}ms
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-bg-card border border-[var(--border)] rounded-lg p-3">
        <h3 className="text-[10px] font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
          Tips
        </h3>
        <ul className="text-[11px] text-[var(--muted)] space-y-1.5">
          <li>&bull; Use <kbd className="px-1 py-0.5 bg-bg-elevated rounded text-[10px]">Ctrl+Enter</kbd> to run queries</li>
          <li>&bull; Click a table name in the schema panel to preview its data</li>
          <li>&bull; Click any suggested query to auto-fill and run it</li>
          <li>&bull; Results are limited to 200 rows for display</li>
        </ul>
      </div>
    </div>
  );
}
