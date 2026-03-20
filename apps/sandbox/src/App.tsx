import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TemplateGallery } from './TemplateGallery';
import { SchemaPanel } from './SchemaPanel';
import { SQLEditor } from './SQLEditor';
import { ResultsPanel } from './ResultsPanel';
import { ExplainPanel } from './ExplainPanel';
import type { ExplainMode } from './ExplainPanel';
import { QuerySuggestions } from './QuerySuggestions';
import { QueryStats } from './QueryStats';
import { GradePanel } from './GradePanel';
import { QueryDiff } from './QueryDiff';
import { TransformationViewer } from './TransformationViewer';
import { gradeQuery } from './GradingEngine';
import type { GradingResult } from './GradingEngine';
import { ModeToggle } from './ModeToggle';
import type { AppMode } from './ModeToggle';
import { Timer, useTimer } from './Timer';
import { NLQueryPanel } from './NLQueryPanel';
import type { NLHistoryEntry } from './NLQueryPanel';
import { generateSQL } from './aiService';
import { getSQLForTemplate } from './datapacks';
import { initSandbox, runQuery, getSchemaInfo, resetSandbox } from './sandbox';
import { templates } from './templates';
import type { QueryResult, TableInfo } from './sandbox';
import type { Template, SuggestedQuery } from './templates';
import { parseSQL } from './sqlParser';
import type { QueryLineage } from './SchemaERD';

interface HistoryEntry {
  sql: string;
  rowCount: number;
  duration: number;
  timestamp: number;
}

export interface ChallengeScore {
  score: number;
  grade: string;
  attempts: number;
}

export interface AssessmentState {
  startTime: number;
  challengeScores: Map<string, ChallengeScore>;
  completed: boolean;
}

function generateShareURL(templateId: string, sql: string, mode: AppMode): string {
  const params = new URLSearchParams();
  params.set('template', templateId);
  params.set('sql', btoa(sql));
  if (mode === 'assessment') params.set('mode', 'assessment');
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
}

export default function App() {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [editorValue, setEditorValue] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [queryTime, setQueryTime] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [explainResult, setExplainResult] = useState<{ data: any; mode: ExplainMode; duration: number } | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<SuggestedQuery | null>(null);
  const [gradeResult, setGradeResult] = useState<GradingResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // NL→SQL state
  const [nlHistory, setNLHistory] = useState<NLHistoryEntry[]>([]);
  const [nlLoading, setNLLoading] = useState(false);
  const [nlQueryCount, setNlQueryCount] = useState(0);
  const [nlError, setNlError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<{ explanation: string; confidence: 'high' | 'medium' | 'low' } | null>(null);

  // Transformation viewer & lineage state
  const [showSteps, setShowSteps] = useState(false);
  const [lastRunSQL, setLastRunSQL] = useState('');

  // Mode & Assessment state
  const [mode, setMode] = useState<AppMode>('training');
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({
    startTime: 0,
    challengeScores: new Map(),
    completed: false,
  });
  const [attemptCount, setAttemptCount] = useState(0);
  const [showAssessmentSummary, setShowAssessmentSummary] = useState(false);

  // Timer
  const timer = useTimer();

  // Track whether URL has been processed
  const urlProcessed = useRef(false);

  // Compute query lineage for ERD highlighting
  const queryLineage = useMemo((): QueryLineage | null => {
    if (!lastRunSQL || !schema.length) return null;
    try {
      const parsed = parseSQL(lastRunSQL);
      if (parsed.tables.length === 0) return null;

      const schemaTableNames = new Set(schema.map((t) => t.name));
      const touchedTables = new Set<string>();
      const touchedColumns = new Map<string, Set<string>>();

      for (const ref of parsed.tables) {
        if (schemaTableNames.has(ref.name)) {
          touchedTables.add(ref.name);
        }
      }

      for (const col of parsed.columns) {
        if (col.column === '*') {
          // SELECT * touches all columns in all referenced tables
          for (const t of touchedTables) {
            const tableSchema = schema.find((s) => s.name === t);
            if (tableSchema) {
              touchedColumns.set(t, new Set(tableSchema.columns.map((c) => c.name)));
            }
          }
        } else if (col.table && schemaTableNames.has(col.table)) {
          const existing = touchedColumns.get(col.table) || new Set<string>();
          existing.add(col.column);
          touchedColumns.set(col.table, existing);
        } else if (!col.table) {
          // Try to find which table this column belongs to
          for (const t of touchedTables) {
            const tableSchema = schema.find((s) => s.name === t);
            if (tableSchema?.columns.some((c) => c.name === col.column)) {
              const existing = touchedColumns.get(t) || new Set<string>();
              existing.add(col.column);
              touchedColumns.set(t, existing);
            }
          }
        }
      }

      return { touchedTables, touchedColumns, joinPaths: parsed.joinPaths };
    } catch {
      return null;
    }
  }, [lastRunSQL, schema]);

  // Count checkable challenges for current template
  const checkableChallenges = activeTemplate?.suggestedQueries.filter((q) => q.checkable) ?? [];
  const totalCheckable = checkableChallenges.length;

  const handleSelectTemplate = useCallback(async (template: Template) => {
    setLoading(true);
    try {
      const sql = await getSQLForTemplate(template.id);
      await initSandbox(template.id, sql);
      const schemaInfo = await getSchemaInfo();
      setSchema(schemaInfo);
      setActiveTemplate(template);
      setResult(null);
      setExplainResult(null);
      setEditorValue('');
      setHistory([]);
      setQueryTime(null);
      setActiveChallenge(null);
      setGradeResult(null);
      setShowDiff(false);
      setAttemptCount(0);
      setShowAssessmentSummary(false);
      // Reset assessment state for new template
      setAssessmentState({
        startTime: 0,
        challengeScores: new Map(),
        completed: false,
      });
      timer.reset();
    } catch (e) {
      console.error('Failed to load template:', e);
    } finally {
      setLoading(false);
    }
  }, [timer]);

  const handleRunQuery = useCallback(async (sql: string) => {
    if (!sql.trim()) return;
    setExplainResult(null);
    setGradeResult(null);
    setShowDiff(false);
    setActiveChallenge(null);
    setShowSteps(false);
    const res = await runQuery(sql);
    setResult(res);
    setQueryTime(res.duration);
    setLastRunSQL(sql.trim());
    if (!res.error) {
      setHistory((prev) => [
        { sql: sql.trim(), rowCount: res.rowCount, duration: res.duration, timestamp: Date.now() },
        ...prev,
      ]);
    }
  }, []);

  const handleExplain = useCallback(async () => {
    if (!editorValue.trim()) return;
    setExplainResult(null);

    // Fallback 1: EXPLAIN (ANALYZE, FORMAT JSON)
    const res1 = await runQuery(`EXPLAIN (ANALYZE, FORMAT JSON) ${editorValue}`);
    if (!res1.error && res1.rows.length > 0) {
      try {
        const raw = res1.rows[0];
        const jsonVal = raw['QUERY PLAN'] ?? raw[Object.keys(raw)[0]];
        const parsed = typeof jsonVal === 'string' ? JSON.parse(jsonVal) : jsonVal;
        const plan = Array.isArray(parsed) ? parsed[0] : parsed;
        setExplainResult({ data: plan, mode: 'analyze', duration: res1.duration });
        setQueryTime(res1.duration);
        return;
      } catch { /* parse failed, try next fallback */ }
    }

    // Fallback 2: EXPLAIN (FORMAT JSON) — plan only, no actual stats
    const res2 = await runQuery(`EXPLAIN (FORMAT JSON) ${editorValue}`);
    if (!res2.error && res2.rows.length > 0) {
      try {
        const raw = res2.rows[0];
        const jsonVal = raw['QUERY PLAN'] ?? raw[Object.keys(raw)[0]];
        const parsed = typeof jsonVal === 'string' ? JSON.parse(jsonVal) : jsonVal;
        const plan = Array.isArray(parsed) ? parsed[0] : parsed;
        setExplainResult({ data: plan, mode: 'plan-only', duration: res2.duration });
        setQueryTime(res2.duration);
        return;
      } catch { /* parse failed, try next fallback */ }
    }

    // Fallback 3: EXPLAIN (text format)
    const res3 = await runQuery(`EXPLAIN ${editorValue}`);
    if (!res3.error && res3.rows.length > 0) {
      const textLines = res3.rows.map((r) => {
        const val = r['QUERY PLAN'] ?? r[Object.keys(r)[0]];
        return String(val);
      });
      setExplainResult({ data: textLines.join('\n'), mode: 'text', duration: res3.duration });
      setQueryTime(res3.duration);
      return;
    }

    // All fallbacks failed
    setResult({
      columns: [],
      rows: [],
      rowCount: 0,
      duration: res1.duration,
      error: 'Execution plans are not fully supported in the browser sandbox. For full EXPLAIN ANALYZE, use RealityDB CLI with a PostgreSQL database.',
    });
    setQueryTime(res1.duration);
  }, [editorValue]);

  const handleSuggestionClick = useCallback(
    (sql: string) => {
      setEditorValue(sql);
      handleRunQuery(sql);
    },
    [handleRunQuery]
  );

  const handleSelectChallenge = useCallback((query: SuggestedQuery) => {
    // In assessment mode, check if already submitted
    if (mode === 'assessment') {
      const existing = assessmentState.challengeScores.get(query.label);
      if (existing && existing.attempts >= 3) return; // locked
    }

    setActiveChallenge(query);
    setGradeResult(null);
    setShowDiff(false);
    setResult(null);
    setExplainResult(null);
    setShowAssessmentSummary(false);
    // Reset attempt count for this challenge
    const existing = assessmentState.challengeScores.get(query.label);
    setAttemptCount(existing?.attempts ?? 0);
    // Fill editor with challenge comment, not the answer
    const comment = `-- CHALLENGE: ${query.label.replace(/^Challenge:\s*/i, '')}\n-- Concept: ${query.concept}\n-- Write your query below:\n\n`;
    setEditorValue(comment);

    // Start timer in assessment mode
    if (mode === 'assessment' && !timer.running) {
      if (assessmentState.startTime === 0) {
        setAssessmentState((prev) => ({ ...prev, startTime: Date.now() }));
      }
      timer.start();
    }
  }, [mode, assessmentState, timer]);

  const handleCheckAnswer = useCallback(async () => {
    if (!activeChallenge || !editorValue.trim()) return;

    // In assessment mode, check attempt limits
    if (mode === 'assessment') {
      const existing = assessmentState.challengeScores.get(activeChallenge.label);
      if (existing && existing.attempts >= 3) return;
    }

    setGrading(true);
    setResult(null);
    setExplainResult(null);
    try {
      const result = await gradeQuery(
        editorValue,
        activeChallenge.sql,
        activeChallenge.requiredClauses,
        activeChallenge.checkOrder,
        activeChallenge.trapHint,
        activeChallenge.correctHint
      );
      setGradeResult(result);

      const newAttempts = attemptCount + 1;
      setAttemptCount(newAttempts);

      if (mode === 'assessment') {
        setAssessmentState((prev) => {
          const newScores = new Map(prev.challengeScores);
          const existing = newScores.get(activeChallenge.label);
          // In assessment, lock score after first submission (or update if retrying within limit)
          if (!existing || newAttempts <= 3) {
            newScores.set(activeChallenge.label, {
              score: result.score,
              grade: result.grade,
              attempts: newAttempts,
            });
          }
          // Check if all challenges are completed
          const allDone = checkableChallenges.every(
            (c) => newScores.has(c.label) && (newScores.get(c.label)!.attempts >= 3 || newScores.get(c.label)!.score >= 70)
          );
          return {
            ...prev,
            challengeScores: newScores,
            completed: allDone || newScores.size === totalCheckable,
          };
        });
      }
    } finally {
      setGrading(false);
    }
  }, [activeChallenge, editorValue, mode, assessmentState, attemptCount, checkableChallenges, totalCheckable]);

  // Check if assessment is complete and show summary
  useEffect(() => {
    if (mode === 'assessment' && assessmentState.completed && !showAssessmentSummary) {
      timer.pause();
      setShowAssessmentSummary(true);
    }
  }, [mode, assessmentState.completed, showAssessmentSummary, timer]);

  const handleTryAgain = useCallback(() => {
    setGradeResult(null);
    setShowDiff(false);
    // Keep the challenge active, just clear the grade
  }, []);

  const handleShowAnswer = useCallback(() => {
    if (!activeChallenge) return;
    setEditorValue(activeChallenge.sql);
    setGradeResult(null);
    setShowDiff(false);
    setActiveChallenge(null);
    handleRunQuery(activeChallenge.sql);
  }, [activeChallenge, handleRunQuery]);

  const handleNextChallenge = useCallback(() => {
    if (!activeChallenge) return;
    // Find the next unsubmitted challenge
    const currentIdx = checkableChallenges.findIndex((c) => c.label === activeChallenge.label);
    for (let i = 1; i <= checkableChallenges.length; i++) {
      const next = checkableChallenges[(currentIdx + i) % checkableChallenges.length];
      const existing = assessmentState.challengeScores.get(next.label);
      if (!existing || existing.attempts < 3) {
        handleSelectChallenge(next);
        return;
      }
    }
    // All done
    setActiveChallenge(null);
    setGradeResult(null);
  }, [activeChallenge, checkableChallenges, assessmentState, handleSelectChallenge]);

  const handleSteps = useCallback(() => {
    if (!editorValue.trim()) return;
    setShowSteps(true);
    setExplainResult(null);
    setGradeResult(null);
    setResult(null);
  }, [editorValue]);

  const handleTableClick = useCallback(
    (tableName: string) => {
      const sql = `SELECT * FROM ${tableName} LIMIT 100;`;
      setEditorValue(sql);
      handleRunQuery(sql);
    },
    [handleRunQuery]
  );

  const handleNLSubmit = useCallback(async (question: string) => {
    if (!activeTemplate || nlLoading) return;
    setNLLoading(true);
    setNlError(null);
    setAiInfo(null);
    try {
      const result = await generateSQL(question, schema, activeTemplate.name);
      setEditorValue(result.sql);
      setAiInfo({ explanation: result.explanation, confidence: result.confidence });
      setNlQueryCount(prev => prev + 1);
      setNLHistory(prev => [
        { question, sql: result.sql, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
      // Auto-run
      const res = await runQuery(result.sql);
      setResult(res);
      setQueryTime(res.duration);
      setLastRunSQL(result.sql.trim());
      setShowSteps(false);
      setExplainResult(null);
      setGradeResult(null);
      setActiveChallenge(null);
      if (!res.error) {
        setHistory(prev => [
          { sql: result.sql.trim(), rowCount: res.rowCount, duration: res.duration, timestamp: Date.now() },
          ...prev,
        ]);
      }
    } catch (e) {
      setNlError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setNLLoading(false);
    }
  }, [activeTemplate, schema, nlLoading]);

  const handleDismissAiInfo = useCallback(() => {
    setAiInfo(null);
  }, []);

  const handleReset = useCallback(async () => {
    await resetSandbox();
    setActiveTemplate(null);
    setSchema([]);
    setResult(null);
    setExplainResult(null);
    setEditorValue('');
    setHistory([]);
    setQueryTime(null);
    setActiveChallenge(null);
    setGradeResult(null);
    setShowDiff(false);
    setShowSteps(false);
    setLastRunSQL('');
    setMode('training');
    setAssessmentState({ startTime: 0, challengeScores: new Map(), completed: false });
    setAttemptCount(0);
    setShowAssessmentSummary(false);
    setNLHistory([]);
    setNLLoading(false);
    setNlQueryCount(0);
    setNlError(null);
    setAiInfo(null);
    timer.reset();
  }, [timer]);

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    // Reset assessment state when switching modes
    setAssessmentState({ startTime: 0, challengeScores: new Map(), completed: false });
    setAttemptCount(0);
    setShowAssessmentSummary(false);
    setGradeResult(null);
    setShowDiff(false);
    timer.reset();
  }, [timer]);

  const handleShare = useCallback(() => {
    if (!activeTemplate) return;
    const url = generateShareURL(activeTemplate.id, editorValue, mode);
    navigator.clipboard.writeText(url);
  }, [activeTemplate, editorValue, mode]);

  // URL decoding on load
  useEffect(() => {
    if (urlProcessed.current) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    urlProcessed.current = true;

    const params = new URLSearchParams(hash);
    const templateId = params.get('template');
    const sqlEncoded = params.get('sql');
    const urlMode = params.get('mode');

    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const decodedSql = sqlEncoded ? atob(sqlEncoded) : '';
        if (urlMode === 'assessment') setMode('assessment');

        (async () => {
          setLoading(true);
          try {
            const sql = await getSQLForTemplate(template.id);
            await initSandbox(template.id, sql);
            const schemaInfo = await getSchemaInfo();
            setSchema(schemaInfo);
            setActiveTemplate(template);
            if (decodedSql) {
              setEditorValue(decodedSql);
              // Auto-run the shared query
              const res = await runQuery(decodedSql);
              setResult(res);
              setQueryTime(res.duration);
              setLastRunSQL(decodedSql.trim());
              if (!res.error) {
                setHistory([{
                  sql: decodedSql.trim(),
                  rowCount: res.rowCount,
                  duration: res.duration,
                  timestamp: Date.now(),
                }]);
              }
            }
          } catch (e) {
            console.error('Failed to load shared query:', e);
          } finally {
            setLoading(false);
          }
        })();
      }
    }
  }, []);

  const totalRows = schema.reduce((sum, t) => sum + t.rowCount, 0);

  // Assessment summary calculation
  const assessmentScores = Array.from(assessmentState.challengeScores.values());
  const avgScore = assessmentScores.length > 0
    ? Math.round(assessmentScores.reduce((sum, s) => sum + s.score, 0) / assessmentScores.length)
    : 0;
  const elapsedTime = assessmentState.startTime > 0
    ? Math.floor((Date.now() - assessmentState.startTime) / 1000)
    : 0;

  if (!activeTemplate) {
    return (
      <div className="min-h-screen bg-bg">
        <Header onReset={handleReset} activeTemplate={null} templates={templates} onSelectTemplate={handleSelectTemplate} mode={mode} onModeChange={handleModeChange} timerRunning={false} timerComponent={null} />
        <TemplateGallery templates={templates} onSelect={handleSelectTemplate} loading={loading} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Header
        onReset={handleReset}
        activeTemplate={activeTemplate}
        templates={templates}
        onSelectTemplate={handleSelectTemplate}
        mode={mode}
        onModeChange={handleModeChange}
        timerRunning={mode === 'assessment' && timer.running}
        timerComponent={
          mode === 'assessment' && (timer.running || assessmentState.startTime > 0) ? (
            <Timer running={timer.running} onElapsed={timer.setElapsed} />
          ) : null
        }
      />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-[var(--muted)] text-sm">Loading database...</p>
          </div>
        </div>
      ) : showAssessmentSummary ? (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-bg-card border border-[#eab308]/30 rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold text-[#eab308] mb-1">Assessment Complete</h2>
              <p className="text-xs text-[var(--muted)] mb-4">All challenges have been submitted</p>
              <div className="flex items-center justify-center gap-6 mb-4">
                <div>
                  <span className="text-3xl font-mono font-bold text-white">{avgScore}</span>
                  <span className="text-sm text-[var(--muted)]">/100</span>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Average Score</p>
                </div>
                <div>
                  <span className="text-3xl font-mono font-bold text-white">
                    {String(Math.floor(elapsedTime / 60)).padStart(2, '0')}:{String(elapsedTime % 60).padStart(2, '0')}
                  </span>
                  <p className="text-[10px] text-[var(--muted)] mt-1">Time Taken</p>
                </div>
              </div>
            </div>
            <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider">
                Per-Challenge Results
              </h3>
              {checkableChallenges.map((challenge) => {
                const scoreData = assessmentState.challengeScores.get(challenge.label);
                return (
                  <div key={challenge.label} className="flex items-center justify-between py-2 border-b border-[var(--border)]/30 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{challenge.label}</p>
                      <p className="text-[10px] text-[var(--muted)]">{challenge.concept}</p>
                    </div>
                    {scoreData ? (
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-xs font-mono text-[var(--muted)]">{scoreData.score}/100</span>
                        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                          scoreData.grade === 'A' ? 'bg-green/10 text-green'
                            : scoreData.grade === 'B' ? 'bg-cyan-400/10 text-cyan-400'
                            : scoreData.grade === 'C' ? 'bg-amber/10 text-amber'
                            : 'bg-red-400/10 text-red-400'
                        }`}>
                          {scoreData.grade}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">Not attempted</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* After summary, show hints and Query Diff */}
            <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider">
                Hints &amp; Feedback
              </h3>
              {checkableChallenges.map((challenge) => (
                <div key={challenge.label} className="py-2 border-b border-[var(--border)]/30 last:border-0">
                  <p className="text-xs text-white font-medium mb-1">{challenge.label}</p>
                  {challenge.trapHint && (
                    <p className="text-[11px] text-amber mb-1">
                      <span className="font-semibold">Trap hint:</span> {challenge.trapHint}
                    </p>
                  )}
                  {challenge.correctHint && (
                    <p className="text-[11px] text-green">
                      <span className="font-semibold">Correct approach:</span> {challenge.correctHint}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAssessmentSummary(false);
                  setAssessmentState({ startTime: 0, challengeScores: new Map(), completed: false });
                  setAttemptCount(0);
                  timer.reset();
                }}
                className="px-4 py-2 bg-bg-card border border-[var(--border)] text-sm text-white rounded-lg hover:border-accent/40 transition-colors"
              >
                Retry Assessment
              </button>
              <button
                onClick={() => {
                  setShowAssessmentSummary(false);
                  handleModeChange('training');
                }}
                className="px-4 py-2 bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30 text-sm rounded-lg hover:bg-[#22c55e]/20 transition-colors"
              >
                Switch to Training Mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-64 border-r border-[var(--border)] overflow-hidden shrink-0">
            <SchemaPanel schema={schema} onTableClick={handleTableClick} lineage={queryLineage} />
          </div>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {mode === 'training' && (
              <NLQueryPanel
                templateId={activeTemplate.id}
                loading={nlLoading}
                queryCount={nlQueryCount}
                history={nlHistory}
                aiInfo={aiInfo}
                onSubmit={handleNLSubmit}
                onDismissInfo={handleDismissAiInfo}
              />
            )}
            {nlError && mode === 'training' && (
              <div className="px-3 py-1.5 bg-red-400/10 border-b border-red-400/20 text-xs text-red-400 flex items-center justify-between">
                <span>{nlError}</span>
                <button onClick={() => setNlError(null)} className="text-red-400/60 hover:text-red-400 ml-2">x</button>
              </div>
            )}
            <div className="h-[280px] shrink-0 border-b border-[var(--border)]">
              <SQLEditor
                value={editorValue}
                onChange={setEditorValue}
                onRun={handleRunQuery}
                onExplain={handleExplain}
                onSteps={handleSteps}
                onCheckAnswer={handleCheckAnswer}
                showCheckButton={!!activeChallenge}
                mode={mode}
                attemptCount={attemptCount}
                maxAttempts={3}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              {grading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full mx-auto mb-3" />
                    <p className="text-[var(--muted)] text-sm">Grading your query...</p>
                  </div>
                </div>
              ) : gradeResult ? (
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    <GradePanel
                      result={gradeResult}
                      onTryAgain={handleTryAgain}
                      onShowAnswer={handleShowAnswer}
                      onNextChallenge={handleNextChallenge}
                      onViewDiff={() => setShowDiff(true)}
                      mode={mode}
                      assessmentCompleted={assessmentState.completed}
                      hasMoreChallenges={
                        checkableChallenges.some((c) => {
                          const s = assessmentState.challengeScores.get(c.label);
                          return !s || s.attempts < 3;
                        })
                      }
                    />
                  </div>
                  {showDiff && gradeResult.studentResult && gradeResult.referenceResult && (
                    <QueryDiff
                      studentResult={gradeResult.studentResult}
                      referenceResult={gradeResult.referenceResult}
                      onClose={() => setShowDiff(false)}
                    />
                  )}
                </div>
              ) : showSteps ? (
                <TransformationViewer
                  sql={editorValue}
                  onClose={() => setShowSteps(false)}
                />
              ) : explainResult ? (
                <ExplainPanel
                  data={explainResult.data}
                  mode={explainResult.mode}
                  duration={explainResult.duration}
                  onBack={() => setExplainResult(null)}
                />
              ) : (
                <ResultsPanel result={result} schema={schema} onShare={handleShare} />
              )}
            </div>
          </div>
          <div className="w-full md:w-72 border-l border-[var(--border)] overflow-y-auto shrink-0">
            <QuerySuggestions
              queries={activeTemplate.suggestedQueries}
              history={history}
              onSelect={handleSuggestionClick}
              onSelectChallenge={handleSelectChallenge}
              mode={mode}
              challengeScores={assessmentState.challengeScores}
            />
            {history.length >= 2 && (
              <div className="px-3 pb-3">
                <QueryStats history={history} />
              </div>
            )}
          </div>
        </div>
      )}
      <footer className="h-8 border-t border-[var(--border)] bg-bg-elevated flex items-center px-4 text-xs text-[var(--muted)] gap-4 shrink-0">
        <span>{schema.length} tables</span>
        <span>{totalRows} rows</span>
        {queryTime !== null && <span>{queryTime}ms</span>}
        <span className="hidden sm:inline">PostgreSQL via PGLite (WASM)</span>
        <a
          href="https://realitydb.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hover:text-accent transition-colors"
        >
          realitydb.dev
        </a>
      </footer>
    </div>
  );
}

function Header({
  onReset,
  activeTemplate,
  templates: templateList,
  onSelectTemplate,
  mode,
  onModeChange,
  timerRunning: _timerRunning,
  timerComponent,
}: {
  onReset: () => void;
  activeTemplate: Template | null;
  templates: Template[];
  onSelectTemplate: (t: Template) => void;
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  timerRunning: boolean;
  timerComponent: React.ReactNode;
}) {
  return (
    <header className="h-12 border-b border-[var(--border)] bg-bg-elevated flex items-center px-4 gap-3 shrink-0">
      <a href="/" onClick={(e) => { e.preventDefault(); onReset(); }} className="flex items-center gap-1.5 font-sans font-bold text-base tracking-tight">
        <span className="text-green">Reality</span>
        <span className="text-accent">DB</span>
        <span className="text-[var(--muted)] font-normal text-sm ml-1">Sandbox</span>
      </a>
      {activeTemplate && (
        <>
          <select
            className="ml-4 bg-bg-card border border-[var(--border)] rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
            value={activeTemplate.id}
            onChange={(e) => {
              const t = templateList.find((t) => t.id === e.target.value);
              if (t) onSelectTemplate(t);
            }}
          >
            {templateList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
          </select>
          <ModeToggle mode={mode} onModeChange={onModeChange} />
          {timerComponent}
          <button
            onClick={onReset}
            className="ml-auto text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded px-2.5 py-1 transition-colors"
          >
            Reset
          </button>
        </>
      )}
      <div className={activeTemplate ? '' : 'ml-auto'} />
      <a
        href="https://github.com/emkwambe/databox"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-[var(--muted)] hover:text-white transition-colors"
      >
        GitHub
      </a>
    </header>
  );
}
