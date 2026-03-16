import React, { useState, useRef } from 'react';
import Sidebar from './Sidebar';
import SchemaCanvas from './SchemaCanvas';
import Inspector from './Inspector';
import PreviewPanel from './PreviewPanel';
import { useSchemaStore } from './store';
import {
  Download,
  Upload,
  Database,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  FileCode,
  FileJson,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  convertToCliTemplate,
  generateConfigSkeleton,
  generateSQLDDL,
  validateForExport,
  downloadJSON,
  downloadText,
} from './services/exportCLI';
import { importSchema } from './services/importCLI';

export default function App() {
  const { tables, relationships, simulation, importSchema: storeImport } = useSchemaStore();
  const [showExport, setShowExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationIssues = showExport ? validateForExport(tables, relationships) : [];
  const blockingErrors = validationIssues.filter(i => i.type === 'error');
  const warnings = validationIssues.filter(i => i.type === 'warning');
  const canExport = blockingErrors.length === 0;

  const handleExportCLI = () => {
    if (!canExport) return;
    const template = convertToCliTemplate(tables, relationships, simulation);
    downloadJSON(template, 'realitydb-template.json');
    downloadJSON(generateConfigSkeleton(), 'realitydb-config.json');
    setShowExport(false);
  };

  const handleExportSQL = () => {
    if (!canExport) return;
    const ddl = generateSQLDDL(tables, relationships);
    downloadText(ddl, 'schema.sql');
    setShowExport(false);
  };

  const handleExportStudio = () => {
    const schema = {
      tables,
      relationships,
      simulation,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };
    downloadJSON(schema, 'realitydb-studio-pack.json');
    setShowExport(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const { tables: importedTables, relationships: importedRels } = importSchema(raw);
        if (importedTables.length === 0) {
          alert('No tables found in the imported file.');
          return;
        }
        if (confirm(`Import ${importedTables.length} tables? This will replace your current schema.`)) {
          storeImport(importedTables, importedRels);
        }
      } catch (err) {
        alert('Failed to parse file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 tracking-tight leading-none">RealityDB Studio</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Design Workbench</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tables</span>
              <span className="text-xs font-semibold text-slate-700">{tables.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Relationships</span>
              <span className="text-xs font-semibold text-slate-700">{relationships.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/docs/README.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-all"
            >
              <BookOpen size={14} />
              Docs
            </a>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-all"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all shadow-sm"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 relative">
            <SchemaCanvas />
          </div>

          <div className="h-64 shrink-0">
            <PreviewPanel />
          </div>
        </div>

        <Inspector />
      </main>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Export Schema</h2>
                <p className="text-sm text-slate-500 mt-1">Choose an export format for your schema.</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Validation results */}
                {blockingErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                    <div className="flex gap-2 items-center">
                      <AlertCircle className="text-red-500 shrink-0" size={18} />
                      <h4 className="text-sm font-semibold text-red-800">Blocking Errors ({blockingErrors.length})</h4>
                    </div>
                    {blockingErrors.map((e, i) => (
                      <p key={i} className="text-xs text-red-700 ml-6">{e.message}</p>
                    ))}
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                    <div className="flex gap-2 items-center">
                      <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                      <h4 className="text-sm font-semibold text-amber-800">Warnings ({warnings.length})</h4>
                    </div>
                    {warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700 ml-6">{w.message}</p>
                    ))}
                  </div>
                )}

                {blockingErrors.length === 0 && warnings.length === 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-800">Schema Validated</h4>
                      <p className="text-xs text-emerald-600 mt-0.5">All tables, relationships, and strategies are correctly configured.</p>
                    </div>
                  </div>
                )}

                {/* Export options */}
                <div className="space-y-3">
                  <div
                    onClick={handleExportCLI}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all group ${canExport ? 'border-slate-200 hover:border-indigo-200 cursor-pointer' : 'border-slate-100 opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all ${canExport ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <FileJson size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">RealityDB Template</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">CLI-Compatible .json</p>
                      </div>
                    </div>
                    <Play size={16} className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>

                  <div
                    onClick={handleExportSQL}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all group ${canExport ? 'border-slate-200 hover:border-indigo-200 cursor-pointer' : 'border-slate-100 opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-all ${canExport ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                        <FileCode size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">SQL DDL</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">PostgreSQL CREATE TABLE .sql</p>
                      </div>
                    </div>
                    <Play size={16} className="text-slate-300 group-hover:text-emerald-600 transition-all" />
                  </div>

                  <div
                    onClick={handleExportStudio}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-200 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-50 p-2 rounded-lg text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-all">
                        <Archive size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Studio Pack</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Full Internal Format .json</p>
                      </div>
                    </div>
                    <Play size={16} className="text-slate-300 group-hover:text-slate-600 transition-all" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowExport(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
