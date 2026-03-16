import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Handle, 
  Position, 
  NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  MarkerType,
  EdgeProps,
  getBezierPath
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSchemaStore } from './store';
import { Table, Column, SEMANTIC_COLORS, SEMANTIC_LABELS, RelationshipSemantic, Relationship } from './types';
import { Database, Plus, Trash2, Key, Link, X, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TableNode = ({ data, selected }: NodeProps<Table>) => {
  const { setSelected, addColumn, removeTable, selectedRelationshipId, relationships } = useSchemaStore();
  
  const selectedRel = relationships.find(r => r.id === selectedRelationshipId);
  const isRelatedSource = selectedRel?.sourceTableId === data.id;
  const isRelatedTarget = selectedRel?.targetTableId === data.id;

  return (
    <div 
      className={`react-flow__node-table overflow-hidden transition-all ${selected ? 'ring-2 ring-indigo-500' : ''} ${isRelatedSource || isRelatedTarget ? 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''}`}
      onClick={() => setSelected(data.id, null)}
    >
      <div className="bg-slate-50 border-bottom border-slate-200 p-3 flex items-center justify-between relative">
        <Handle 
          type="target" 
          position={Position.Left} 
          id="table-target" 
          className="!w-3 !h-3 !bg-indigo-400 !-left-1.5" 
        />
        <div className="flex items-center gap-2">
          <Database size={16} className="text-indigo-600" />
          <span className="font-semibold text-slate-800 text-sm">{data.name}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); removeTable(data.id); }}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="p-2 space-y-1">
        {data.columns.map((col) => {
          const isSelectedCol = (isRelatedSource && selectedRel?.sourceColumnId === col.id) || 
                               (isRelatedTarget && selectedRel?.targetColumnId === col.id);
          
          return (
            <div 
              key={col.id}
              className={`flex items-center justify-between p-1.5 rounded hover:bg-slate-50 cursor-pointer group relative transition-colors ${isSelectedCol ? 'bg-purple-50 text-purple-700' : ''}`}
              onClick={(e) => { e.stopPropagation(); setSelected(data.id, col.id); }}
            >
              <Handle 
                type="target" 
                position={Position.Left} 
                id={col.id} 
                className="!w-2 !h-2 !bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity !-left-1" 
              />
              <div className="flex items-center gap-2">
                {col.isPK && <Key size={12} className={isSelectedCol ? 'text-purple-500' : 'text-amber-500'} />}
                {col.isFK && <Link size={12} className={isSelectedCol ? 'text-purple-500' : 'text-indigo-500'} />}
                <span className={`text-xs font-medium ${isSelectedCol ? 'text-purple-700' : 'text-slate-700'}`}>{col.name}</span>
              </div>
              <span className={`text-[10px] uppercase font-mono ${isSelectedCol ? 'text-purple-400' : 'text-slate-400'}`}>{col.type}</span>
              {col.isPK && (
                <Handle 
                  type="source" 
                  position={Position.Right} 
                  id={col.id} 
                  className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-white !-right-1.25 shadow-sm" 
                />
              )}
            </div>
          );
        })}
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); addColumn(data.id, { name: `col_${data.columns.length + 1}` }); }}
        className="w-full p-2 text-[10px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1 border-t border-slate-100 transition-all"
      >
        <Plus size={12} />
        ADD COLUMN
      </button>
    </div>
  );
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isHovered, setIsHovered] = useState(false);
  const semantic = data?.semantic as RelationshipSemantic || 'connection';
  const color = SEMANTIC_COLORS[semantic];
  const label = SEMANTIC_LABELS[semantic];

  return (
    <>
      <path
        id={id}
        style={{ ...style, stroke: color, strokeWidth: isHovered ? 4 : 2 }}
        className="react-flow__edge-path transition-all duration-300"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <AnimatePresence>
        {isHovered && (
          <foreignObject
            width={200}
            height={80}
            x={labelX - 100}
            y={labelY - 40}
            className="pointer-events-none overflow-visible"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="bg-slate-900 text-white p-2.5 rounded-lg shadow-2xl text-[10px] flex flex-col gap-2 border border-slate-700 backdrop-blur-md bg-opacity-95 min-w-[160px]"
            >
              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-bold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px]">
                  <span>{data?.sourceName}</span>
                  <span>→</span>
                  <span>{data?.targetName}</span>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {semantic === 'trigger' && 'When source record is created, target records may be generated.'}
                {semantic === 'temporal' && 'Target record timestamps are logically dependent on source.'}
                {semantic === 'lifecycle' && 'State changes in source affect target record availability.'}
                {semantic === 'risk' && 'Source behavior may trigger anomaly or fraud flags in target.'}
                {semantic === 'activity' && 'Source user actions generate target event stream data.'}
                {semantic === 'connection' && 'Standard relational link between tables.'}
              </p>
            </motion.div>
          </foreignObject>
        )}
      </AnimatePresence>
    </>
  );
};

const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const Legend = () => (
  <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md p-3 rounded-lg border border-slate-200 shadow-lg z-10 space-y-2">
    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">System Semantics</h4>
    <div className="grid grid-cols-1 gap-2">
      {(Object.entries(SEMANTIC_LABELS) as [RelationshipSemantic, string][]).map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: SEMANTIC_COLORS[key] }} />
          <span className="text-[10px] font-medium text-slate-600">{label}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function SchemaCanvas() {
  const { tables, relationships, updateTable, createRelationshipWithFK, selectedRelationshipId, setSelectedRelationship } = useSchemaStore();
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [relType, setRelType] = useState<'one-to-many' | 'one-to-one'>('one-to-many');
  const [semantic, setSemantic] = useState<RelationshipSemantic>('connection');
  const [createFK, setCreateFK] = useState(true);
  const [customFKName, setCustomFKName] = useState('');

  const nodes = useMemo(() => tables.map(t => ({
    id: t.id,
    type: 'table',
    position: t.position,
    data: t,
  })), [tables]);

  const edges = useMemo(() => relationships.map(r => {
    const isSelected = r.id === selectedRelationshipId;
    const color = SEMANTIC_COLORS[r.semantic || 'connection'];
    const sourceTable = tables.find(t => t.id === r.sourceTableId);
    const targetTable = tables.find(t => t.id === r.targetTableId);
    
    return {
      id: r.id,
      type: 'custom',
      source: r.sourceTableId,
      target: r.targetTableId,
      sourceHandle: r.sourceColumnId,
      targetHandle: r.targetColumnId,
      data: { 
        semantic: r.semantic,
        sourceName: sourceTable?.name || 'Unknown',
        targetName: targetTable?.name || 'Unknown'
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: isSelected ? '#a855f7' : color },
      style: { 
        stroke: isSelected ? '#a855f7' : color, 
        strokeWidth: isSelected ? 3 : 2,
        filter: isSelected ? 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' : 'none'
      },
      animated: isSelected || r.semantic === 'trigger' || r.semantic === 'activity',
    };
  }), [relationships, selectedRelationshipId]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: any) => {
    setSelectedRelationship(edge.id);
  }, [setSelectedRelationship]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        updateTable(change.id, { position: change.position });
      }
    });
  }, [updateTable]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // We don't currently store edge positions/state externally beyond the relationship itself
    // but handling this prevents ReactFlow from complaining or looping on selection
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setPendingConnection(params);
    
    // Set default FK name
    const sourceTable = tables.find(t => t.id === params.source);
    const sourceColumn = sourceTable?.columns.find(c => c.id === params.sourceHandle);
    const targetTable = tables.find(t => t.id === params.target);
    const targetColumn = targetTable?.columns.find(c => c.id === params.targetHandle);

    if (sourceTable && sourceColumn) {
      const baseName = sourceTable.name.replace(/s$/, '').toLowerCase();
      const colName = (targetColumn && targetColumn.id !== 'table-target' ? targetColumn.name : sourceColumn.name).toLowerCase();
      setCustomFKName(`${baseName}_${colName}`);
    }

    // Infer semantic
    if (targetTable) {
      const name = targetTable.name.toLowerCase();
      if (name.includes('shipment') || name.includes('payment') || name.includes('billing')) {
        setSemantic('trigger');
      } else if (name.includes('alert') || name.includes('fraud') || name.includes('risk')) {
        setSemantic('risk');
      } else if (name.includes('event') || name.includes('log') || name.includes('activity')) {
        setSemantic('activity');
      } else if (name.includes('subscription') || name.includes('enrollment')) {
        setSemantic('lifecycle');
      } else {
        setSemantic('connection');
      }
    }
  }, [tables]);

  const confirmRelationship = () => {
    if (pendingConnection && pendingConnection.source && pendingConnection.target) {
      createRelationshipWithFK({
        sourceTableId: pendingConnection.source,
        sourceColumnId: pendingConnection.sourceHandle || '',
        targetTableId: pendingConnection.target,
        targetColumnId: pendingConnection.targetHandle === 'table-target' ? null : (pendingConnection.targetHandle || null),
        type: relType,
        createFKColumn: createFK,
        fkColumnName: customFKName,
        semantic: semantic
      });
    }
    setPendingConnection(null);
  };

  const sourceTable = tables.find(t => t.id === pendingConnection?.source);
  const targetTable = tables.find(t => t.id === pendingConnection?.target);
  const sourceColumn = sourceTable?.columns.find(c => c.id === pendingConnection?.sourceHandle);

  return (
    <div className="w-full h-full bg-slate-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>

      <Legend />

      <AnimatePresence>
        {pendingConnection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Link size={16} className="text-indigo-600" />
                  Create Relationship
                </h3>
                <button onClick={() => setPendingConnection(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Parent</p>
                    <p className="text-sm font-semibold text-slate-700">{sourceTable?.name}</p>
                    <p className="text-[10px] text-indigo-500 font-mono">{sourceColumn?.name}</p>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Child</p>
                    <p className="text-sm font-semibold text-slate-700">{targetTable?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">System Semantic</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.entries(SEMANTIC_LABELS) as [RelationshipSemantic, string][]).map(([key, label]) => (
                        <button 
                          key={key}
                          onClick={() => setSemantic(key)}
                          className={`p-2 text-[10px] font-bold uppercase rounded-md border transition-all flex items-center gap-2 ${semantic === key ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-inner' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEMANTIC_COLORS[key] }} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Relationship Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setRelType('one-to-many')}
                        className={`p-2 text-xs font-medium rounded-md border transition-all ${relType === 'one-to-many' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        One-to-Many
                      </button>
                      <button 
                        onClick={() => setRelType('one-to-one')}
                        className={`p-2 text-xs font-medium rounded-md border transition-all ${relType === 'one-to-one' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        One-to-One
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                      <input 
                        type="checkbox" 
                        checked={createFK}
                        onChange={(e) => setCreateFK(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Create Foreign Key Column</p>
                        <p className="text-[10px] text-slate-400">Automatically add a new column to {targetTable?.name}</p>
                      </div>
                    </label>

                    {createFK && (
                      <div className="px-3 pb-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Column Name</label>
                        <input 
                          type="text"
                          value={customFKName}
                          onChange={(e) => setCustomFKName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="e.g. user_id"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end gap-2">
                <button 
                  onClick={() => setPendingConnection(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRelationship}
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-2 shadow-sm"
                >
                  <Check size={14} />
                  Create Relationship
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
