import { useCallback } from 'react';
import type { QueryResult } from './sandbox';

interface Props {
  result: QueryResult | null;
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

export function ResultsPanel({ result }: Props) {
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-[var(--border)] bg-bg-elevated flex items-center gap-3">
        <span className="text-xs font-mono text-[var(--muted)]">
          Results · {result.rowCount} rows · {result.duration}ms
        </span>
        {truncated && (
          <span className="text-[10px] text-amber">
            Showing {MAX_DISPLAY_ROWS} of {result.rowCount} rows
          </span>
        )}
        <button
          onClick={handleCopyCSV}
          className="ml-auto text-[10px] text-[var(--muted)] hover:text-white border border-[var(--border)] rounded px-2 py-0.5 transition-colors"
        >
          Copy CSV
        </button>
      </div>
      <div className="flex-1 overflow-auto">
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
    </div>
  );
}
