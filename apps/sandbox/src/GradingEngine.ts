import { runQuery } from './sandbox';

export interface GradingBreakdown {
  columns: { score: number; max: 25; feedback: string };
  rowCount: { score: number; max: 15; feedback: string };
  resultMatch: { score: number; max: 40; feedback: string };
  sortOrder: { score: number; max: 10; feedback: string };
  clauses: { score: number; max: 10; feedback: string };
}

export interface GradingResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: GradingBreakdown;
  overallFeedback: string;
  trapTriggered: boolean;
  studentResult?: { columns: string[]; rows: any[][] };
  referenceResult?: { columns: string[]; rows: any[][] };
}

const CLAUSE_PATTERNS: Record<string, RegExp> = {
  'JOIN': /\bJOIN\b/i,
  'LEFT JOIN': /\bLEFT\s+(OUTER\s+)?JOIN\b/i,
  'INNER JOIN': /\b(INNER\s+)?JOIN\b/i,
  'GROUP BY': /\bGROUP\s+BY\b/i,
  'HAVING': /\bHAVING\b/i,
  'ORDER BY': /\bORDER\s+BY\b/i,
  'IS NULL': /\bIS\s+NULL\b/i,
  'IS NOT NULL': /\bIS\s+NOT\s+NULL\b/i,
  'CASE': /\bCASE\b/i,
  'COALESCE': /\bCOALESCE\b/i,
  'generate_series': /\bgenerate_series\b/i,
  'CTE': /\bWITH\b/i,
  'WITH': /\bWITH\b/i,
  'DISTINCT': /\bDISTINCT\b/i,
  'SUBQUERY': /\(\s*SELECT\b/i,
};

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
}

function normalizeRow(row: Record<string, unknown>, cols: string[]): string {
  return cols.map((c) => normalizeValue(row[c])).join('|');
}

function computeGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function scoreColumns(
  studentCols: string[],
  refCols: string[]
): { score: number; max: 25; feedback: string } {
  const sNorm = studentCols.map((c) => c.toLowerCase());
  const rNorm = refCols.map((c) => c.toLowerCase());

  const sSet = new Set(sNorm);
  const rSet = new Set(rNorm);

  const missing = rNorm.filter((c) => !sSet.has(c));
  const extra = sNorm.filter((c) => !rSet.has(c));
  const matching = rNorm.filter((c) => sSet.has(c));

  if (matching.length === 0) {
    return { score: 0, max: 25, feedback: `No matching columns. Expected: ${refCols.join(', ')}` };
  }

  let score: number;
  const feedbackParts: string[] = [];

  if (missing.length === 0 && extra.length === 0) {
    // Check order
    const sameOrder = sNorm.length === rNorm.length && sNorm.every((c, i) => c === rNorm[i]);
    if (sameOrder) {
      score = 25;
      feedbackParts.push('All columns match perfectly.');
    } else {
      score = 20;
      feedbackParts.push('All columns present but in different order.');
    }
  } else {
    if (missing.length === 1) {
      score = 15;
    } else if (missing.length >= 2) {
      score = 10;
    } else {
      score = 25;
    }
    if (extra.length > 0) {
      score = Math.max(10, score - 3 * extra.length);
    }
    if (missing.length > 0) feedbackParts.push(`Missing columns: ${missing.join(', ')}`);
    if (extra.length > 0) feedbackParts.push(`Extra columns: ${extra.join(', ')} (not needed)`);
  }

  return { score, max: 25, feedback: feedbackParts.join(' ') || 'Columns look good.' };
}

function scoreRowCount(
  studentCount: number,
  refCount: number
): { score: number; max: 15; feedback: string } {
  if (refCount === 0 && studentCount === 0) {
    return { score: 15, max: 15, feedback: 'Both returned 0 rows.' };
  }
  if (refCount === 0) {
    return { score: 0, max: 15, feedback: `Expected 0 rows, got ${studentCount}.` };
  }

  const ratio = Math.abs(studentCount - refCount) / refCount;

  let score: number;
  if (studentCount === refCount) {
    score = 15;
  } else if (ratio <= 0.05) {
    score = 12;
  } else if (ratio <= 0.20) {
    score = 8;
  } else if (ratio <= 0.50) {
    score = 4;
  } else {
    score = 0;
  }

  const feedback =
    studentCount === refCount
      ? `Row count matches: ${refCount} rows.`
      : `Expected ${refCount} rows, got ${studentCount}. ${Math.abs(studentCount - refCount)} rows ${studentCount < refCount ? 'missing' : 'extra'}.`;

  return { score, max: 15, feedback };
}

function scoreResultMatch(
  studentRows: Record<string, unknown>[],
  refRows: Record<string, unknown>[],
  refCols: string[]
): { score: number; max: 40; feedback: string } {
  if (refRows.length === 0 && studentRows.length === 0) {
    return { score: 40, max: 40, feedback: 'Both returned empty result sets.' };
  }
  if (refRows.length === 0 || studentRows.length === 0) {
    return { score: 0, max: 40, feedback: refRows.length === 0 ? 'Reference returned no rows.' : 'Your query returned no rows.' };
  }

  // Normalize columns to lowercase for matching
  const colsLower = refCols.map((c) => c.toLowerCase());

  // Build normalized row sets (sorted for comparison)
  const refSet = new Map<string, number>();
  for (const row of refRows) {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase()] = row[key];
    }
    const key = normalizeRow(normalized, colsLower);
    refSet.set(key, (refSet.get(key) || 0) + 1);
  }

  let matchCount = 0;
  for (const row of studentRows) {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      normalized[key.toLowerCase()] = row[key];
    }
    const key = normalizeRow(normalized, colsLower);
    const remaining = refSet.get(key);
    if (remaining && remaining > 0) {
      matchCount++;
      refSet.set(key, remaining - 1);
    }
  }

  const matchRatio = matchCount / refRows.length;
  let score: number;
  if (matchRatio >= 1) score = 40;
  else if (matchRatio >= 0.9) score = 32;
  else if (matchRatio >= 0.7) score = 24;
  else if (matchRatio >= 0.5) score = 16;
  else if (matchRatio >= 0.2) score = 8;
  else score = 0;

  const feedback =
    matchCount === refRows.length
      ? `All ${refRows.length} rows match.`
      : `${matchCount} of ${refRows.length} rows match.${matchCount < refRows.length ? ' Check the rows that differ.' : ''}`;

  return { score, max: 40, feedback };
}

function scoreSortOrder(
  studentRows: Record<string, unknown>[],
  refRows: Record<string, unknown>[],
  refCols: string[],
  checkOrder: boolean
): { score: number; max: 10; feedback: string } {
  if (!checkOrder) {
    return { score: 10, max: 10, feedback: 'Sort order not graded for this challenge.' };
  }

  if (studentRows.length === 0 || refRows.length === 0) {
    return { score: 0, max: 10, feedback: 'Cannot check sort order with empty results.' };
  }

  const colsLower = refCols.map((c) => c.toLowerCase());
  const limit = Math.min(20, studentRows.length, refRows.length);
  let matchingPositions = 0;

  for (let i = 0; i < limit; i++) {
    const sNorm: Record<string, unknown> = {};
    for (const key of Object.keys(studentRows[i])) sNorm[key.toLowerCase()] = studentRows[i][key];
    const rNorm: Record<string, unknown> = {};
    for (const key of Object.keys(refRows[i])) rNorm[key.toLowerCase()] = refRows[i][key];

    if (normalizeRow(sNorm, colsLower) === normalizeRow(rNorm, colsLower)) {
      matchingPositions++;
    }
  }

  const ratio = matchingPositions / limit;
  let score: number;
  if (ratio >= 1) score = 10;
  else if (ratio >= 0.8) score = 7;
  else score = 3;

  const feedback =
    ratio >= 1
      ? 'Sort order matches perfectly.'
      : `${matchingPositions} of ${limit} rows in correct position. Check your ORDER BY clause.`;

  return { score, max: 10, feedback };
}

function scoreClauses(
  studentSql: string,
  requiredClauses?: string[]
): { score: number; max: 10; feedback: string } {
  if (!requiredClauses || requiredClauses.length === 0) {
    return { score: 10, max: 10, feedback: 'No specific clauses required.' };
  }

  const pointsPerClause = 10 / requiredClauses.length;
  let totalScore = 0;
  const missing: string[] = [];

  for (const clause of requiredClauses) {
    const pattern = CLAUSE_PATTERNS[clause];
    if (pattern && pattern.test(studentSql)) {
      totalScore += pointsPerClause;
    } else if (!pattern) {
      // Unknown clause, check literal
      if (new RegExp(`\\b${clause.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(studentSql)) {
        totalScore += pointsPerClause;
      } else {
        missing.push(clause);
      }
    } else {
      missing.push(clause);
    }
  }

  const score = Math.round(totalScore);
  const feedback =
    missing.length === 0
      ? 'All required SQL clauses present.'
      : `Missing required clause${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`;

  return { score, max: 10, feedback };
}

export async function gradeQuery(
  studentSql: string,
  referenceSql: string,
  requiredClauses?: string[],
  checkOrder?: boolean,
  trapHint?: string,
  correctHint?: string
): Promise<GradingResult> {
  // Execute student query
  const studentResult = await runQuery(studentSql);
  if (studentResult.error) {
    return {
      score: 0,
      grade: 'F',
      breakdown: {
        columns: { score: 0, max: 25, feedback: 'Query failed to execute.' },
        rowCount: { score: 0, max: 15, feedback: 'Query failed to execute.' },
        resultMatch: { score: 0, max: 40, feedback: `Error: ${studentResult.error}` },
        sortOrder: { score: 0, max: 10, feedback: 'Query failed to execute.' },
        clauses: scoreClauses(studentSql, requiredClauses),
      },
      overallFeedback: `Your query produced an error: ${studentResult.error}`,
      trapTriggered: false,
    };
  }

  // Execute reference query
  const refResult = await runQuery(referenceSql);
  if (refResult.error) {
    return {
      score: 0,
      grade: 'F',
      breakdown: {
        columns: { score: 0, max: 25, feedback: 'Reference query error (internal).' },
        rowCount: { score: 0, max: 15, feedback: 'Reference query error (internal).' },
        resultMatch: { score: 0, max: 40, feedback: `Internal error: ${refResult.error}` },
        sortOrder: { score: 0, max: 10, feedback: 'Reference query error (internal).' },
        clauses: { score: 0, max: 10, feedback: 'Cannot grade.' },
      },
      overallFeedback: 'An internal error occurred grading this challenge. Please try again.',
      trapTriggered: false,
    };
  }

  // Grade each dimension
  const columns = scoreColumns(studentResult.columns, refResult.columns);
  const rowCount = scoreRowCount(studentResult.rowCount, refResult.rowCount);
  const resultMatch = scoreResultMatch(studentResult.rows, refResult.rows, refResult.columns);
  const sortOrder = scoreSortOrder(studentResult.rows, refResult.rows, refResult.columns, checkOrder ?? false);
  const clauses = scoreClauses(studentSql, requiredClauses);

  const score = columns.score + rowCount.score + resultMatch.score + sortOrder.score + clauses.score;
  const grade = computeGrade(score);

  // Determine trap detection and feedback
  let trapTriggered = false;
  let overallFeedback: string;

  if (score >= 90 && correctHint) {
    overallFeedback = correctHint;
  } else if (score < 70 && trapHint) {
    trapTriggered = true;
    overallFeedback = trapHint;
  } else {
    // Generic feedback based on breakdown
    const weakest = [
      { name: 'columns', pct: columns.score / 25 },
      { name: 'row count', pct: rowCount.score / 15 },
      { name: 'result matching', pct: resultMatch.score / 40 },
      { name: 'sort order', pct: sortOrder.score / 10 },
      { name: 'SQL clauses', pct: clauses.score / 10 },
    ].sort((a, b) => a.pct - b.pct);

    if (score >= 90) {
      overallFeedback = 'Great job! Your query is nearly perfect.';
    } else if (score >= 70) {
      overallFeedback = `Good effort! Focus on improving: ${weakest[0].name} and ${weakest[1].name}.`;
    } else {
      overallFeedback = `Review your approach. Weakest areas: ${weakest[0].name} and ${weakest[1].name}.`;
    }
  }

  // Convert rows to array format for QueryDiff
  const studentRowsArray = studentResult.rows.map((row) =>
    studentResult.columns.map((col) => row[col])
  );
  const refRowsArray = refResult.rows.map((row) =>
    refResult.columns.map((col) => row[col])
  );

  return {
    score,
    grade,
    breakdown: { columns, rowCount, resultMatch, sortOrder, clauses },
    overallFeedback,
    trapTriggered,
    studentResult: { columns: studentResult.columns, rows: studentRowsArray },
    referenceResult: { columns: refResult.columns, rows: refRowsArray },
  };
}
