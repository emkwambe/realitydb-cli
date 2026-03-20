import { useState, useRef, useEffect, useCallback } from 'react';
import type { NLtoSQLResult } from './aiService';

export interface NLHistoryEntry {
  question: string;
  sql: string;
  timestamp: number;
}

const exampleQuestions: Record<string, string[]> = {
  saas: [
    'How many users are in each organization?',
    'Which plan has the most active subscriptions?',
    'Show monthly user signups',
    'Top 5 organizations by employee count',
  ],
  ecommerce: [
    'What are the best-selling product categories?',
    'Show average order value by customer city',
    'Which customers have spent the most?',
    'Monthly revenue trend',
  ],
  fintech: [
    'Which account types have the most fraud alerts?',
    'Show transaction volume by type',
    'Average balance by account type',
    'High-value transactions over $10,000',
  ],
  healthcare: [
    'How many encounters per provider?',
    'Show billing totals by status',
    'Which patients have the most medications?',
    'Average vitals by patient',
  ],
  logistics: [
    'Which warehouse has the most inventory?',
    'Show shipment counts by status',
    'Average delivery time by route',
    'Low stock items across warehouses',
  ],
  cybersecurity: [
    'How many vulnerabilities by severity?',
    'Which assets have the most incidents?',
    'Recent scan results with critical findings',
    'Average incident resolution time',
  ],
  'ai-events': [
    'Which framework has the best model accuracy?',
    'Show experiment results by model',
    'Active deployments by environment',
    'Event volume by type over time',
  ],
  'sql-traps': [
    'How many orders per customer?',
    'Revenue by order status',
    'Products that have never been ordered',
    'Monthly revenue including months with no orders',
  ],
};

interface Props {
  templateId: string;
  loading: boolean;
  queryCount: number;
  history: NLHistoryEntry[];
  aiInfo: { explanation: string; confidence: 'high' | 'medium' | 'low' } | null;
  onSubmit: (question: string) => void;
  onDismissInfo: () => void;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function ConfidenceDots({ level }: { level: 'high' | 'medium' | 'low' }) {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-[#a78bfa]' : 'bg-[#3a3d45]'
          }`}
        />
      ))}
      <span className="ml-1 text-[10px] capitalize">{level}</span>
    </span>
  );
}

export function NLQueryPanel({
  templateId,
  loading,
  queryCount,
  history,
  aiInfo,
  onSubmit,
  onDismissInfo,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const infoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);

  // Auto-focus input when expanded
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Handle info bar auto-dismiss
  useEffect(() => {
    if (aiInfo) {
      setInfoVisible(true);
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
      infoTimerRef.current = setTimeout(() => {
        setInfoVisible(false);
        onDismissInfo();
      }, 10000);
    } else {
      setInfoVisible(false);
    }
    return () => {
      if (infoTimerRef.current) clearTimeout(infoTimerRef.current);
    };
  }, [aiInfo, onDismissInfo]);

  // Collapse panel after successful generation
  useEffect(() => {
    if (aiInfo && expanded) {
      setExpanded(false);
      setInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiInfo]);

  const handleSubmit = useCallback(() => {
    const q = input.trim();
    if (!q || loading) return;
    onSubmit(q);
  }, [input, loading, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleExampleClick = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  const handleHistoryClick = (q: string) => {
    onSubmit(q);
  };

  const examples = exampleQuestions[templateId] || [];

  return (
    <div className="shrink-0">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#12121a] border-b border-[var(--border)] text-xs hover:bg-[#1a1c24] transition-colors"
      >
        <span>{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="text-[#a78bfa] font-medium">Ask AI</span>
        {loading && (
          <span className="ml-2 text-[var(--muted)] animate-pulse">Generating SQL...</span>
        )}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-[#12121a] border-b border-[var(--border)] px-3 py-3 space-y-3">
          {/* Input row */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your data..."
              disabled={loading}
              className="flex-1 bg-[#0a0a12] border border-[#3a3d45] rounded px-3 py-1.5 text-sm text-white font-mono placeholder:text-[#4a4d55] outline-none focus:border-[#a78bfa] transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || loading}
              className="px-3 py-1.5 bg-[#a78bfa] text-white text-xs rounded font-medium hover:bg-[#8b6fe0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Ask AI
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#a78bfa] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              Generating SQL...
            </div>
          )}

          {/* Example questions (show when no history) */}
          {!loading && history.length === 0 && examples.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-mono">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExampleClick(q)}
                    className="px-2 py-1 text-[11px] text-[#a78bfa]/80 bg-[#a78bfa]/5 border border-[#a78bfa]/15 rounded hover:bg-[#a78bfa]/10 hover:text-[#a78bfa] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {!loading && history.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-mono">Recent:</p>
              {history.slice(0, 5).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleHistoryClick(entry.question)}
                  className="w-full text-left px-2 py-1 text-[11px] text-[var(--muted)] hover:text-white hover:bg-[#1a1c24] rounded transition-colors truncate"
                >
                  &quot;{entry.question}&quot;{' '}
                  <span className="text-[10px] opacity-60">({timeAgo(entry.timestamp)})</span>
                </button>
              ))}
            </div>
          )}

          {/* Usage counter */}
          <p className="text-[10px] text-[var(--muted)] font-mono">
            AI queries today: {queryCount} / 5 (free tier)
          </p>
        </div>
      )}

      {/* Info bar - shown after AI generates a query */}
      {infoVisible && aiInfo && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#a78bfa]/5 border-b border-[#a78bfa]/20 text-xs">
          <span className="text-[#a78bfa]">AI:</span>
          <span className="text-[var(--muted)] flex-1 truncate">&quot;{aiInfo.explanation}&quot;</span>
          <ConfidenceDots level={aiInfo.confidence} />
          <button
            onClick={() => {
              setInfoVisible(false);
              onDismissInfo();
            }}
            className="text-[var(--muted)] hover:text-white ml-1"
          >
            x
          </button>
        </div>
      )}
    </div>
  );
}
