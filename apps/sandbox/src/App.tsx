import { useState, useCallback } from 'react';
import { TemplateGallery } from './TemplateGallery';
import { SchemaPanel } from './SchemaPanel';
import { SQLEditor } from './SQLEditor';
import { ResultsPanel } from './ResultsPanel';
import { QuerySuggestions } from './QuerySuggestions';
import { getSQLForTemplate } from './datapacks';
import { initSandbox, runQuery, getSchemaInfo, resetSandbox } from './sandbox';
import { templates } from './templates';
import type { QueryResult, TableInfo } from './sandbox';
import type { Template } from './templates';

interface HistoryEntry {
  sql: string;
  rowCount: number;
  duration: number;
  timestamp: number;
}

export default function App() {
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [editorValue, setEditorValue] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [queryTime, setQueryTime] = useState<number | null>(null);

  const handleSelectTemplate = useCallback(async (template: Template) => {
    setLoading(true);
    try {
      const sql = await getSQLForTemplate(template.id);
      await initSandbox(template.id, sql);
      const schemaInfo = await getSchemaInfo();
      setSchema(schemaInfo);
      setActiveTemplate(template);
      setResult(null);
      setEditorValue('');
      setHistory([]);
      setQueryTime(null);
    } catch (e) {
      console.error('Failed to load template:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRunQuery = useCallback(async (sql: string) => {
    if (!sql.trim()) return;
    const res = await runQuery(sql);
    setResult(res);
    setQueryTime(res.duration);
    if (!res.error) {
      setHistory((prev) => [
        { sql: sql.trim(), rowCount: res.rowCount, duration: res.duration, timestamp: Date.now() },
        ...prev,
      ]);
    }
  }, []);

  const handleExplain = useCallback(async () => {
    if (!editorValue.trim()) return;
    const explainSQL = `EXPLAIN (ANALYZE, FORMAT JSON) ${editorValue}`;
    const res = await runQuery(explainSQL);
    if (res.error) {
      setResult({
        columns: [],
        rows: [],
        rowCount: 0,
        duration: res.duration,
        error: 'Execution plan not available for this query. PGLite has limited EXPLAIN support.',
      });
    } else {
      setResult(res);
    }
    setQueryTime(res.duration);
  }, [editorValue]);

  const handleSuggestionClick = useCallback(
    (sql: string) => {
      setEditorValue(sql);
      handleRunQuery(sql);
    },
    [handleRunQuery]
  );

  const handleTableClick = useCallback(
    (tableName: string) => {
      const sql = `SELECT * FROM ${tableName} LIMIT 100;`;
      setEditorValue(sql);
      handleRunQuery(sql);
    },
    [handleRunQuery]
  );

  const handleReset = useCallback(async () => {
    await resetSandbox();
    setActiveTemplate(null);
    setSchema([]);
    setResult(null);
    setEditorValue('');
    setHistory([]);
    setQueryTime(null);
  }, []);

  const totalRows = schema.reduce((sum, t) => sum + t.rowCount, 0);

  if (!activeTemplate) {
    return (
      <div className="min-h-screen bg-bg">
        <Header onReset={handleReset} activeTemplate={null} templates={templates} onSelectTemplate={handleSelectTemplate} />
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
      />
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-[var(--muted)] text-sm">Loading database...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-64 border-r border-[var(--border)] overflow-hidden shrink-0">
            <SchemaPanel schema={schema} onTableClick={handleTableClick} />
          </div>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="h-[280px] shrink-0 border-b border-[var(--border)]">
              <SQLEditor
                value={editorValue}
                onChange={setEditorValue}
                onRun={handleRunQuery}
                onExplain={handleExplain}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <ResultsPanel result={result} schema={schema} />
            </div>
          </div>
          <div className="w-full md:w-72 border-l border-[var(--border)] overflow-y-auto shrink-0">
            <QuerySuggestions
              queries={activeTemplate.suggestedQueries}
              history={history}
              onSelect={handleSuggestionClick}
            />
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
}: {
  onReset: () => void;
  activeTemplate: Template | null;
  templates: Template[];
  onSelectTemplate: (t: Template) => void;
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
