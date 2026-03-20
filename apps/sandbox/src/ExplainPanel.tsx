import { useState, useMemo, useCallback } from 'react';

/* ─── Types ─── */

interface PlanNode {
  'Node Type': string;
  'Relation Name'?: string;
  'Alias'?: string;
  'Join Type'?: string;
  'Hash Cond'?: string;
  'Merge Cond'?: string;
  'Join Filter'?: string;
  'Index Cond'?: string;
  'Filter'?: string;
  'Index Name'?: string;
  'Scan Direction'?: string;
  'Total Cost': number;
  'Startup Cost': number;
  'Plan Rows': number;
  'Plan Width': number;
  'Actual Total Time'?: number;
  'Actual Startup Time'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  Plans?: PlanNode[];
  [key: string]: unknown;
}

interface ExplainJSON {
  Plan: PlanNode;
  'Planning Time'?: number;
  'Execution Time'?: number;
  'Total Runtime'?: number;
}

export type ExplainMode = 'analyze' | 'plan-only' | 'text';

interface Props {
  data: ExplainJSON | string;
  mode: ExplainMode;
  duration: number;
  onBack: () => void;
}

/* ─── Helpers ─── */

function getTotalCost(node: PlanNode): number {
  let total = node['Total Cost'] || 0;
  if (node.Plans) {
    for (const child of node.Plans) {
      total = Math.max(total, getTotalCost(child));
    }
  }
  return total;
}

function getRowAccuracy(node: PlanNode): 'good' | 'mediocre' | 'bad' | null {
  if (node['Actual Rows'] === undefined) return null;
  const actual = node['Actual Rows'];
  const estimated = node['Plan Rows'];
  if (estimated === 0 && actual === 0) return 'good';
  if (estimated === 0) return 'bad';
  const ratio = actual / estimated;
  if (ratio >= 0.5 && ratio <= 2) return 'good';
  if (ratio >= 0.1 && ratio <= 10) return 'mediocre';
  return 'bad';
}

const accuracyColors = {
  good: '#00e5a0',
  mediocre: '#ffb444',
  bad: '#ef4444',
};

const accuracyIcons = {
  good: '\u2705',
  mediocre: '\u26A0\uFE0F',
  bad: '\uD83D\uDD34',
};

function getJoinCondition(node: PlanNode): string | null {
  return (node['Hash Cond'] || node['Merge Cond'] || node['Join Filter'] || node['Index Cond'] || null) as string | null;
}

function getNodeLabel(node: PlanNode): string {
  const parts = [];
  if (node['Join Type']) parts.push(node['Join Type']);
  parts.push(node['Node Type']);
  return parts.join(' ');
}

/* ─── Tree Node Component ─── */

function PlanTreeNode({
  node,
  depth,
  maxCost,
  isAnalyze,
  isLast,
  parentHasMore,
}: {
  node: PlanNode;
  depth: number;
  maxCost: number;
  isAnalyze: boolean;
  isLast: boolean;
  parentHasMore: boolean[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.Plans && node.Plans.length > 0;
  const accuracy = isAnalyze ? getRowAccuracy(node) : null;
  const borderColor = accuracy ? accuracyColors[accuracy] : '#2a2a3e';
  const costPct = maxCost > 0 ? ((node['Total Cost'] || 0) / maxCost) * 100 : 0;
  const costBarColor = costPct > 60 ? '#ef4444' : costPct > 25 ? '#ffb444' : '#00e5a0';
  const tableName = node['Relation Name'] || node['Alias'];
  const joinCond = getJoinCondition(node);

  return (
    <div style={{ paddingLeft: depth > 0 ? 24 : 0 }} className="relative">
      {/* Connector lines */}
      {depth > 0 && (
        <>
          {/* Vertical line from parent */}
          <div
            style={{
              position: 'absolute',
              left: -12,
              top: 0,
              bottom: isLast ? '50%' : 0,
              width: 1,
              backgroundColor: '#2a2a3e',
            }}
          />
          {/* Horizontal connector to this node */}
          <div
            style={{
              position: 'absolute',
              left: -12,
              top: 20,
              width: 12,
              height: 1,
              backgroundColor: '#2a2a3e',
            }}
          />
          {/* Ancestor vertical continuation lines */}
          {parentHasMore.map((hasMore, i) =>
            hasMore ? (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: -(depth - i) * 24 - 12,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: '#2a2a3e',
                }}
              />
            ) : null
          )}
        </>
      )}

      {/* Node card */}
      <div
        onClick={() => hasChildren && setCollapsed(!collapsed)}
        style={{
          background: '#12121a',
          border: '1px solid #2a2a3e',
          borderLeft: `3px solid ${borderColor}`,
          borderRadius: 6,
          padding: collapsed ? '6px 10px' : '10px 14px',
          marginBottom: 6,
          cursor: hasChildren ? 'pointer' : 'default',
          fontFamily: '"JetBrains Mono", monospace',
          transition: 'border-color 0.2s',
        }}
      >
        {collapsed ? (
          /* Collapsed: single line */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>{'\u25B6'}</span>
            <span style={{ fontWeight: 700, color: '#e5e7eb' }}>{getNodeLabel(node)}</span>
            {isAnalyze && node['Actual Total Time'] !== undefined && (
              <span style={{ color: '#ffb444', fontSize: 11 }}>
                {node['Actual Total Time'].toFixed(2)}ms
              </span>
            )}
            {isAnalyze && node['Actual Rows'] !== undefined && (
              <span style={{ color: '#6b7280', fontSize: 11 }}>
                {node['Actual Rows']} rows
              </span>
            )}
            {!isAnalyze && (
              <span style={{ color: '#6b7280', fontSize: 11 }}>
                ~{node['Plan Rows']} rows
              </span>
            )}
          </div>
        ) : (
          /* Expanded: full card */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {hasChildren && (
                <span style={{ color: '#6b7280', fontSize: 10 }}>{'\u25BC'}</span>
              )}
              <span style={{ fontWeight: 700, fontSize: 14, color: '#e5e7eb' }}>
                {getNodeLabel(node)}
              </span>
            </div>

            {/* Table name */}
            {tableName && (
              <div style={{ fontSize: 11, color: '#a78bfa', marginBottom: 4 }}>
                Table: <span style={{ color: '#e5e7eb' }}>{tableName}</span>
                {node['Index Name'] && (
                  <span style={{ color: '#6b7280' }}> via {node['Index Name']}</span>
                )}
              </div>
            )}

            {/* Join condition */}
            {joinCond && (
              <div style={{ fontSize: 11, color: '#22d3ee', marginBottom: 4 }}>
                Join: <span style={{ color: '#e5e7eb' }}>{joinCond}</span>
              </div>
            )}

            {/* Filter */}
            {node['Filter'] && !joinCond && (
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                Filter: <span style={{ color: '#e5e7eb' }}>{node['Filter']}</span>
              </div>
            )}

            {/* Timing (ANALYZE only) */}
            {isAnalyze && node['Actual Total Time'] !== undefined && (
              <div style={{ fontSize: 12, color: '#ffb444', marginBottom: 4 }}>
                Time: {node['Actual Total Time'].toFixed(2)}ms
                {node['Actual Loops'] !== undefined && node['Actual Loops'] > 1 && (
                  <span style={{ color: '#6b7280' }}> x{node['Actual Loops']} loops</span>
                )}
              </div>
            )}

            {/* Row counts with accuracy */}
            <div style={{ fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isAnalyze && node['Actual Rows'] !== undefined ? (
                <>
                  {accuracy && (
                    <span style={{ fontSize: 12 }}>{accuracyIcons[accuracy]}</span>
                  )}
                  <span style={{ color: accuracyColors[accuracy || 'good'] }}>
                    Rows: {node['Actual Rows']} (est: {node['Plan Rows']})
                  </span>
                </>
              ) : (
                <span style={{ color: '#6b7280' }}>
                  Estimated Rows: {node['Plan Rows']}
                </span>
              )}
            </div>

            {/* Cost */}
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
              Cost: {(node['Startup Cost'] || 0).toFixed(2)} &rarr; {(node['Total Cost'] || 0).toFixed(2)}
            </div>

            {/* Proportion bar */}
            <div
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: '#1e2028',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(costPct, 100)}%`,
                  backgroundColor: costBarColor,
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Children */}
      {hasChildren && !collapsed &&
        node.Plans!.map((child, i) => (
          <PlanTreeNode
            key={i}
            node={child}
            depth={depth + 1}
            maxCost={maxCost}
            isAnalyze={isAnalyze}
            isLast={i === node.Plans!.length - 1}
            parentHasMore={[...parentHasMore, i < node.Plans!.length - 1]}
          />
        ))}
    </div>
  );
}

/* ─── Main ExplainPanel ─── */

export function ExplainPanel({ data, mode, duration, onBack }: Props) {
  const handleBack = useCallback(() => onBack(), [onBack]);

  // Text fallback mode
  if (mode === 'text' || typeof data === 'string') {
    return (
      <div className="h-full flex flex-col">
        <ExplainHeader mode="text" duration={duration} onBack={handleBack} />
        <div className="flex-1 overflow-auto p-4">
          <pre
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#e5e7eb',
              background: '#12121a',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              padding: 16,
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
            }}
          >
            {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return <ExplainTree data={data} mode={mode} duration={duration} onBack={handleBack} />;
}

function ExplainTree({
  data,
  mode,
  duration,
  onBack,
}: {
  data: ExplainJSON;
  mode: 'analyze' | 'plan-only';
  duration: number;
  onBack: () => void;
}) {
  const maxCost = useMemo(() => getTotalCost(data.Plan), [data]);
  const isAnalyze = mode === 'analyze';

  return (
    <div className="h-full flex flex-col">
      <ExplainHeader mode={mode} duration={duration} onBack={onBack} data={data} />
      <div className="flex-1 overflow-auto p-4">
        <PlanTreeNode
          node={data.Plan}
          depth={0}
          maxCost={maxCost}
          isAnalyze={isAnalyze}
          isLast={true}
          parentHasMore={[]}
        />
      </div>
    </div>
  );
}

function ExplainHeader({
  mode,
  duration,
  onBack,
  data,
}: {
  mode: ExplainMode;
  duration: number;
  onBack: () => void;
  data?: ExplainJSON;
}) {
  return (
    <div className="px-3 py-1.5 border-b border-[var(--border)] bg-bg-elevated flex items-center gap-3">
      <button
        onClick={onBack}
        className="text-xs text-[var(--muted)] hover:text-white border border-[var(--border)] rounded px-2 py-0.5 transition-colors"
      >
        &larr; Back to Results
      </button>
      <span className="text-xs font-mono text-amber font-medium">Execution Plan</span>
      <span className="text-[10px] font-mono text-[var(--muted)]">
        {mode === 'analyze' ? 'EXPLAIN ANALYZE' : mode === 'plan-only' ? 'EXPLAIN (estimated)' : 'EXPLAIN (text)'}
      </span>
      {data && data['Execution Time'] !== undefined && (
        <span className="text-[10px] font-mono text-green">
          Exec: {data['Execution Time'].toFixed(2)}ms
        </span>
      )}
      {data && data['Planning Time'] !== undefined && (
        <span className="text-[10px] font-mono text-[var(--muted)]">
          Plan: {data['Planning Time'].toFixed(2)}ms
        </span>
      )}
      <span className="text-xs font-mono text-[var(--muted)] ml-auto">{duration}ms</span>
    </div>
  );
}
