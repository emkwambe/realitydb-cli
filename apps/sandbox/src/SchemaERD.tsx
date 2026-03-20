import { useMemo, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { JoinPath } from './sqlParser';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPK: boolean;
}

interface SchemaTable {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface QueryLineage {
  touchedTables: Set<string>;
  touchedColumns: Map<string, Set<string>>; // table -> set of column names
  joinPaths: JoinPath[];
}

interface SchemaERDProps {
  schema: SchemaTable[];
  onTableClick: (tableName: string) => void;
  lineage?: QueryLineage | null;
}

const TYPE_SHORT: Record<string, string> = {
  UUID: 'UUID',
  VARCHAR: 'VARCHAR',
  TEXT: 'TEXT',
  INT4: 'INT',
  INT8: 'BIGINT',
  INTEGER: 'INT',
  BIGINT: 'BIGINT',
  NUMERIC: 'DECIMAL',
  BOOL: 'BOOL',
  BOOLEAN: 'BOOL',
  TIMESTAMP: 'TIMESTAMP',
  TIMESTAMPTZ: 'TIMESTAMPTZ',
  DATE: 'DATE',
  FLOAT8: 'FLOAT',
  FLOAT4: 'FLOAT',
};

function shortType(type: string): string {
  const upper = type.toUpperCase();
  return TYPE_SHORT[upper] || upper;
}

function TableNode({ data }: NodeProps) {
  const { label, columns, rowCount, onTableClick, highlighted, highlightedColumns } = data as {
    label: string;
    columns: ColumnInfo[];
    rowCount: number;
    onTableClick: (name: string) => void;
    highlighted: boolean;
    highlightedColumns: Set<string>;
  };

  const borderColor = highlighted ? '#22d3ee' : '#2a2a3e';
  const headerColor = highlighted ? '#22d3ee' : '#6366f1';
  const glowStyle = highlighted
    ? { boxShadow: '0 0 12px rgba(34, 211, 238, 0.25)' }
    : {};

  return (
    <div
      className="table-node"
      onClick={() => onTableClick(label)}
      style={{
        background: highlighted ? '#0f1a24' : '#12121a',
        border: `${highlighted ? 2 : 1}px solid ${borderColor}`,
        borderRadius: 8,
        minWidth: 220,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: 'monospace',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        ...glowStyle,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = borderColor;
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div
        style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${highlighted ? '#22d3ee30' : '#2a2a3e'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: highlighted ? 'rgba(34, 211, 238, 0.05)' : 'transparent',
        }}
      >
        <span style={{ fontWeight: 700, color: headerColor }}>{label}</span>
        <span
          style={{
            fontSize: 10,
            background: '#1e1e2e',
            color: '#a0a0b8',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {rowCount}
        </span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {columns.map((col) => {
          const isFK = col.name.endsWith('_id') && !col.isPK;
          const isHighlighted = highlightedColumns.has(col.name);
          return (
            <div
              key={col.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 12px',
                color: isHighlighted ? '#22d3ee' : '#e0e0e8',
                background: isHighlighted ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
                fontWeight: isHighlighted ? 600 : 400,
                transition: 'all 0.2s ease',
              }}
            >
              {col.isPK ? (
                <span style={{ color: '#f59e0b', fontSize: 10, width: 14, textAlign: 'center' }}>🔑</span>
              ) : isFK ? (
                <span style={{ color: '#6366f1', fontSize: 10, width: 14, textAlign: 'center' }}>🔗</span>
              ) : (
                <span style={{ width: 14 }} />
              )}
              <span style={{ flex: 1 }}>{col.name}</span>
              <span style={{ fontSize: 10, color: isHighlighted ? '#22d3ee80' : '#6b6b80' }}>
                {shortType(col.type)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

function resolveFK(colName: string, tableNames: Set<string>): string | null {
  if (!colName.endsWith('_id')) return null;
  const base = colName.slice(0, -3);
  if (tableNames.has(base)) return base;
  if (tableNames.has(base + 's')) return base + 's';
  if (tableNames.has(base + 'es')) return base + 'es';
  return null;
}

export function SchemaERD({ schema, onTableClick, lineage }: SchemaERDProps) {
  const tableNames = useMemo(() => new Set(schema.map((t) => t.name)), [schema]);

  const hasLineage = lineage && lineage.touchedTables.size > 0;

  const nodes: Node[] = useMemo(
    () =>
      schema.map((table, index) => {
        const highlighted = hasLineage ? lineage!.touchedTables.has(table.name) : false;
        const highlightedColumns = hasLineage
          ? (lineage!.touchedColumns.get(table.name) || new Set<string>())
          : new Set<string>();

        return {
          id: table.name,
          type: 'tableNode',
          position: {
            x: 50 + (index % 3) * 320,
            y: 50 + Math.floor(index / 3) * 280,
          },
          data: {
            label: table.name,
            columns: table.columns.map((c) => ({
              name: c.name,
              type: c.type,
              nullable: c.nullable,
              isPK: c.isPK,
            })),
            rowCount: table.rowCount,
            onTableClick,
            highlighted,
            highlightedColumns,
          },
          style: hasLineage && !highlighted ? { opacity: 0.35 } : {},
        };
      }),
    [schema, onTableClick, lineage, hasLineage]
  );

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];

    // Standard FK edges
    for (const table of schema) {
      for (const col of table.columns) {
        const target = resolveFK(col.name, tableNames);
        if (target && target !== table.name) {
          // Check if this FK edge is part of the join path
          const isJoinEdge = hasLineage && lineage!.joinPaths.some(
            (jp) =>
              (jp.fromTable === table.name && jp.toTable === target) ||
              (jp.toTable === table.name && jp.fromTable === target)
          );

          result.push({
            id: `${table.name}.${col.name}->${target}`,
            source: table.name,
            target,
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: isJoinEdge ? '#22d3ee' : '#6366f1',
              strokeWidth: isJoinEdge ? 3 : 2,
              opacity: hasLineage && !isJoinEdge ? 0.2 : 1,
            },
          });
        }
      }
    }

    // Add explicit join path edges that may not have FK relationships
    if (hasLineage) {
      for (const jp of lineage!.joinPaths) {
        const edgeId = `join:${jp.fromTable}.${jp.fromColumn}->${jp.toTable}.${jp.toColumn}`;
        const exists = result.some(
          (e) =>
            (e.source === jp.fromTable && e.target === jp.toTable) ||
            (e.source === jp.toTable && e.target === jp.fromTable)
        );
        if (!exists && tableNames.has(jp.fromTable) && tableNames.has(jp.toTable)) {
          result.push({
            id: edgeId,
            source: jp.fromTable,
            target: jp.toTable,
            type: 'smoothstep',
            animated: true,
            label: `${jp.fromColumn} = ${jp.toColumn}`,
            labelStyle: { fontSize: 9, fill: '#22d3ee', fontFamily: 'monospace' },
            labelBgStyle: { fill: '#0a0a0f', fillOpacity: 0.8 },
            style: { stroke: '#22d3ee', strokeWidth: 3, strokeDasharray: '5 3' },
          });
        }
      }
    }

    return result;
  }, [schema, tableNames, lineage, hasLineage]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onTableClick(node.id);
    },
    [onTableClick]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }}>
      {hasLineage && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          background: '#12121a',
          border: '1px solid #22d3ee30',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#22d3ee',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
          Query lineage active
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a2e" gap={20} />
        <MiniMap
          nodeColor={(node) => {
            if (hasLineage && lineage!.touchedTables.has(node.id)) return '#22d3ee';
            return '#1e1e2e';
          }}
          maskColor="rgba(0,0,0,0.7)"
          style={{ background: '#0a0a0f', border: '1px solid #2a2a3e' }}
        />
        <Controls
          style={{ background: '#12121a', border: '1px solid #2a2a3e', borderRadius: 6 }}
        />
      </ReactFlow>
    </div>
  );
}
