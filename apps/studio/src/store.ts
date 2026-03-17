import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Table, Column, Relationship, SimulationConfig, DataType, GrowthCurve, RealityTemplate, RelationshipSemantic } from './types';
import { inferColumnDefaults } from './services/smartDefaults';

export { type Table, type Column, type Relationship, type SimulationConfig, type DataType, type GrowthCurve };

export const TYPE_STRATEGIES: Record<DataType, string[]> = {
  uuid: ['uuid'],
  string: ['random_string', 'name', 'company_name', 'email', 'phone', 'enum'],
  integer: ['integer', 'auto_increment'],
  decimal: ['decimal'],
  boolean: ['boolean'],
  timestamp: ['timestamp', 'past_date', 'future_date'],
  email: ['email'],
  name: ['name'],
  phone: ['phone'],
  enum: ['enum'],
};

// ---------------------------------------------------------------------------
// Lightweight seeded PRNG (replaces @faker-js/faker)
// ---------------------------------------------------------------------------
function createSeeded(seed: number) {
  let s = seed | 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  return {
    float: (min = 0, max = 1) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    bool: () => next() > 0.5,
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    uuid: () => {
      const hex = () => Math.floor(next() * 16).toString(16);
      return `${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`;
    },
  };
}

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'Sarah', 'Daniel', 'Emma', 'Chris', 'Olivia', 'Alex'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Lee'];
const COMPANIES = ['Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Co', 'Stark Industries', 'Wayne Enterprises', 'Cyberdyne', 'Aperture Science', 'Soylent Corp', 'Tyrell Corp'];
const DOMAINS = ['example.com', 'test.io', 'demo.org', 'mail.dev', 'acme.co'];

// ---------------------------------------------------------------------------

interface SchemaState {
  tables: Table[];
  relationships: Relationship[];
  simulation: SimulationConfig;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedRelationshipId: string | null;

  previewMode: 'table' | 'system' | 'forecast';
  selectedRootRecordId: string | null;

  calculateForecast: () => {
    totalRows: number;
    avgGrowthRate: number;
    tableForecasts: { tableName: string; rowCount: number; growthRate: number }[];
  };

  setPreviewMode: (mode: 'table' | 'system' | 'forecast') => void;
  setSelectedRootRecordId: (id: string | null) => void;
  updateSimulation: (updates: Partial<SimulationConfig>) => void;

  addTable: (table: Partial<Table>) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;

  addColumn: (tableId: string, column: Partial<Column>) => void;
  bulkAddColumns: (tableId: string, columns: Partial<Column>[]) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  removeColumn: (tableId: string, columnId: string) => void;

  addRelationship: (rel: Relationship) => void;
  createRelationshipWithFK: (params: {
    sourceTableId: string;
    sourceColumnId: string;
    targetTableId: string;
    targetColumnId: string | null;
    type: 'one-to-many' | 'one-to-one';
    createFKColumn: boolean;
    fkColumnName?: string;
    semantic?: RelationshipSemantic;
  }) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  removeRelationship: (id: string) => void;

  setSelected: (tableId: string | null, columnId: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  loadTemplate: (template: RealityTemplate) => void;
  importSchema: (tables: Table[], relationships: Relationship[]) => void;
}

export const useSchemaStore = create<SchemaState>()(
  persist(
    (set, get) => ({
      tables: [],
      relationships: [],
      simulation: {
        seed: 42,
        timelineDays: 365,
        growthCurve: 's-curve',
        anomalyRate: 0.05,
      },
      selectedTableId: null,
      selectedColumnId: null,
      selectedRelationshipId: null,
      previewMode: 'table',
      selectedRootRecordId: null,

      setPreviewMode: (mode) => set({ previewMode: mode }),
      setSelectedRootRecordId: (id) => set({ selectedRootRecordId: id }),

      loadTemplate: (template) => set({
        tables: template.tables,
        relationships: template.relationships,
        simulation: template.simulation,
        selectedTableId: null,
        selectedColumnId: null,
        selectedRelationshipId: null,
        selectedRootRecordId: null,
        previewMode: 'table',
      }),

      importSchema: (tables, relationships) => set({
        tables,
        relationships,
        selectedTableId: null,
        selectedColumnId: null,
        selectedRelationshipId: null,
        selectedRootRecordId: null,
        previewMode: 'table',
      }),

      calculateForecast: () => {
        const { tables, simulation, relationships } = get();
        const days = simulation.timelineDays;
        const curve = simulation.growthCurve;

        let totalRows = 0;
        const tableForecasts = tables.map(table => {
          const isRoot = !relationships.some(r => r.targetTableId === table.id);
          let baseRows = isRoot ? 1000 : 0;

          if (!isRoot) {
            const parentRels = relationships.filter(r => r.targetTableId === table.id);
            parentRels.forEach(rel => {
              const parentTable = tables.find(t => t.id === rel.sourceTableId);
              if (parentTable) {
                const parentBase = 1000;
                baseRows += parentBase * (rel.type === 'one-to-many' ? 4 : 1);
              }
            });
          }
          if (baseRows === 0) baseRows = 500;

          let multiplier = 1;
          if (curve === 'linear') multiplier = 1.0;
          if (curve === 'exponential') multiplier = Math.pow(1.05, days / 30);
          if (curve === 'logarithmic') multiplier = Math.log10(days + 10);
          if (curve === 's-curve') multiplier = 1 / (1 + Math.exp(-((days - 180) / 60))) * 5;

          const rowCount = Math.floor(baseRows * multiplier);
          const growthRate = Math.floor(multiplier * 15);
          totalRows += rowCount;

          return { tableName: table.name, rowCount, growthRate };
        });

        return {
          totalRows,
          avgGrowthRate: Math.floor(tableForecasts.reduce((acc, f) => acc + f.growthRate, 0) / (tables.length || 1)),
          tableForecasts,
        };
      },

      updateSimulation: (updates) => set((state) => ({
        simulation: { ...state.simulation, ...updates },
      })),

      addTable: (table) => set((state) => {
        const tableCount = state.tables.length;
        const GRID_COLS = 5;
        const defaultPos = {
          x: 100 + (tableCount % GRID_COLS) * 300,
          y: 100 + Math.floor(tableCount / GRID_COLS) * 280,
        };

        const newTable: Table = {
          id: crypto.randomUUID(),
          name: table.name || `table_${tableCount + 1}`,
          columns: [],
          position: defaultPos,
          ...table,
        };

        // Auto-add a UUID PK column if no columns provided or no PK exists
        const hasPK = newTable.columns.some(c => c.isPK);
        if (!hasPK) {
          newTable.columns = [
            {
              id: crypto.randomUUID(),
              name: 'id',
              type: 'uuid',
              isPK: true,
              isFK: false,
              nullable: false,
              strategy: 'uuid',
              options: {},
            },
            ...newTable.columns,
          ];
        }

        // Ensure all columns have IDs and default values
        newTable.columns = newTable.columns.map(c => ({
          id: crypto.randomUUID(),
          name: 'new_column',
          type: 'string' as DataType,
          isPK: false,
          isFK: false,
          nullable: false,
          strategy: 'random_string',
          options: {},
          ...c,
        }));

        return { tables: [...state.tables, newTable] };
      }),

      updateTable: (id, updates) => set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),

      removeTable: (id) => set((state) => ({
        tables: state.tables.filter((t) => t.id !== id),
        relationships: state.relationships.filter((r) => r.sourceTableId !== id && r.targetTableId !== id),
        selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
      })),

      addColumn: (tableId, column) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            const name = column.name || 'new_column';

            // Auto-infer strategy from column name if not explicitly set
            let inferredType = column.type;
            let inferredStrategy = column.strategy;
            let inferredOptions = column.options;
            if (!column.strategy || column.strategy === 'random_string') {
              const defaults = inferColumnDefaults(name);
              if (defaults) {
                inferredType = inferredType || defaults.type;
                inferredStrategy = defaults.strategy;
                if (defaults.options) inferredOptions = { ...defaults.options, ...inferredOptions };
              }
            }

            const strategy = inferredStrategy || 'random_string';

            // Semantic Duplicate Protection
            const semanticSingletons = ['uuid', 'email', 'name', 'phone'];
            const isSemanticDuplicate = t.columns.some(c =>
              (c.name === name && c.strategy === strategy) ||
              (semanticSingletons.includes(strategy) && c.strategy === strategy)
            );
            if (isSemanticDuplicate && strategy !== 'random_string') return t;

            // Duplicate name protection
            const isNameDuplicate = t.columns.some(c => c.name === name);
            const finalName = isNameDuplicate ? `${name}_${t.columns.length}` : name;

            return {
              ...t,
              columns: [
                ...t.columns,
                {
                  id: crypto.randomUUID(),
                  name: finalName,
                  type: (inferredType || 'string') as DataType,
                  isPK: strategy === 'uuid',
                  isFK: false,
                  nullable: false,
                  ...column,
                  name: finalName,
                  strategy,
                  options: inferredOptions || {},
                },
              ],
            };
          }
          return t;
        }),
      })),

      bulkAddColumns: (tableId, columns) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            const newCols = columns.map(col => ({
              id: crypto.randomUUID(),
              name: col.name,
              type: col.type || 'string' as DataType,
              isPK: col.strategy === 'uuid',
              isFK: false,
              nullable: false,
              strategy: col.strategy || 'random_string',
              options: col.options || {},
              ...col,
            }));

            const existingNames = new Set(t.columns.map(c => c.name));
            const filteredNewCols = newCols.filter(c => !existingNames.has(c.name!));

            return {
              ...t,
              columns: [...t.columns, ...filteredNewCols] as Column[],
            };
          }
          return t;
        }),
      })),

      updateColumn: (tableId, columnId, updates) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            if (updates.name) {
              const isNameDuplicate = t.columns.some(c => c.id !== columnId && c.name === updates.name);
              if (isNameDuplicate) return t;
            }

            if (updates.strategy) {
              const semanticSingletons = ['uuid', 'email', 'name', 'phone'];
              if (semanticSingletons.includes(updates.strategy)) {
                const isSemanticDuplicate = t.columns.some(c =>
                  c.id !== columnId && c.strategy === updates.strategy
                );
                if (isSemanticDuplicate) return t;
              }
            }

            return {
              ...t,
              columns: t.columns.map((c) => {
                if (c.id === columnId) {
                  const newCol = { ...c, ...updates };
                  if (updates.type && !TYPE_STRATEGIES[updates.type].includes(newCol.strategy)) {
                    newCol.strategy = TYPE_STRATEGIES[updates.type][0];
                  }
                  // Re-infer strategy when column name changes and current strategy is generic
                  if (updates.name && (newCol.strategy === 'random_string')) {
                    const defaults = inferColumnDefaults(updates.name);
                    if (defaults) {
                      newCol.type = defaults.type;
                      newCol.strategy = defaults.strategy;
                      if (defaults.options) newCol.options = { ...newCol.options, ...defaults.options };
                    }
                  }
                  return newCol;
                }
                return c;
              }),
            };
          }
          return t;
        }),
      })),

      removeColumn: (tableId, columnId) => set((state) => ({
        tables: state.tables.map((t) => {
          if (t.id === tableId) {
            return { ...t, columns: t.columns.filter((c) => c.id !== columnId) };
          }
          return t;
        }),
        relationships: state.relationships.filter((r) =>
          !(r.sourceTableId === tableId && r.sourceColumnId === columnId) &&
          !(r.targetTableId === tableId && r.targetColumnId === columnId)
        ),
      })),

      addRelationship: (rel) => set((state) => ({
        relationships: [...state.relationships, rel],
      })),

      createRelationshipWithFK: ({ sourceTableId, sourceColumnId, targetTableId, targetColumnId, type, createFKColumn, fkColumnName, semantic }) => set((state) => {
        let finalTargetColumnId = targetColumnId;
        const sourceTable = state.tables.find(t => t.id === sourceTableId);
        const sourceColumn = sourceTable?.columns.find(c => c.id === sourceColumnId);

        const newTables = [...state.tables];

        if (createFKColumn && sourceTable && sourceColumn) {
          const targetTableIndex = newTables.findIndex(t => t.id === targetTableId);
          if (targetTableIndex !== -1) {
            const targetTable = newTables[targetTableIndex];
            const name = fkColumnName || `${sourceTable.name.replace(/s$/, '')}_${sourceColumn.name}`;

            // Duplicate FK column prevention: reuse existing column pointing to same source
            const existingFK = targetTable.columns.find(c =>
              c.isFK && c.fkTarget?.tableId === sourceTableId && c.fkTarget?.columnId === sourceColumnId
            );

            if (existingFK) {
              finalTargetColumnId = existingFK.id;
            } else {
              const newColumnId = crypto.randomUUID();
              newTables[targetTableIndex] = {
                ...targetTable,
                columns: [
                  ...targetTable.columns,
                  {
                    id: newColumnId,
                    name,
                    type: sourceColumn.type,
                    isPK: false,
                    isFK: true,
                    fkTarget: { tableId: sourceTableId, columnId: sourceColumnId },
                    nullable: true,
                    strategy: sourceColumn.strategy,
                    options: { ...sourceColumn.options },
                  },
                ],
              };
              finalTargetColumnId = newColumnId;
            }
          }
        }

        if (!finalTargetColumnId) return { tables: newTables };

        const newRelationship: Relationship = {
          id: crypto.randomUUID(),
          sourceTableId,
          sourceColumnId,
          targetTableId,
          targetColumnId: finalTargetColumnId,
          type,
          semantic: semantic || 'connection',
        };

        return {
          tables: newTables,
          relationships: [...state.relationships, newRelationship],
        };
      }),

      removeRelationship: (id) => set((state) => ({
        relationships: state.relationships.filter((r) => r.id !== id),
        selectedRelationshipId: state.selectedRelationshipId === id ? null : state.selectedRelationshipId,
      })),

      updateRelationship: (id, updates) => set((state) => ({
        relationships: state.relationships.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),

      setSelected: (tableId, columnId) => set({
        selectedTableId: tableId,
        selectedColumnId: columnId,
        selectedRelationshipId: null,
      }),
      setSelectedRelationship: (id) => set({
        selectedRelationshipId: id,
        selectedTableId: null,
        selectedColumnId: null,
      }),
    }),
    {
      name: 'reality-db-storage',
    }
  )
);

export const validateSchema = (tables: Table[], relationships: Relationship[], updateColumn: any) => {
  const issues: any[] = [];

  tables.forEach(table => {
    const hasPK = table.columns.some(c => c.isPK);
    if (!hasPK) {
      issues.push({
        id: `missing-pk-${table.id}`,
        type: 'error',
        message: `Table "${table.name}" has no primary key.`,
        tableId: table.id,
      });
    }

    const fkTargets = new Set<string>();

    table.columns.forEach(col => {
      if (col.isFK && !col.fkTarget) {
        issues.push({
          id: `incomplete-fk-${table.id}-${col.id}`,
          type: 'error',
          message: `Column "${col.name}" in "${table.name}" is marked as FK but has no target.`,
          tableId: table.id,
          columnId: col.id,
        });
      }

      if (col.fkTarget) {
        const targetKey = col.fkTarget.tableId;
        if (fkTargets.has(targetKey)) {
          issues.push({
            id: `duplicate-fk-${table.id}-${targetKey}`,
            type: 'warning',
            message: `Table "${table.name}" has multiple FKs pointing to the same target table.`,
            tableId: table.id,
            columnId: col.id,
          });
        }
        fkTargets.add(targetKey);

        const hasRel = relationships.some(r =>
          r.targetTableId === table.id && r.targetColumnId === col.id
        );
        if (!hasRel) {
          issues.push({
            id: `missing-rel-${table.id}-${col.id}`,
            type: 'warning',
            message: `FK column "${col.name}" exists but no relationship is defined.`,
            tableId: table.id,
            columnId: col.id,
          });
        }
      }

      if (col.name.toLowerCase().includes('name') && col.strategy === 'random_string') {
        issues.push({
          id: `semantic-mismatch-${table.id}-${col.id}`,
          type: 'info',
          message: `Column "${col.name}" could use a more specific strategy like "name" or "company_name".`,
          tableId: table.id,
          columnId: col.id,
          fix: () => {
            const strategy = col.name.toLowerCase().includes('company') ? 'company_name' : 'name';
            updateColumn(table.id, col.id, { strategy });
          },
        });
      }
    });
  });

  return issues;
};

// ---------------------------------------------------------------------------
// Ghost Row Generation (lightweight, no faker)
// ---------------------------------------------------------------------------
export const generateGhostRows = (table: Table, count: number = 5, allTables: Table[], projectContext: Record<string, any[]> = {}) => {
  const rng = createSeeded(table.id.charCodeAt(0) * 31 + table.id.charCodeAt(1));
  const rows: any[] = [];

  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = { id_index: i };

    // First pass: non-dependent values
    table.columns.forEach((col) => {
      if (!col.options.dependsOn) {
        row[col.name] = generateValue(col, allTables, projectContext, row, rng);
      }
    });

    // Second pass: dependent values
    table.columns.forEach((col) => {
      if (col.options.dependsOn) {
        row[col.name] = generateValue(col, allTables, projectContext, row, rng);
      }
    });

    // Third pass: lifecycle constraints
    table.columns.forEach((col) => {
      if (col.strategy === 'enum' && col.options.lifecycleRules) {
        const val = row[col.name];
        const rule = col.options.lifecycleRules.find((r: any) => r.value === val);
        if (rule?.nullFields) {
          rule.nullFields.forEach((fieldName: string) => {
            row[fieldName] = null;
          });
        }
      }
    });

    rows.push(row);
  }
  return rows;
};

const generateValue = (
  col: Column,
  allTables: Table[],
  projectContext: Record<string, any[]>,
  currentRow: Record<string, any>,
  rng: ReturnType<typeof createSeeded>
) => {
  if (col.isFK && col.fkTarget) {
    const targetTableData = projectContext[col.fkTarget.tableId];
    if (targetTableData && targetTableData.length > 0) {
      const randomRow = rng.pick(targetTableData);
      const targetTable = allTables.find(t => t.id === col.fkTarget?.tableId);
      const targetCol = targetTable?.columns.find(c => c.id === col.fkTarget?.columnId);
      if (targetCol) return randomRow[targetCol.name];
    }
    return `ref(${col.fkTarget.tableId.slice(0, 4)})`;
  }

  // Temporal dependency
  if (col.options.dependsOn) {
    const baseValue = currentRow[col.options.dependsOn];
    if (baseValue && (col.strategy === 'timestamp' || col.strategy === 'future_date' || col.strategy === 'past_date')) {
      const baseDate = new Date(baseValue);
      const offsetDays = rng.int(1, 90);
      if (col.options.dependencyRule === 'after') {
        return new Date(baseDate.getTime() + offsetDays * 86400000).toISOString().split('T')[0];
      } else if (col.options.dependencyRule === 'before') {
        return new Date(baseDate.getTime() - offsetDays * 86400000).toISOString().split('T')[0];
      }
    }
  }

  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);

  switch (col.strategy) {
    case 'uuid': return rng.uuid();
    case 'name': return `${first} ${last}`;
    case 'company_name': return rng.pick(COMPANIES);
    case 'email': return `${first.toLowerCase()}.${last.toLowerCase()}@${rng.pick(DOMAINS)}`;
    case 'phone': return `+1${rng.int(200, 999)}${rng.int(100, 999)}${rng.int(1000, 9999)}`;
    case 'timestamp': {
      const d = new Date(Date.now() - rng.int(0, 365) * 86400000);
      return d.toISOString().split('T')[0];
    }
    case 'past_date': {
      const d = new Date(Date.now() - rng.int(30, 730) * 86400000);
      return d.toISOString().split('T')[0];
    }
    case 'future_date': {
      const d = new Date(Date.now() + rng.int(1, 365) * 86400000);
      return d.toISOString().split('T')[0];
    }
    case 'integer': return rng.int(col.options.min ?? 1, col.options.max ?? 1000);
    case 'auto_increment': return (currentRow.id_index || 0) + 1;
    case 'decimal': {
      const val = rng.float(col.options.min ?? 1, col.options.max ?? 1000);
      return Math.round(val * 100) / 100;
    }
    case 'boolean': return rng.bool();
    case 'enum': {
      const vals = col.options.values || ['active', 'inactive', 'pending'];
      const weights = col.options.weights || [];
      if (weights.length === vals.length && weights.length > 0) {
        const totalWeight = weights.reduce((a: number, b: number) => a + b, 0);
        let r = rng.float(0, totalWeight);
        for (let i = 0; i < vals.length; i++) {
          if (r < weights[i]) return vals[i];
          r -= weights[i];
        }
      }
      return rng.pick(vals);
    }
    default: {
      const words = ['alpha', 'beta', 'gamma', 'delta', 'sigma', 'omega', 'nova', 'flux', 'core', 'node'];
      return rng.pick(words);
    }
  }
};
