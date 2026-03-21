import { useState, useEffect, useCallback } from 'react';
import { getRoomDashboard, closeRoom } from './ClassroomService';
import type { RoomDashboard } from './ClassroomService';
import { templates } from './templates';

interface Props {
  roomId: string;
  professorSecret: string;
  onBack: () => void;
  onClosed: () => void;
}

type SortKey = 'name' | 'total' | number;
type SortDir = 'asc' | 'desc';

function letterGrade(avg: number): string {
  if (avg >= 93) return 'A';
  if (avg >= 90) return 'A-';
  if (avg >= 87) return 'B+';
  if (avg >= 83) return 'B';
  if (avg >= 80) return 'B-';
  if (avg >= 77) return 'C+';
  if (avg >= 73) return 'C';
  if (avg >= 70) return 'C-';
  if (avg >= 67) return 'D+';
  if (avg >= 60) return 'D';
  return 'F';
}

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBgClass(score: number): string {
  if (score >= 80) return 'bg-green-400/10';
  if (score >= 60) return 'bg-amber-400/10';
  return 'bg-red-400/10';
}

export function ProfessorDashboard({ roomId, professorSecret, onBack, onClosed }: Props) {
  const [dashboard, setDashboard] = useState<RoomDashboard | null>(null);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await getRoomDashboard(roomId, professorSecret);
      setDashboard(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    }
  }, [roomId, professorSecret]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const handleExportCSV = () => {
    if (!dashboard) return;
    const { room, students } = dashboard;
    const template = templates.find(t => t.id === room.templateId);
    const challengeIndices = room.challenges;
    const challengeLabels = challengeIndices.map(i =>
      template?.suggestedQueries[i]?.label || `Challenge ${i}`
    );

    const headers = ['Student', ...challengeLabels, 'Total', 'Grade'];
    const rows = students.map(s => {
      let total = 0;
      let count = 0;
      const scores = challengeIndices.map(ci => {
        const key = String(ci);
        const sc = s.scores[key];
        if (sc) {
          total += sc.score;
          count++;
          return String(sc.score);
        }
        return '--';
      });
      const avg = count > 0 ? Math.round(total / count) : 0;
      return [s.studentName, ...scores, count > 0 ? String(total) : '--', count > 0 ? letterGrade(avg) : '--'];
    });

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${room.name.replace(/[^a-zA-Z0-9]/g, '_')}_scores.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseRoom = async () => {
    try {
      await closeRoom(roomId, professorSecret);
      onClosed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close room');
    }
  };

  if (error && !dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={onBack} className="text-xs text-accent hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { room, students } = dashboard;
  const template = templates.find(t => t.id === room.templateId);
  const challengeIndices = room.challenges;
  const challengeLabels = challengeIndices.map(i =>
    template?.suggestedQueries[i]?.label?.replace(/^Challenge:\s*/i, '') || `Challenge ${i}`
  );

  // Sort students
  const sortedStudents = [...students].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') {
      return dir * a.studentName.localeCompare(b.studentName);
    }
    if (sortKey === 'total') {
      const totalA = challengeIndices.reduce((s, ci) => s + (a.scores[String(ci)]?.score ?? 0), 0);
      const totalB = challengeIndices.reduce((s, ci) => s + (b.scores[String(ci)]?.score ?? 0), 0);
      return dir * (totalA - totalB);
    }
    // Sort by specific challenge index
    const scoreA = a.scores[String(sortKey)]?.score ?? -1;
    const scoreB = b.scores[String(sortKey)]?.score ?? -1;
    return dir * (scoreA - scoreB);
  });

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>&#x1F3EB;</span> {room.name}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {template?.icon} {template?.name} &middot; {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--muted)]">Room Code:</span>
              <span className="font-mono font-bold text-accent text-sm tracking-wider">{room.id}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(room.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-[10px] text-[var(--muted)] hover:text-white border border-[var(--border)] rounded px-1.5 py-0.5 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded-lg transition-colors"
          >
            Back to Sandbox
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors ml-auto"
          >
            Close Room
          </button>
        </div>

        {/* Scores Table */}
        {students.length === 0 ? (
          <div className="bg-bg-card border border-[var(--border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--muted)]">No students have joined yet.</p>
            <p className="text-xs text-[var(--muted)] mt-1">Share the room code <span className="font-mono text-accent font-bold">{room.id}</span> with your students.</p>
          </div>
        ) : (
          <div className="bg-bg-card border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th
                      onClick={() => handleSort('name')}
                      className="text-left px-3 py-2.5 text-[var(--muted)] font-mono font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      Student {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    {challengeIndices.map((ci, i) => (
                      <th
                        key={ci}
                        onClick={() => handleSort(ci)}
                        className="text-center px-3 py-2.5 text-[var(--muted)] font-mono font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors max-w-[120px]"
                        title={challengeLabels[i]}
                      >
                        <span className="block truncate">{challengeLabels[i]}</span>
                        {sortKey === ci && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                    <th
                      onClick={() => handleSort('total')}
                      className="text-center px-3 py-2.5 text-[var(--muted)] font-mono font-semibold uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    >
                      Total {sortKey === 'total' && (sortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="text-center px-3 py-2.5 text-[var(--muted)] font-mono font-semibold uppercase tracking-wider">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, rowIdx) => {
                    let total = 0;
                    let attempted = 0;
                    const cells = challengeIndices.map(ci => {
                      const sc = student.scores[String(ci)];
                      if (sc) {
                        total += sc.score;
                        attempted++;
                      }
                      return sc;
                    });
                    const avg = attempted > 0 ? Math.round(total / attempted) : 0;
                    const grade = attempted > 0 ? letterGrade(avg) : '--';

                    return (
                      <tr
                        key={student.studentName}
                        className={`border-b border-[var(--border)]/30 ${rowIdx % 2 === 1 ? 'bg-bg-elevated/30' : ''}`}
                      >
                        <td className="px-3 py-2 text-white font-medium">{student.studentName}</td>
                        {cells.map((sc, i) => (
                          <td key={i} className="text-center px-3 py-2">
                            {sc ? (
                              <span className={`font-mono ${scoreColorClass(sc.score)}`}>
                                {sc.score}/{sc.maxScore}
                                {' '}
                                {sc.score >= 80 ? '✅' : sc.score >= 60 ? '⚠️' : '❌'}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)]">--</span>
                            )}
                          </td>
                        ))}
                        <td className={`text-center px-3 py-2 font-mono font-bold ${attempted > 0 ? scoreColorClass(avg) : 'text-[var(--muted)]'}`}>
                          {attempted > 0 ? total : '--'}
                        </td>
                        <td className="text-center px-3 py-2">
                          {attempted > 0 ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${scoreBgClass(avg)} ${scoreColorClass(avg)}`}>
                              {grade}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Close Room Confirm */}
        {showCloseConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-bg-card border border-[var(--border)] rounded-lg p-5 max-w-sm mx-4 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-2">Close Room?</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                This will permanently delete the room and all student data. This cannot be undone.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseRoom}
                  className="px-3 py-1.5 text-xs bg-red-400/15 text-red-400 border border-red-400/30 rounded hover:bg-red-400/25 transition-colors font-medium"
                >
                  Close Room
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
