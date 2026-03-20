import { useState, useEffect, useCallback } from 'react';
import { buildStepQueries } from './sqlParser';
import { runQuery } from './sandbox';
import type { QueryResult } from './sandbox';

interface Props {
  sql: string;
  onClose: () => void;
}

interface StepResult {
  label: string;
  description: string;
  clauseType: string;
  result: QueryResult | null;
  loading: boolean;
  error?: string;
}

const CLAUSE_COLORS: Record<string, string> = {
  FROM: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  JOIN: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  WHERE: 'bg-red-400/15 text-red-400 border-red-400/30',
  'GROUP BY': 'bg-amber/15 text-amber border-amber/30',
  HAVING: 'bg-orange-400/15 text-orange-400 border-orange-400/30',
  SELECT: 'bg-green/15 text-green border-green/30',
  'ORDER BY': 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30',
  LIMIT: 'bg-gray-400/15 text-gray-400 border-gray-400/30',
};

const CLAUSE_ICONS: Record<string, string> = {
  FROM: '\u{1F4E6}',      // package
  JOIN: '\u{1F517}',      // link
  WHERE: '\u{1F50D}',     // magnifying glass
  'GROUP BY': '\u{1F4CA}', // bar chart
  HAVING: '\u{1F6AB}',    // no entry
  SELECT: '\u{1F4CB}',    // clipboard
  'ORDER BY': '\u{2195}', // up-down arrow
  LIMIT: '\u{2702}',      // scissors
};

export function TransformationViewer({ sql, onClose }: Props) {
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const executeSteps = useCallback(async () => {
    const stepDefs = buildStepQueries(sql);
    if (stepDefs.length === 0) return;

    const initial: StepResult[] = stepDefs.map((s) => ({
      label: s.label,
      description: s.description,
      clauseType: s.clauseType,
      result: null,
      loading: true,
    }));
    setSteps(initial);
    setActiveStep(0);
    setInitialized(true);

    // Execute steps sequentially so each builds on context
    for (let i = 0; i < stepDefs.length; i++) {
      try {
        const result = await runQuery(stepDefs[i].sql);
        setSteps((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], result, loading: false, error: result.error };
          return next;
        });
      } catch (e) {
        setSteps((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          };
          return next;
        });
      }
    }
  }, [sql]);

  useEffect(() => {
    if (!initialized) {
      executeSteps();
    }
  }, [executeSteps, initialized]);

  const current = steps[activeStep];

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-bg-elevated shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-[var(--muted)]">
            Transformation Steps
          </span>
          <span className="text-[10px] text-[var(--muted)]">
            {steps.length} stage{steps.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-[var(--muted)] hover:text-white transition-colors px-2 py-0.5 border border-[var(--border)] rounded"
        >
          Close
        </button>
      </div>

      {/* Pipeline visualization */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-bg-elevated overflow-x-auto shrink-0">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveStep(i)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-all ${
                i === activeStep
                  ? CLAUSE_COLORS[step.clauseType] || 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-bg-card border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-[var(--border)]'
              }`}
            >
              <span className="mr-1">{CLAUSE_ICONS[step.clauseType] || ''}</span>
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <span className="text-[var(--muted)] mx-0.5 text-[10px]">&rarr;</span>
            )}
          </div>
        ))}
      </div>

      {/* Step detail */}
      {current && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Step description */}
          <div className="px-3 py-2 border-b border-[var(--border)] bg-bg-card/50 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${CLAUSE_COLORS[current.clauseType] || ''}`}>
                {current.label}
              </span>
              {current.result && !current.loading && (
                <span className="text-[10px] text-[var(--muted)] font-mono">
                  {current.result.rowCount} rows &middot; {current.result.duration}ms
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">{current.description}</p>
          </div>

          {/* Result table */}
          <div className="flex-1 overflow-auto">
            {current.loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : current.error ? (
              <div className="p-3">
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-mono">{current.error}</p>
                </div>
              </div>
            ) : current.result && current.result.columns.length > 0 ? (
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-bg-elevated sticky top-0">
                    <th className="px-2 py-1.5 text-left text-[10px] text-[var(--muted)] font-semibold border-b border-[var(--border)] w-8">#</th>
                    {current.result.columns.map((col) => (
                      <th
                        key={col}
                        className="px-2 py-1.5 text-left text-[10px] text-[var(--muted)] font-semibold border-b border-[var(--border)]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {current.result.rows.slice(0, 10).map((row, ri) => (
                    <tr key={ri} className="hover:bg-bg-card/50 transition-colors border-b border-[var(--border)]/30">
                      <td className="px-2 py-1 text-[var(--muted)]">{ri + 1}</td>
                      {current.result!.columns.map((col) => (
                        <td key={col} className="px-2 py-1 text-gray-300 max-w-[200px] truncate">
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--muted)] text-xs">
                No rows returned
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)] bg-bg-elevated shrink-0">
            <button
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
              className="text-[10px] text-[var(--muted)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
            >
              &larr; Prev
            </button>
            <span className="text-[10px] text-[var(--muted)] font-mono">
              Step {activeStep + 1} of {steps.length}
            </span>
            <button
              onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={activeStep === steps.length - 1}
              className="text-[10px] text-[var(--muted)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-mono"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {steps.length === 0 && initialized && (
        <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-xs">
          Could not parse query into transformation steps. Try a SELECT query with FROM clause.
        </div>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
