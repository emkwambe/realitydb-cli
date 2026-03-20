import { useState } from 'react';
import type { GradingResult } from './GradingEngine';
import type { AppMode } from './ModeToggle';

interface Props {
  result: GradingResult;
  onTryAgain: () => void;
  onShowAnswer: () => void;
  onNextChallenge?: () => void;
  mode?: AppMode;
  assessmentCompleted?: boolean;
  hasMoreChallenges?: boolean;
}

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 90) return 'bg-green';
  if (pct >= 50) return 'bg-amber';
  return 'bg-red-400';
}

function overallColor(score: number): string {
  if (score >= 90) return 'text-green';
  if (score >= 70) return 'text-cyan-400';
  if (score >= 50) return 'text-amber';
  return 'text-red-400';
}

function overallBarColor(score: number): string {
  if (score >= 90) return 'bg-green';
  if (score >= 70) return 'bg-cyan-400';
  if (score >= 50) return 'bg-amber';
  return 'bg-red-400';
}

function ProgressBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  return (
    <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function GradePanel({ result, onTryAgain, onShowAnswer, onNextChallenge, mode = 'training', assessmentCompleted = false, hasMoreChallenges = false }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);
  const { score, grade, breakdown, overallFeedback, trapTriggered } = result;

  const isAssessment = mode === 'assessment';
  // In assessment mode, show trapHint only after assessment is fully completed
  const showTrapFeedback = trapTriggered && (!isAssessment || assessmentCompleted);
  const showCorrectFeedback = !trapTriggered && score >= 90 && (!isAssessment || assessmentCompleted);
  const showGenericFeedback = !trapTriggered && score < 90 && (!isAssessment || assessmentCompleted);

  const dimensions = [
    { label: 'Columns', ...breakdown.columns },
    { label: 'Row Count', ...breakdown.rowCount },
    { label: 'Results', ...breakdown.resultMatch },
    { label: 'Sort Order', ...breakdown.sortOrder },
    { label: 'SQL Clauses', ...breakdown.clauses },
  ];

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Overall Score */}
        <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--muted)]">Score:</span>
              <span className={`text-2xl font-mono font-bold ${overallColor(score)}`}>
                {score}/100
              </span>
              <span
                className={`text-lg font-mono font-bold px-2 py-0.5 rounded ${
                  grade === 'A'
                    ? 'bg-green/10 text-green'
                    : grade === 'B'
                      ? 'bg-cyan-400/10 text-cyan-400'
                      : grade === 'C'
                        ? 'bg-amber/10 text-amber'
                        : 'bg-red-400/10 text-red-400'
                }`}
              >
                {grade}
              </span>
              {isAssessment && !assessmentCompleted && (
                <span className="text-[10px] text-[#eab308] bg-[#eab308]/10 px-1.5 py-0.5 rounded">
                  Score locked
                </span>
              )}
            </div>
          </div>
          <ProgressBar score={score} max={100} color={overallBarColor(score)} />
        </div>

        {/* Breakdown */}
        <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider">
            Breakdown
          </h3>
          {dimensions.map((dim) => (
            <div key={dim.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{dim.label}</span>
                <span className="text-xs font-mono text-[var(--muted)]">
                  {dim.score}/{dim.max}
                </span>
              </div>
              <ProgressBar score={dim.score} max={dim.max} color={scoreColor(dim.score, dim.max)} />
              {(!isAssessment || assessmentCompleted) && dim.feedback && (
                <p className="text-[11px] text-[var(--muted)] mt-1">{dim.feedback}</p>
              )}
            </div>
          ))}
        </div>

        {/* Trap / Correct Feedback */}
        {showTrapFeedback && (
          <div className="bg-amber/5 border border-amber/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">&#x1FAA4;</span>
              <span className="text-sm font-semibold text-amber">Trap Detected!</span>
            </div>
            <p className="text-sm text-gray-300">{overallFeedback}</p>
          </div>
        )}

        {showCorrectFeedback && (
          <div className="bg-green/5 border border-green/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">&#x2705;</span>
              <span className="text-sm font-semibold text-green">Excellent!</span>
            </div>
            <p className="text-sm text-gray-300">{overallFeedback}</p>
          </div>
        )}

        {showGenericFeedback && (
          <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4">
            <p className="text-sm text-gray-300">{overallFeedback}</p>
          </div>
        )}

        {/* Assessment mode: no hints shown yet message */}
        {isAssessment && !assessmentCompleted && (
          <div className="bg-[#eab308]/5 border border-[#eab308]/20 rounded-lg p-3">
            <p className="text-[11px] text-[#eab308]">
              Hints and detailed feedback will be available after all challenges are submitted.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isAssessment ? (
            <>
              {hasMoreChallenges && onNextChallenge && (
                <button
                  onClick={onNextChallenge}
                  className="px-4 py-2 bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30 text-sm rounded-lg hover:bg-[#eab308]/20 transition-colors font-medium"
                >
                  Next Challenge
                </button>
              )}
              {assessmentCompleted && (
                <button
                  onClick={() => {
                    if (showAnswer) {
                      onShowAnswer();
                    }
                    setShowAnswer(true);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    showAnswer
                      ? 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'
                      : 'bg-bg-card border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-accent/40'
                  }`}
                >
                  {showAnswer ? 'Run Correct Answer' : 'Show Correct Answer'}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onTryAgain}
                className="px-4 py-2 bg-bg-card border border-[var(--border)] text-sm text-white rounded-lg hover:border-accent/40 transition-colors"
              >
                Try Again
              </button>
              {score < 70 && (
                <button
                  onClick={() => {
                    if (showAnswer) {
                      onShowAnswer();
                    }
                    setShowAnswer(true);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    showAnswer
                      ? 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'
                      : 'bg-bg-card border border-[var(--border)] text-[var(--muted)] hover:text-white hover:border-accent/40'
                  }`}
                >
                  {showAnswer ? 'Run Correct Answer' : 'Show Correct Answer'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Correct Answer Preview */}
        {showAnswer && !result.trapTriggered && (
          <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4">
            <h3 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              Reference Answer
            </h3>
            <p className="text-[11px] text-[var(--muted)] mb-2">
              Click "Run Correct Answer" above to load and execute this query.
            </p>
          </div>
        )}

        {showAnswer && result.trapTriggered && (
          <div className="bg-bg-card border border-[var(--border)] rounded-lg p-4">
            <h3 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              Reference Answer
            </h3>
            <p className="text-[11px] text-[var(--muted)] mb-2">
              Click "Run Correct Answer" above to load and execute the correct query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
