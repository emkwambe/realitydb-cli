import React, { useState, useMemo } from 'react';
import { useSchemaStore, TYPE_STRATEGIES, validateSchema } from './store';
import { DataType, SEMANTIC_COLORS, SEMANTIC_LABELS, RelationshipSemantic } from './types';
import {
  Settings,
  Trash2,
  AlertCircle,
  Clock,
  RefreshCw,
  Layers,
  Plus,
  Link,
  Database,
  Sparkles,
  Wand2,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { getSuggestedColumns } from './services/smartDefaults';
import { motion, AnimatePresence } from 'motion/react';

const DATA_TYPES: DataType[] = ['uuid', 'string', 'integer', 'decimal', 'boolean', 'timestamp', 'email', 'name', 'phone', 'enum'];

const STRATEGY_LABELS: Record<string, string> = {
  uuid: 'UUID',
  name: 'Full Name',
  email: 'Email Address',
  phone: 'Phone Number',
  timestamp: 'Timestamp',
  past_date: 'Past Date',
  future_date: 'Future Date',
  integer: 'Integer Range',
  auto_increment: 'Auto Increment',
  decimal: 'Decimal Range',
  boolean: 'Boolean',
  enum: 'Enum Values',
  random_string: 'Random String',
  company_name: 'Company Name',
};

export default function Inspector() {
  const {
    tables,
    selectedTableId,
    selectedColumnId,
    updateTable,
    updateColumn,
    removeColumn,
    simulation,
    updateSimulation,
    createRelationshipWithFK,
    relationships,
    selectedRelationshipId,
    updateRelationship,
    removeRelationship,
    bulkAddColumns,
    setSelected,
  } = useSchemaStore();

  const [showRelDropdown, setShowRelDropdown] = React.useState(false);

  React.useEffect(() => {
    setShowRelDropdown(false);
  }, [selectedTableId]);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const selectedColumn = selectedTable?.columns.find(c => c.id === selectedColumnId);
  const selectedRelationship = relationships.find(r => r.id === selectedRelationshipId);

  const availableStrategies = selectedColumn ? TYPE_STRATEGIES[selectedColumn.type] : [];

  const issues = useMemo(() =>
    validateSchema(tables, relationships, updateColumn),
  [tables, relationships, updateColumn]);

  // Smart suggestions for current table
  const suggestions = useMemo(() => {
    if (!selectedTable) return [];
    return getSuggestedColumns(selectedTable.name);
  }, [selectedTable]);

  const hasOnlyPK = selectedTable && selectedTable.columns.length <= 1 && selectedTable.columns.every(c => c.isPK);

  // ── Empty state (nothing selected) ──
  if (!selectedTable && !selectedRelationship) {
    return (
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Settings size={16} className="text-indigo-600" />
            RealityDB Studio
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-6">
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
              <Database size={24} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Ready to Design</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select a table or relationship to configure its properties.
            </p>
          </div>

          <div className="w-full space-y-3">
            <a
              href="/docs/README.md"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all text-left group"
            >
              <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <BookOpen size={16} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-800">User Guides</div>
                <div className="text-[10px] text-slate-400">Learn how to use the studio</div>
              </div>
            </a>
          </div>

          {issues.length > 0 && (
            <div className="w-full mt-8 space-y-4">
              <div className="flex items-center gap-2 px-1">
                <AlertCircle size={14} className="text-amber-500" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Realism Audit</h4>
              </div>
              <div className="space-y-2">
                {issues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm cursor-pointer ${
                      issue.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                      issue.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                      'bg-blue-50 border-blue-100 text-blue-800'
                    }`}
                    onClick={() => {
                      if (issue.tableId) setSelected(issue.tableId, issue.columnId || null);
                    }}
                  >
                    <div className="flex gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-semibold leading-tight">{issue.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] opacity-70 uppercase font-bold tracking-tighter">
                            {issue.type} - Click to inspect
                          </p>
                          {issue.fix && (
                            <button
                              onClick={(e) => { e.stopPropagation(); issue.fix(); }}
                              className="text-[9px] font-bold bg-white/50 px-1.5 py-0.5 rounded hover:bg-white transition-colors"
                            >
                              FIX
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="text-[10px] font-medium text-slate-400 text-center">
            RealityDB Studio
          </div>
        </div>
      </div>
    );
  }

  // ── Relationship selected ──
  if (selectedRelationship) {
    const sourceTable = tables.find(t => t.id === selectedRelationship.sourceTableId);
    const targetTable = tables.find(t => t.id === selectedRelationship.targetTableId);
    const color = SEMANTIC_COLORS[selectedRelationship.semantic || 'connection'];

    return (
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Link size={16} className="text-indigo-600" />
            Relationship Inspector
          </h2>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Connection</h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                <span className="text-xs font-semibold text-slate-700">{sourceTable?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                <span className="text-xs font-semibold text-slate-700">{targetTable?.name}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">System Semantic</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded border border-slate-100 bg-white shadow-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-bold text-slate-700 uppercase">{SEMANTIC_LABELS[selectedRelationship.semantic || 'connection']}</span>
              </div>

              <div className="grid grid-cols-1 gap-1">
                {(Object.entries(SEMANTIC_LABELS) as [RelationshipSemantic, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => updateRelationship(selectedRelationship.id, { semantic: key })}
                    className={`text-left px-3 py-2 text-[10px] font-medium rounded transition-all ${selectedRelationship.semantic === key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Behavior</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select
                  value={selectedRelationship.type}
                  onChange={(e) => updateRelationship(selectedRelationship.id, { type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="one-to-many">One-to-Many</option>
                  <option value="one-to-one">One-to-One</option>
                </select>
              </div>
            </div>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <button
              onClick={() => removeRelationship(selectedRelationship.id)}
              className="w-full flex items-center justify-center gap-2 p-2 text-red-600 hover:bg-red-50 rounded-md text-xs font-medium transition-all border border-transparent hover:border-red-100"
            >
              <Trash2 size={14} />
              DELETE RELATIONSHIP
            </button>
          </section>
        </div>
      </div>
    );
  }

  // ── Table selected ──
  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Settings size={16} className="text-indigo-600" />
          Inspector
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Table Properties */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Table Properties</h3>
            {selectedTable && hasOnlyPK && suggestions.length > 0 && (
              <button
                onClick={() => {
                  bulkAddColumns(selectedTable.id, suggestions);
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-all"
              >
                <Sparkles size={12} />
                ADD SUGGESTED
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Name</label>
              <input
                type="text"
                value={selectedTable!.name}
                onChange={(e) => updateTable(selectedTable!.id, { name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Description</label>
              <textarea
                value={selectedTable!.description || ''}
                onChange={(e) => updateTable(selectedTable!.id, { description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white text-slate-600 leading-relaxed"
                placeholder="Describe the purpose of this table..."
              />
            </div>
          </div>
        </section>

        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-600 mb-2">Relationships</label>
          <div className="relative">
            <button
              onClick={() => setShowRelDropdown(!showRelDropdown)}
              className="w-full py-3 px-4 bg-white border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm flex items-center justify-between transition-all shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-indigo-500" />
                <span>Create Relationship</span>
              </div>
              <span className="text-indigo-400 transition-transform">&rarr;</span>
            </button>

            <div className={`absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transition-all z-50 ${showRelDropdown ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <div className="p-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Select Target Table</p>
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {tables.filter(t => t.id !== selectedTable!.id).map(targetTable => (
                  <button
                    key={targetTable.id}
                    onClick={() => {
                      const targetPkCol = targetTable.columns.find(c => c.isPK);
                      if (targetPkCol) {
                        setShowRelDropdown(false);
                        createRelationshipWithFK({
                          sourceTableId: targetTable.id,
                          sourceColumnId: targetPkCol.id,
                          targetTableId: selectedTable!.id,
                          targetColumnId: null,
                          type: 'one-to-many',
                          createFKColumn: true,
                          fkColumnName: `${targetTable.name.replace(/s$/, '').toLowerCase()}_id`,
                          semantic: 'connection',
                        });
                      }
                    }}
                    className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center gap-3 transition-colors group/item"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover/item:bg-white transition-colors">
                      <Database size={14} className="text-slate-400 group-hover/item:text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 group-hover/item:text-indigo-700">{targetTable.name}</p>
                      <p className="text-[10px] text-slate-400">Add FK to {selectedTable!.name}</p>
                    </div>
                  </button>
                ))}
                {tables.length <= 1 && (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-400 italic">No other tables available to connect</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Column Properties */}
        {selectedColumn ? (
          <section className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Column Properties</h3>
              <button
                onClick={() => removeColumn(selectedTable!.id, selectedColumn.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                title="Delete Column"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Name</label>
                <input
                  type="text"
                  value={selectedColumn.name}
                  onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Data Type</label>
                <select
                  value={selectedColumn.type}
                  onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, { type: e.target.value as DataType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-700"
                >
                  {DATA_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-6 py-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedColumn.isPK ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                    {selectedColumn.isPK && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedColumn.isPK}
                    onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, { isPK: e.target.checked })}
                    className="hidden"
                  />
                  <span className="text-xs font-semibold text-slate-600">Primary Key</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedColumn.nullable ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                    {selectedColumn.nullable && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedColumn.nullable}
                    onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, { nullable: e.target.checked })}
                    className="hidden"
                  />
                  <span className="text-xs font-semibold text-slate-600">Nullable</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 size={12} className="text-indigo-500" />
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Realism Strategy</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Strategy</label>
                    <select
                      value={selectedColumn.strategy}
                      onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, { strategy: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium text-slate-700"
                    >
                      {availableStrategies.map(s => <option key={s} value={s}>{STRATEGY_LABELS[s] || s}</option>)}
                    </select>
                  </div>

                  {(selectedColumn.strategy === 'integer' || selectedColumn.strategy === 'decimal') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Min</label>
                        <input
                          type="number"
                          value={selectedColumn.options.min ?? ''}
                          onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, {
                            options: { ...selectedColumn.options, min: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Max</label>
                        <input
                          type="number"
                          value={selectedColumn.options.max ?? ''}
                          onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, {
                            options: { ...selectedColumn.options, max: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {selectedColumn.strategy === 'enum' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Values (comma separated)</label>
                        <input
                          type="text"
                          value={selectedColumn.options.values?.join(', ') ?? ''}
                          onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, {
                            options: { ...selectedColumn.options, values: e.target.value.split(',').map(v => v.trim()) }
                          })}
                          placeholder="active, inactive, pending"
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-slate-600">Distribution Weights (%)</label>
                          <span className="text-[10px] text-slate-400">Sum: {selectedColumn.options.weights?.reduce((a: number, b: number) => a + b, 0) || 0}%</span>
                        </div>
                        <div className="space-y-2">
                          {(selectedColumn.options.values || []).map((val: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 w-16 truncate">{val}</span>
                              <input
                                type="number"
                                value={selectedColumn.options.weights?.[idx] ?? ''}
                                onChange={(e) => {
                                  const newWeights = [...(selectedColumn.options.weights || [])];
                                  while (newWeights.length < (selectedColumn.options.values?.length || 0)) newWeights.push(0);
                                  newWeights[idx] = Number(e.target.value);
                                  updateColumn(selectedTable!.id, selectedColumn.id, {
                                    options: { ...selectedColumn.options, weights: newWeights }
                                  });
                                }}
                                className="flex-1 px-2 py-1 border border-slate-200 rounded text-[10px] outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Weight"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Temporal Rules */}
                  {(selectedColumn.type === 'timestamp') && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <Clock size={12} />
                        Temporal Logic
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Depends On</label>
                        <select
                          value={selectedColumn.options.dependsOn || ''}
                          onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, {
                            options: { ...selectedColumn.options, dependsOn: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">None</option>
                          {selectedTable!.columns
                            .filter(c => c.id !== selectedColumn.id && c.type === 'timestamp')
                            .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                          }
                        </select>
                      </div>
                      {selectedColumn.options.dependsOn && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Rule</label>
                          <select
                            value={selectedColumn.options.dependencyRule || 'after'}
                            onChange={(e) => updateColumn(selectedTable!.id, selectedColumn.id, {
                              options: { ...selectedColumn.options, dependencyRule: e.target.value as any }
                            })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            <option value="after">Must be AFTER</option>
                            <option value="before">Must be BEFORE</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lifecycle Rules */}
                  {selectedColumn.strategy === 'enum' && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <RefreshCw size={12} />
                        Lifecycle Semantics
                      </div>
                      <div className="space-y-4">
                        {(selectedColumn.options.values || []).map((val: string, idx: number) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">{val}</div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-600 mb-1">Nullify Fields</label>
                              <div className="flex flex-wrap gap-1">
                                {selectedTable!.columns
                                  .filter(c => c.id !== selectedColumn.id)
                                  .map(c => {
                                    const currentRules = selectedColumn.options.lifecycleRules || [];
                                    const rule = currentRules.find((r: any) => r.value === val);
                                    const isNulled = rule?.nullFields?.includes(c.name);

                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => {
                                          const newRules = [...currentRules];
                                          let ruleIdx = newRules.findIndex((r: any) => r.value === val);
                                          if (ruleIdx === -1) {
                                            newRules.push({ value: val, nullFields: [] });
                                            ruleIdx = newRules.length - 1;
                                          }

                                          const nullFields = newRules[ruleIdx].nullFields || [];
                                          if (isNulled) {
                                            newRules[ruleIdx].nullFields = nullFields.filter((f: string) => f !== c.name);
                                          } else {
                                            newRules[ruleIdx].nullFields = [...nullFields, c.name];
                                          }

                                          updateColumn(selectedTable!.id, selectedColumn.id, {
                                            options: { ...selectedColumn.options, lifecycleRules: newRules }
                                          });
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${
                                          isNulled
                                            ? 'bg-red-50 border-red-200 text-red-600'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                      >
                                        {c.name}
                                      </button>
                                    );
                                  })
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex flex-col items-center justify-center p-4 text-center mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-2">
                <Settings size={20} />
              </div>
              <h3 className="text-xs font-bold text-slate-700 uppercase">System Simulation</h3>
              <p className="text-[10px] text-slate-400">Global engine parameters</p>
            </div>

            <div className="space-y-4 px-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                <RefreshCw size={12} />
                Engine Config
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deterministic Seed</label>
                <input
                  type="number"
                  value={simulation.seed}
                  onChange={(e) => updateSimulation({ seed: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Timeline Duration (Days)</label>
                <input
                  type="number"
                  value={simulation.timelineDays}
                  onChange={(e) => updateSimulation({ timelineDays: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <details className="pt-2">
                <summary className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none">
                  <Layers size={12} />
                  Advanced: Growth Dynamics
                </summary>
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Growth Curve</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['linear', 'exponential', 'logarithmic', 's-curve'] as const).map(curve => (
                        <button
                          key={curve}
                          onClick={() => updateSimulation({ growthCurve: curve })}
                          className={`px-2 py-2 text-[10px] font-bold uppercase rounded border transition-all ${
                            simulation.growthCurve === curve
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {curve}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Anomaly Injection Rate</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simulation.anomalyRate * 100}
                      onChange={(e) => updateSimulation({ anomalyRate: parseInt(e.target.value) / 100 })}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Stable</span>
                      <span>{(simulation.anomalyRate * 100).toFixed(0)}% Chaos</span>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
