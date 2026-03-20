import { useState } from 'react';
import type { SuggestedQuery } from './templates';

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
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-green/10 text-green',
  intermediate: 'bg-amber/10 text-amber',
  advanced: 'bg-purple/10 text-purple',
};

export function QuerySuggestions({ queries, history, onSelect, onSelectChallenge }: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <div className="p-3 flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>💡</span> Suggested Queries
        </h2>
        <div className="space-y-2">
          {queries.map((query, i) => (
            <button
              key={i}
              onClick={() => {
                if (query.checkable && onSelectChallenge) {
                  onSelectChallenge(query);
                } else {
                  onSelect(query.sql);
                }
              }}
              className={`w-full bg-bg-card border rounded-lg p-3 text-left hover:border-accent/40 transition-all group ${
                query.checkable ? 'border-amber/20' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs text-white font-medium group-hover:text-accent transition-colors">
                  {query.checkable && <span className="mr-1" title="Checkable challenge">&#x1F3AF;</span>}
                  {query.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DIFFICULTY_COLORS[query.difficulty] || ''}`}
                >
                  {query.difficulty}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono">{query.concept}</span>
                {query.checkable && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber/10 text-amber">
                    checkable
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span className={`text-[10px] transition-transform ${historyOpen ? 'rotate-90' : ''}`}>
              ▶
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
                    {entry.rowCount} rows · {entry.duration}ms
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
          <li>• Use <kbd className="px-1 py-0.5 bg-bg-elevated rounded text-[10px]">Ctrl+Enter</kbd> to run queries</li>
          <li>• Click a table name in the schema panel to preview its data</li>
          <li>• Click any suggested query to auto-fill and run it</li>
          <li>• Results are limited to 200 rows for display</li>
        </ul>
      </div>
    </div>
  );
}
