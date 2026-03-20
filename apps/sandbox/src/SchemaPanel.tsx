import { useState } from 'react';
import type { TableInfo } from './sandbox';
import { SchemaERD } from './SchemaERD';

interface Props {
  schema: TableInfo[];
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
  NUMERIC: 'NUMERIC',
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

type ViewMode = 'list' | 'erd';

export function SchemaPanel({ schema, onTableClick }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const toggle = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const erdSchema = schema.map((t) => ({
    name: t.name,
    columns: t.columns.map((c) => ({
      name: c.name,
      type: c.type,
      nullable: false,
      isPK: c.isPrimaryKey,
    })),
    rowCount: t.rowCount,
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-wider">
            Schema · {schema.length} tables
          </h2>
          <div className="flex rounded overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('erd')}
              className={`px-2 py-0.5 text-[10px] font-mono transition-colors ${
                viewMode === 'erd'
                  ? 'bg-accent text-white'
                  : 'text-[var(--muted)] hover:text-white'
              }`}
            >
              ERD
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="p-3 pt-0 space-y-1 overflow-y-auto flex-1">
          {schema.map((table) => (
            <div key={table.name}>
              <button
                onClick={() => toggle(table.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-bg-card transition-colors group"
              >
                <span className={`text-[10px] transition-transform ${expanded.has(table.name) ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                <span className="font-mono text-white text-xs">{table.name}</span>
                <span className="ml-auto text-[10px] text-[var(--muted)]">{table.rowCount}</span>
              </button>
              {expanded.has(table.name) && (
                <div className="ml-5 mb-2">
                  {table.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center gap-2 px-2 py-0.5 text-[11px]"
                    >
                      {col.isPrimaryKey ? (
                        <span className="text-amber text-[10px]" title="Primary Key">🔑</span>
                      ) : (
                        <span className="w-3" />
                      )}
                      <span className="font-mono text-gray-300">{col.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-[var(--muted)]">
                        {shortType(col.type)}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => onTableClick(table.name)}
                    className="mt-1 px-2 py-0.5 text-[10px] text-accent hover:text-white transition-colors font-mono"
                  >
                    SELECT * FROM {table.name} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-[400px]">
          <SchemaERD schema={erdSchema} onTableClick={onTableClick} />
        </div>
      )}
    </div>
  );
}
