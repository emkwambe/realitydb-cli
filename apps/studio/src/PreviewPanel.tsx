import React, { useMemo } from 'react';
import { useSchemaStore, generateGhostRows } from './store';
import {
  Table as TableIcon,
  Network,
  BarChart3,
  Download,
  RefreshCw,
  User,
  Package,
  ShoppingCart,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { convertToCliTemplate, downloadJSON, generateConfigSkeleton } from './services/exportCLI';

export default function PreviewPanel() {
  const {
    tables,
    relationships,
    selectedTableId,
    previewMode,
    setPreviewMode,
    selectedRootRecordId,
    setSelectedRootRecordId,
    simulation,
    calculateForecast
  } = useSchemaStore();

  const ghostRows = useMemo(() => {
    const projectContext: Record<string, any[]> = {};

    // Pass 1: Generate PKs
    tables.forEach(table => {
      projectContext[table.id] = generateGhostRows(table, 15, tables, {});
    });

    // Pass 2: Resolve FKs & Lifecycle
    tables.forEach(table => {
      projectContext[table.id] = generateGhostRows(table, 15, tables, projectContext);
    });

    return projectContext;
  }, [tables]);

  const selectedTable = tables.find(t => t.id === selectedTableId) || tables[0];
  const rows = selectedTable ? ghostRows[selectedTable.id] || [] : [];

  // System Explorer Logic
  const rootTable = tables.find(t => t.name.toLowerCase().includes('user') || t.name.toLowerCase().includes('customer')) || tables[0];
  const rootRecords = rootTable ? ghostRows[rootTable.id] || [] : [];
  const activeRootRecord = rootRecords.find(r => r.id === selectedRootRecordId) || rootRecords[0];

  const relatedData = useMemo(() => {
    if (!activeRootRecord || !rootTable) return [];

    return relationships
      .filter(rel => rel.sourceTableId === rootTable.id)
      .map(rel => {
        const targetTable = tables.find(t => t.id === rel.targetTableId);
        const relatedRows = ghostRows[rel.targetTableId]?.filter(r => r[rel.targetColumnId] === activeRootRecord.id) || [];
        return { table: targetTable, rows: relatedRows };
      });
  }, [activeRootRecord, relationships, tables, ghostRows, rootTable]);

  // Forecast Logic
  const forecast = useMemo(() => calculateForecast(), [calculateForecast, tables, simulation]);
  const forecastData = useMemo(() => {
    return forecast.tableForecasts.map(f => ({
      name: f.tableName,
      count: f.rowCount,
      growth: f.growthRate
    }));
  }, [forecast]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExportForCLI = () => {
    const template = convertToCliTemplate(tables, relationships, simulation);
    downloadJSON(template, 'realitydb-template.json');
    downloadJSON(generateConfigSkeleton(), 'realitydb-config.json');
  };

  return (
    <div className="h-full flex flex-col bg-white border-t border-slate-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setPreviewMode('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TableIcon size={14} />
            Data Grid
          </button>
          <button
            onClick={() => setPreviewMode('system')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'system' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Network size={14} />
            System Explorer
          </button>
          <button
            onClick={() => setPreviewMode('forecast')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'forecast' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 size={14} />
            Forecast
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportForCLI}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-all shadow-sm"
          >
            <Download size={14} />
            Export for CLI
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {previewMode === 'table' && (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-auto p-4"
            >
              {selectedTable ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {selectedTable.columns.map(col => (
                        <th key={col.id} className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            {col.isPK && <span className="text-amber-500">PK</span>}
                            {col.isFK && <span className="text-indigo-500">FK</span>}
                            {col.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        {selectedTable.columns.map(col => (
                          <td key={col.id} className="py-3 px-4 text-xs text-slate-600 font-mono">
                            {row[col.name] === null ? <span className="text-slate-300 italic">NULL</span> : String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <TableIcon size={48} strokeWidth={1} />
                  <p className="text-sm">Select a table to preview ghost data</p>
                </div>
              )}
            </motion.div>
          )}

          {previewMode === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full grid grid-cols-12 gap-0"
            >
              <div className="col-span-3 border-r border-slate-100 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
                  Root: {rootTable?.name}
                </h3>
                {rootRecords.map(record => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedRootRecordId(record.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                      selectedRootRecordId === record.id
                        ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50'
                        : 'border-transparent hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedRootRecordId === record.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      <User size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-700 truncate">{record.email || record.name || record.id}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">ID: {record.id}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="col-span-9 p-8 overflow-y-auto bg-white">
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Entity Snapshot</h2>
                      <p className="text-sm text-slate-500">Visualizing cascaded relationships for {activeRootRecord?.email || activeRootRecord?.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {relatedData.map((rel, i) => (
                      <div key={i} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/30 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 transition-colors">
                              {rel.table?.name.toLowerCase().includes('order') ? <ShoppingCart size={16} /> : <Package size={16} />}
                            </div>
                            <h4 className="font-bold text-slate-700 capitalize">{rel.table?.name}</h4>
                          </div>
                          <span className="px-2 py-0.5 bg-white border border-slate-100 rounded-full text-[10px] font-bold text-slate-400">
                            {rel.rows.length} Records
                          </span>
                        </div>

                        <div className="space-y-2">
                          {rel.rows.slice(0, 3).map((row, j) => (
                            <div key={j} className="bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                              <span className="truncate max-w-[150px]">{row.id}</span>
                              <span className="text-indigo-500 font-bold">{row.status || row.total || row.price || '...'}</span>
                            </div>
                          ))}
                          {rel.rows.length > 3 && (
                            <p className="text-[10px] text-center text-slate-400 pt-2">+ {rel.rows.length - 3} more records</p>
                          )}
                          {rel.rows.length === 0 && (
                            <div className="py-4 text-center text-[10px] text-slate-400 italic">No related records found</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {previewMode === 'forecast' && (
            <motion.div
              key="forecast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-8 overflow-y-auto bg-white"
            >
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Database size={120} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Total System Rows</p>
                    <h3 className="text-4xl font-bold mb-4">{(forecast.totalRows / 1000).toFixed(1)}k</h3>
                    <div className="flex items-center gap-2 text-xs bg-white/20 w-fit px-2 py-1 rounded-full">
                      <RefreshCw size={12} />
                      Forecasted for {simulation.timelineDays} days
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Avg Growth Rate</p>
                    <h3 className="text-4xl font-bold mb-4">+{forecast.avgGrowthRate}%</h3>
                    <p className="text-xs opacity-50">Based on {simulation.growthCurve} curve</p>
                  </div>
                  <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Storage Estimate</p>
                    <h3 className="text-4xl font-bold mb-4">{(forecast.totalRows * 0.0005).toFixed(1)} MB</h3>
                    <p className="text-xs opacity-50">PostgreSQL / MySQL optimized</p>
                  </div>
                </div>

                {/* CLI command hint */}
                <div className="bg-slate-800 rounded-xl p-4 font-mono text-sm text-emerald-400">
                  <span className="text-slate-500">$</span> realitydb seed --template realitydb-template.json --records {Math.max(100, Math.floor(forecast.totalRows / tables.length))} --seed {simulation.seed}
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-8 flex items-center gap-2">
                      <BarChart3 size={16} className="text-indigo-500" />
                      Table Distribution Forecast
                    </h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecastData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 mb-8 flex items-center gap-2">
                      <BarChart3 size={16} className="text-emerald-500" />
                      Cardinality & Skew
                    </h4>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={forecastData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="count"
                          >
                            {forecastData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
