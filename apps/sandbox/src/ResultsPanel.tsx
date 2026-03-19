import { useState, useCallback, useMemo } from 'react';
import type { QueryResult, TableInfo } from './sandbox';
import { ChartPanel, detectChartType, chartTypeLabel } from './ChartPanel';
import { ErrorFeedback } from './ErrorFeedback';

type ViewMode = 'table' | 'chart' | 'split';

interface Props {
  result: QueryResult | null;
  schema: TableInfo[];
}

const MAX_DISPLAY_ROWS = 200;

function formatValue(value: unknown): { text: string; className: string } {
  if (value === null || value === undefined) {
    return { text: 'NULL', className: 'italic text-[var(--muted)] opacity-50' };
  }
  if (typeof value === 'boolean') {
    return {
      text: String(value),
      className: value ? 'text-green' : 'text-red-400',
    };
  }
  if (typeof value === 'number') {
    return { text: String(value), className: 'text-amber' };
  }
  const str = String(value);
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    return { text: str, className: 'text-amber' };
  }
  return { text: str, className: 'text-gray-400' };
}

export function ResultsPanel({ result, schema }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);

  const detection = useMemo(() => {
    if (!result || result.error || result.rows.length === 0) return { type: 'none' as const };
    return detectChartType(result.columns, result.rows);
  }, [result]);

  const hasChart = detection.type !== 'none';
  const effectiveView = viewMode ?? (hasChart ? 'split' : 'table');

  const handleCopyCSV = useCallback(() => {
    if (!result || result.error) return;
    const header = result.columns.join(',');
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(',')
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
  }, [result]);

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--muted)] text-sm">
        Run a query to see results
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="h-full p-4 overflow-auto">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm font-mono">{result.error}</p>
        </div>
        <ErrorFeedback error={result.error} schema={schema} />
      </div>
    );
  }

  if (result.rows.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-3 py-1.5 border-b border-[var(--border)] bg-bg-elevated flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--muted)]">
            Results · 0 rows · {result.duration}ms
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
          Query returned no rows
        </div>
      </div>
    );
  }

  const displayRows = result.rows.slice(0, MAX_DISPLAY_ROWS);
  const truncated = result.rows.length > MAX_DISPLAY_ROWS;

  const tableContent = (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead className="sticky top-0 bg-bg-elevated">
          <tr>
            <th className="px-2 py-1.5 text-left text-[var(--muted)] font-medium border-b border-[var(--border)] w-10">
              #
            </th>
            {result.columns.map((col) => (
              <th
                key={col}
                className="px-2 py-1.5 text-left text-[var(--muted)] font-medium border-b border-[var(--border)] whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="hover:bg-bg-card/50 transition-colors">
              <td className="px-2 py-1 text-[var(--muted)] opacity-50 border-b border-[var(--border)]/30">
                {i + 1}
              </td>
              {result.columns.map((col) => {
                const { text, className } = formatValue(row[col]);
                return (
                  <td
                    key={col}
                    className={`px-2 py-1 border-b border-[var(--border)]/30 whitespace-nowrap max-w-xs truncate ${className}`}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const chartContent = (
    <div className="h-full p-2">
      <ChartPanel columns={result.columns} rows={result.rows} />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-[var(--border)] bg-bg-elevated flex items-center gap-3">
        <div className="flex items-center gap-1 mr-2">
          {(['table', 'chart', 'split'] as const).map((mode) => {
            const disabled = !hasChart && mode !== 'table';
            return (
              <button
                key={mode}
                onClick={() => !disabled && setViewMode(mode)}
                disabled={disabled}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  effectiveView === mode
                    ? 'bg-accent/20 text-accent'
                    : disabled
                      ? 'text-[var(--muted)] opacity-30 cursor-not-allowed'
                      : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            );
          })}
        </div>
        {hasChart && (
          <span className="text-[10px] text-[var(--muted)] font-mono">
            Auto: {chartTypeLabel(detection.type)}
          </span>
        )}
        <span className="text-xs font-mono text-[var(--muted)] ml-auto">
          {result.rowCount} rows · {result.duration}ms
        </span>
        {truncated && (
          <span className="text-[10px] text-amber">
            Showing {MAX_DISPLAY_ROWS} of {result.rowCount} rows
          </span>
        )}
        <button
          onClick={handleCopyCSV}
          className="text-[10px] text-[var(--muted)] hover:text-white border border-[var(--border)] rounded px-2 py-0.5 transition-colors"
        >
          Copy CSV
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {effectiveView === 'table' && tableContent}
        {effectiveView === 'chart' && chartContent}
        {effectiveView === 'split' && (
          <div className="h-full flex">
            <div className="w-[55%] overflow-hidden">{tableContent}</div>
            <div className="w-[45%] border-l border-[var(--border)] overflow-hidden">{chartContent}</div>
          </div>
        )}
      </div>
    </div>
  );
}
