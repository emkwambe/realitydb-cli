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

interface SchemaERDProps {
  schema: SchemaTable[];
  onTableClick: (tableName: string) => void;
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
  const { label, columns, rowCount, onTableClick } = data as {
    label: string;
    columns: ColumnInfo[];
    rowCount: number;
    onTableClick: (name: string) => void;
  };

  return (
    <div
      className="table-node"
      onClick={() => onTableClick(label)}
      style={{
        background: '#12121a',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        minWidth: 220,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: 'monospace',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2a3e';
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 700, color: '#6366f1' }}>{label}</span>
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
          return (
            <div
              key={col.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 12px',
                color: '#e0e0e8',
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
              <span style={{ fontSize: 10, color: '#6b6b80' }}>{shortType(col.type)}</span>
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

export function SchemaERD({ schema, onTableClick }: SchemaERDProps) {
  const tableNames = useMemo(() => new Set(schema.map((t) => t.name)), [schema]);

  const nodes: Node[] = useMemo(
    () =>
      schema.map((table, index) => ({
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
        },
      })),
    [schema, onTableClick]
  );

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    for (const table of schema) {
      for (const col of table.columns) {
        const target = resolveFK(col.name, tableNames);
        if (target && target !== table.name) {
          result.push({
            id: `${table.name}.${col.name}->${target}`,
            source: table.name,
            target,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          });
        }
      }
    }
    return result;
  }, [schema, tableNames]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onTableClick(node.id);
    },
    [onTableClick]
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }}>
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
          nodeColor="#1e1e2e"
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
