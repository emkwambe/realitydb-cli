import { useRef, useCallback, useMemo, type JSX } from 'react';

export interface QueryDiffProps {
  studentResult: { columns: string[]; rows: any[][] };
  referenceResult: { columns: string[]; rows: any[][] };
  onClose: () => void;
}

type RowStatus = 'matched' | 'missing' | 'extra' | 'different';

interface DiffRow {
  status: RowStatus;
  studentValues?: string[];
  referenceValues?: string[];
  differingCells?: number[]; // indices of cells that differ
}

interface ColumnDiff {
  both: string[];
  missingFromStudent: string[];
  extraInStudent: string[];
}

const MAX_SHOWN = 50;
const MATCHED_COLLAPSE_THRESHOLD = 20;

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function rowToKey(row: any[], columns: string[]): string {
  return columns.map((_, i) => normalizeValue(row[i])).join('|||');
}

function computeColumnDiff(studentCols: string[], refCols: string[]): ColumnDiff {
  const sSet = new Set(studentCols.map(c => c.toLowerCase()));
  const rSet = new Set(refCols.map(c => c.toLowerCase()));
  return {
    both: refCols.filter(c => sSet.has(c.toLowerCase())),
    missingFromStudent: refCols.filter(c => !sSet.has(c.toLowerCase())),
    extraInStudent: studentCols.filter(c => !rSet.has(c.toLowerCase())),
  };
}

function computeRowDiff(
  studentRows: any[][],
  refRows: any[][],
  studentCols: string[],
  refCols: string[],
): DiffRow[] {
  const columnsMatch = studentCols.length === refCols.length &&
    studentCols.every((c, i) => c.toLowerCase() === refCols[i].toLowerCase());

  if (!columnsMatch) {
    // When columns differ, find common columns and compare on those
    const commonCols = refCols.filter(c =>
      studentCols.some(sc => sc.toLowerCase() === c.toLowerCase())
    );

    if (commonCols.length === 0) {
      // No common columns - all rows are "different"
      const rows: DiffRow[] = [];
      for (const row of refRows) {
        rows.push({ status: 'missing', referenceValues: row.map(v => normalizeValue(v)) });
      }
      for (const row of studentRows) {
        rows.push({ status: 'extra', studentValues: row.map(v => normalizeValue(v)) });
      }
      return rows;
    }

    // Map common column indices
    const refIndices = commonCols.map(c => refCols.findIndex(rc => rc.toLowerCase() === c.toLowerCase()));
    const studentIndices = commonCols.map(c => studentCols.findIndex(sc => sc.toLowerCase() === c.toLowerCase()));

    const refKeyMap = new Map<string, number[]>();
    refRows.forEach((row, idx) => {
      const key = refIndices.map(i => normalizeValue(row[i])).join('|||');
      const arr = refKeyMap.get(key) || [];
      arr.push(idx);
      refKeyMap.set(key, arr);
    });

    const matchedRefIndices = new Set<number>();
    const matchedStudentIndices = new Set<number>();
    const rows: DiffRow[] = [];

    studentRows.forEach((sRow, sIdx) => {
      const key = studentIndices.map(i => normalizeValue(sRow[i])).join('|||');
      const refIdxArr = refKeyMap.get(key);
      if (refIdxArr && refIdxArr.length > 0) {
        const rIdx = refIdxArr.shift()!;
        matchedRefIndices.add(rIdx);
        matchedStudentIndices.add(sIdx);
        rows.push({
          status: 'matched',
          studentValues: sRow.map(v => normalizeValue(v)),
          referenceValues: refRows[rIdx].map(v => normalizeValue(v)),
        });
      }
    });

    refRows.forEach((row, idx) => {
      if (!matchedRefIndices.has(idx)) {
        rows.push({ status: 'missing', referenceValues: row.map(v => normalizeValue(v)) });
      }
    });

    studentRows.forEach((row, idx) => {
      if (!matchedStudentIndices.has(idx)) {
        rows.push({ status: 'extra', studentValues: row.map(v => normalizeValue(v)) });
      }
    });

    return rows;
  }

  // Columns match - full row comparison
  const refKeyMap = new Map<string, number[]>();
  refRows.forEach((row, idx) => {
    const key = rowToKey(row, refCols);
    const arr = refKeyMap.get(key) || [];
    arr.push(idx);
    refKeyMap.set(key, arr);
  });

  const matchedRefIndices = new Set<number>();
  const matchedStudentIndices = new Set<number>();
  const rows: DiffRow[] = [];

  // First pass: exact matches
  studentRows.forEach((sRow, sIdx) => {
    const key = rowToKey(sRow, studentCols);
    const refIdxArr = refKeyMap.get(key);
    if (refIdxArr && refIdxArr.length > 0) {
      const rIdx = refIdxArr.shift()!;
      matchedRefIndices.add(rIdx);
      matchedStudentIndices.add(sIdx);
      rows.push({
        status: 'matched',
        studentValues: sRow.map(v => normalizeValue(v)),
        referenceValues: refRows[rIdx].map(v => normalizeValue(v)),
      });
    }
  });

  // Unmatched reference rows = missing
  refRows.forEach((row, idx) => {
    if (!matchedRefIndices.has(idx)) {
      rows.push({ status: 'missing', referenceValues: row.map(v => normalizeValue(v)) });
    }
  });

  // Unmatched student rows = extra
  studentRows.forEach((row, idx) => {
    if (!matchedStudentIndices.has(idx)) {
      rows.push({ status: 'extra', studentValues: row.map(v => normalizeValue(v)) });
    }
  });

  return rows;
}

function generateDiffSummary(matched: number, missing: number, extra: number, different: number): string {
  if (missing > 0 && extra === 0 && different === 0) {
    return `${missing} rows from the correct answer are missing from your result. This often happens when using INNER JOIN instead of LEFT JOIN, or when a WHERE clause is too restrictive.`;
  }
  if (extra > 0 && missing === 0 && different === 0) {
    return `Your result has ${extra} extra rows not in the correct answer. You may need a more specific WHERE clause or different JOIN type.`;
  }
  if (different > 0) {
    return `${different} rows have different values. Check your aggregation functions (SUM vs COUNT, AVG precision) or column calculations.`;
  }
  if (missing > 0 && extra > 0) {
    return `${missing} rows are missing and ${extra} are extra. Your query may be joining or grouping differently than expected.`;
  }
  if (matched > 0 && missing === 0 && extra === 0 && different === 0) {
    return `Perfect match! All ${matched} rows are identical.`;
  }
  return `${matched} rows match, ${missing} missing, ${extra} extra, ${different} different.`;
}

export function QueryDiff({ studentResult, referenceResult, onClose }: QueryDiffProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((source: 'left' | 'right') => {
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
    }
  }, []);

  const columnDiff = useMemo(
    () => computeColumnDiff(studentResult.columns, referenceResult.columns),
    [studentResult.columns, referenceResult.columns]
  );

  const hasColumnMismatch = columnDiff.missingFromStudent.length > 0 || columnDiff.extraInStudent.length > 0;

  const diffRows = useMemo(
    () => computeRowDiff(studentResult.rows, referenceResult.rows, studentResult.columns, referenceResult.columns),
    [studentResult, referenceResult]
  );

  const matched = diffRows.filter(r => r.status === 'matched');
  const missing = diffRows.filter(r => r.status === 'missing');
  const extra = diffRows.filter(r => r.status === 'extra');
  const different = diffRows.filter(r => r.status === 'different');

  const summary = generateDiffSummary(matched.length, missing.length, extra.length, different.length);

  const matchedCollapsed = matched.length > MATCHED_COLLAPSE_THRESHOLD;
  const shownMissing = missing.slice(0, MAX_SHOWN);
  const shownExtra = extra.slice(0, MAX_SHOWN);
  const shownDifferent = different.slice(0, MAX_SHOWN);

  const statusBg = (status: RowStatus) => {
    switch (status) {
      case 'matched': return '';
      case 'missing': return 'bg-[#2a1515]';
      case 'extra': return 'bg-[#2a2515]';
      case 'different': return 'bg-[#15202a]';
    }
  };

  const statusIcon = (status: RowStatus) => {
    switch (status) {
      case 'matched': return '\u2705';
      case 'missing': return '\uD83D\uDD34';
      case 'extra': return '\uD83D\uDFE1';
      case 'different': return '\uD83D\uDD35';
    }
  };

  const renderRow = (row: DiffRow, idx: number, side: 'left' | 'right') => {
    const values = side === 'left' ? row.studentValues : row.referenceValues;
    if (!values) {
      // Empty row on this side
      return (
        <tr key={`${side}-${row.status}-${idx}`} className={statusBg(row.status)}>
          <td
            colSpan={(side === 'left' ? studentResult.columns.length : referenceResult.columns.length) + 1}
            className="px-2 py-1 text-[var(--muted)] text-xs font-mono opacity-40 border-b border-[var(--border)]/20"
          >
            &mdash;
          </td>
        </tr>
      );
    }
    return (
      <tr key={`${side}-${row.status}-${idx}`} className={statusBg(row.status)}>
        <td className="px-1 py-1 text-[10px] text-center border-b border-[var(--border)]/20 w-6">
          {statusIcon(row.status)}
        </td>
        {values.map((val, ci) => (
          <td
            key={ci}
            className={`px-2 py-1 text-xs font-mono whitespace-nowrap border-b border-[var(--border)]/20 max-w-[200px] truncate text-gray-400 ${
              row.differingCells?.includes(ci) ? 'border border-blue-500/50 bg-blue-500/10' : ''
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {val}
          </td>
        ))}
      </tr>
    );
  };

  // Build display rows: matched (collapsed) -> missing -> extra -> different
  const buildDisplayRows = (side: 'left' | 'right') => {
    const rows: JSX.Element[] = [];

    // Matched rows
    if (matched.length > 0) {
      if (matchedCollapsed) {
        // Show first 3, then collapse message
        matched.slice(0, 3).forEach((r, i) => rows.push(renderRow(r, i, side)));
        rows.push(
          <tr key={`${side}-matched-collapse`} className="bg-bg-elevated/50">
            <td
              colSpan={100}
              className="px-2 py-2 text-[11px] text-center text-[var(--muted)] font-mono border-b border-[var(--border)]/20"
            >
              \u2705 {matched.length} matched rows (collapsed)
            </td>
          </tr>
        );
      } else {
        matched.forEach((r, i) => rows.push(renderRow(r, i, side)));
      }
    }

    // Missing rows
    if (missing.length > 0) {
      shownMissing.forEach((r, i) => rows.push(renderRow(r, i + matched.length, side)));
      if (missing.length > MAX_SHOWN) {
        rows.push(
          <tr key={`${side}-missing-more`} className="bg-[#2a1515]">
            <td colSpan={100} className="px-2 py-2 text-[11px] text-center text-red-400 font-mono border-b border-[var(--border)]/20">
              ... {missing.length - MAX_SHOWN} more missing
            </td>
          </tr>
        );
      }
    }

    // Extra rows
    if (extra.length > 0) {
      shownExtra.forEach((r, i) => rows.push(renderRow(r, i + matched.length + missing.length, side)));
      if (extra.length > MAX_SHOWN) {
        rows.push(
          <tr key={`${side}-extra-more`} className="bg-[#2a2515]">
            <td colSpan={100} className="px-2 py-2 text-[11px] text-center text-amber font-mono border-b border-[var(--border)]/20">
              ... {extra.length - MAX_SHOWN} more extra
            </td>
          </tr>
        );
      }
    }

    // Different rows
    if (different.length > 0) {
      shownDifferent.forEach((r, i) => rows.push(renderRow(r, i + matched.length + missing.length + extra.length, side)));
      if (different.length > MAX_SHOWN) {
        rows.push(
          <tr key={`${side}-diff-more`} className="bg-[#15202a]">
            <td colSpan={100} className="px-2 py-2 text-[11px] text-center text-blue-400 font-mono border-b border-[var(--border)]/20">
              ... {different.length - MAX_SHOWN} more different
            </td>
          </tr>
        );
      }
    }

    return rows;
  };

  return (
    <div className="border-t border-[var(--border)] bg-bg flex flex-col" style={{ maxHeight: '400px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider">
          Query Diff
        </span>
        <button
          onClick={onClose}
          className="text-[var(--muted)] hover:text-white text-xs px-2 py-0.5 border border-[var(--border)] rounded transition-colors"
        >
          Close
        </button>
      </div>

      {/* Column diff (if mismatch) */}
      {hasColumnMismatch && (
        <div className="px-3 py-2 bg-bg-card border-b border-[var(--border)] shrink-0">
          <p className="text-[11px] font-mono font-semibold text-[var(--muted)] mb-1">Column Comparison:</p>
          {columnDiff.both.length > 0 && (
            <p className="text-[11px] text-gray-400">
              <span className="mr-1">{'\u2705'}</span> Both have: {columnDiff.both.join(', ')}
            </p>
          )}
          {columnDiff.missingFromStudent.length > 0 && (
            <p className="text-[11px] text-red-400">
              <span className="mr-1">{'\uD83D\uDD34'}</span> Missing from yours: {columnDiff.missingFromStudent.join(', ')}
            </p>
          )}
          {columnDiff.extraInStudent.length > 0 && (
            <p className="text-[11px] text-amber">
              <span className="mr-1">{'\uD83D\uDFE1'}</span> Extra in yours: {columnDiff.extraInStudent.join(', ')} (not needed)
            </p>
          )}
        </div>
      )}

      {/* Side by side panels */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Student */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-[var(--border)]">
          <div className="px-2 py-1.5 bg-bg-elevated border-b border-[var(--border)] shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[var(--muted)]">
              YOUR QUERY ({studentResult.rows.length} rows)
            </span>
          </div>
          <div
            ref={leftRef}
            className="flex-1 overflow-auto"
            onScroll={() => handleScroll('left')}
          >
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-bg-elevated z-10">
                <tr>
                  <th className="px-1 py-1 text-[10px] text-[var(--muted)] border-b border-[var(--border)] w-6" />
                  {studentResult.columns.map((col) => (
                    <th
                      key={col}
                      className="px-2 py-1 text-left text-[10px] text-[var(--muted)] font-medium border-b border-[var(--border)] whitespace-nowrap"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{buildDisplayRows('left')}</tbody>
            </table>
          </div>
        </div>

        {/* Right: Reference */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-2 py-1.5 bg-bg-elevated border-b border-[var(--border)] shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[var(--muted)]">
              CORRECT QUERY ({referenceResult.rows.length} rows)
            </span>
          </div>
          <div
            ref={rightRef}
            className="flex-1 overflow-auto"
            onScroll={() => handleScroll('right')}
          >
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-bg-elevated z-10">
                <tr>
                  <th className="px-1 py-1 text-[10px] text-[var(--muted)] border-b border-[var(--border)] w-6" />
                  {referenceResult.columns.map((col) => (
                    <th
                      key={col}
                      className="px-2 py-1 text-left text-[10px] text-[var(--muted)] font-medium border-b border-[var(--border)] whitespace-nowrap"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{buildDisplayRows('right')}</tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-3 py-2.5 bg-bg-card border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4 mb-1.5 text-[11px] font-mono">
          <span className="text-green">{'\u2705'} {matched.length} matched</span>
          <span className="text-red-400">{'\uD83D\uDD34'} {missing.length} missing</span>
          <span className="text-amber">{'\uD83D\uDFE1'} {extra.length} extra</span>
          {different.length > 0 && (
            <span className="text-blue-400">{'\uD83D\uDD35'} {different.length} different</span>
          )}
        </div>
        <p className="text-[11px] text-[var(--muted)]">
          {'\uD83D\uDCA1'} {summary}
        </p>
      </div>
    </div>
  );
}
