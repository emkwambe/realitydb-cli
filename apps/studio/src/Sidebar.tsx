import React from 'react';
import { useSchemaStore } from './store';
import { DataType } from './types';
import { REALITY_TEMPLATES } from './templates';
import { 
  Plus, 
  ShoppingBag, 
  Mail, 
  Hash, 
  Calendar, 
  Type,
  Layout,
  Briefcase,
  Phone,
  CheckSquare,
  Globe,
  Shield,
  Cpu,
  GraduationCap,
  Stethoscope,
  Truck,
  CreditCard,
  Rocket,
  Activity
} from 'lucide-react';

export default function Sidebar() {
  const { addTable, addColumn, selectedTableId, loadTemplate } = useSchemaStore();

  const quickFields = [
    { name: 'id', type: 'uuid', strategy: 'uuid', icon: <Hash size={14} /> },
    { name: 'email', type: 'email', strategy: 'email', icon: <Mail size={14} /> },
    { name: 'name', type: 'name', strategy: 'name', icon: <Type size={14} /> },
    { name: 'phone', type: 'phone', strategy: 'phone', icon: <Phone size={14} /> },
    { name: 'created_at', type: 'timestamp', strategy: 'past_date', icon: <Calendar size={14} /> },
    { name: 'status', type: 'enum', strategy: 'enum', icon: <CheckSquare size={14} /> },
  ];

  const categoryIcons: Record<string, React.ReactNode> = {
    'Startup': <Rocket size={16} />,
    'Commerce': <ShoppingBag size={16} />,
    'Finance': <CreditCard size={16} />,
    'Operations': <Truck size={16} />,
    'Public Sector': <Stethoscope size={16} />,
    'Security': <Shield size={16} />,
    'AI': <Cpu size={16} />,
  };

  const categoryColors: Record<string, string> = {
    'Startup': 'bg-indigo-50 text-indigo-600',
    'Commerce': 'bg-emerald-50 text-emerald-600',
    'Finance': 'bg-amber-50 text-amber-600',
    'Operations': 'bg-blue-50 text-blue-600',
    'Public Sector': 'bg-rose-50 text-rose-600',
    'Security': 'bg-slate-100 text-slate-600',
    'AI': 'bg-purple-50 text-purple-600',
  };

  const groupedTemplates = REALITY_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof REALITY_TEMPLATES>);

  return (
    <div className="w-64 border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto scrollbar-hide">
      <div className="p-4 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layout size={16} className="text-indigo-600" />
          Workspace
        </h2>
      </div>

      <div className="p-4 space-y-8">
        {/* Actions */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
          <button 
            onClick={() => addTable({})}
            className="w-full flex items-center justify-center gap-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium transition-all shadow-sm"
          >
            <Plus size={14} />
            NEW TABLE
          </button>
        </section>

        {/* Domain Templates */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Domain Templates</h3>
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {categoryIcons[category]}
                  {category}
                </div>
                <div className="space-y-1">
                  {templates.map(template => (
                    <button 
                      key={template.name}
                      onClick={() => {
                        if (confirm(`Load "${template.name}" template? This will replace your current schema.`)) {
                          loadTemplate(template);
                        }
                      }}
                      className="w-full flex flex-col p-2 text-left hover:bg-slate-50 rounded-md border border-transparent hover:border-slate-100 transition-all group"
                    >
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">{template.name}</span>
                      <span className="text-[9px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{template.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Fields */}
        <section>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Fields</h3>
          <div className="grid grid-cols-1 gap-1">
            {quickFields.map((field) => (
              <button 
                key={field.name}
                disabled={!selectedTableId}
                onClick={() => {
                  if (selectedTableId) {
                    addColumn(selectedTableId, { name: field.name, type: field.type as DataType, strategy: field.strategy });
                  }
                }}
                className={`flex items-center gap-2 p-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md transition-all group ${!selectedTableId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{field.icon}</span>
                {field.name.toUpperCase()}
              </button>
            ))}
          </div>
          {!selectedTableId && (
            <p className="text-[10px] text-slate-400 mt-2 italic">Select a table to add fields</p>
          )}
        </section>
      </div>
    </div>
  );
}
