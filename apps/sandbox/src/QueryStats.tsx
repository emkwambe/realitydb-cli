import { useState, useMemo } from 'react';

interface HistoryEntry {
  sql: string;
  rowCount: number;
  duration: number;
  timestamp: number;
}

interface Props {
  history: HistoryEntry[];
}

export function QueryStats({ history }: Props) {
  const [open, setOpen] = useState(true);

  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const durations = history.map((h) => h.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    const avg = Math.round(total / durations.length);
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    // Slowest 3 queries
    const slowest = [...history]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3);

    // Execution time histogram (5 buckets)
    const bucketCount = 5;
    const bucketSize = Math.max(1, Math.ceil((max + 1) / bucketCount));
    const buckets: { label: string; count: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const lo = i * bucketSize;
      const hi = (i + 1) * bucketSize - 1;
      const count = durations.filter((d) => d >= lo && d <= hi).length;
      buckets.push({ label: `${lo}-${hi}ms`, count });
    }
    // Remove trailing empty buckets
    while (buckets.length > 1 && buckets[buckets.length - 1].count === 0) {
      buckets.pop();
    }
    const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

    return { avg, max, min, total: history.length, slowest, buckets, maxBucket };
  }, [history]);

  if (!stats) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-white transition-colors"
      >
        <span className={`text-[10px] transition-transform ${open ? 'rotate-90' : ''}`}>
          &#x25B6;
        </span>
        Query Stats ({stats.total})
      </button>

      {open && (
        <div className="bg-bg-card border border-[var(--border)] rounded-lg p-3 space-y-3">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-mono font-bold text-accent">{stats.avg}ms</div>
              <div className="text-[9px] text-[var(--muted)] uppercase">Avg</div>
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-amber">{stats.max}ms</div>
              <div className="text-[9px] text-[var(--muted)] uppercase">Slowest</div>
            </div>
            <div>
              <div className="text-sm font-mono font-bold text-green">{stats.min}ms</div>
              <div className="text-[9px] text-[var(--muted)] uppercase">Fastest</div>
            </div>
          </div>

          {/* Histogram */}
          <div>
            <div className="text-[10px] font-mono text-[var(--muted)] mb-1.5">Execution Time Distribution</div>
            <div className="space-y-1">
              {stats.buckets.map((bucket, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[var(--muted)] w-16 text-right shrink-0">
                    {bucket.label}
                  </span>
                  <div className="flex-1 h-3 bg-bg-elevated rounded overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded transition-all"
                      style={{ width: `${(bucket.count / stats.maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-[var(--muted)] w-4 shrink-0">
                    {bucket.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Slowest queries */}
          {stats.slowest.length > 0 && (
            <div>
              <div className="text-[10px] font-mono text-[var(--muted)] mb-1.5">Slowest Queries</div>
              <div className="space-y-1">
                {stats.slowest.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-amber shrink-0">{entry.duration}ms</span>
                    <span className="text-[10px] font-mono text-gray-400 truncate">{entry.sql}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
