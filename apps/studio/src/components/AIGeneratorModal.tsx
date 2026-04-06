import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useSchemaStore } from '../store';
import type { Table, Relationship } from '../types';

interface AIGeneratorModalProps {
  onClose: () => void;
}

type Complexity = 'simple' | 'standard' | 'complex';

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; range: string; hint: string }> = {
  simple: { label: 'Simple', range: '8-12', hint: '8–12 tables' },
  standard: { label: 'Standard', range: '14-20', hint: '14–20 tables' },
  complex: { label: 'Complex', range: '20-30', hint: '20–30 tables' },
};

const EXAMPLES = [
  'Hospital management system with patients, doctors, appointments, billing, pharmacy, lab results, insurance claims, and staff scheduling',
  'E-commerce marketplace with sellers, products, orders, payments, reviews, shipping, returns, coupons, and customer loyalty',
  'University system with students, courses, professors, departments, grades, scholarships, dorms, library, and research grants',
  'Supply chain with suppliers, warehouses, inventory, purchase orders, shipments, carriers, routes, and demand forecasting',
  'Banking platform with accounts, transactions, loans, credit cards, fraud detection, branches, ATMs, and customer service tickets',
];

function buildPrompt(userDescription: string, complexity: Complexity): string {
  const tableRange = COMPLEXITY_CONFIG[complexity].range;
  return `Generate a ${complexity} database schema (${tableRange} tables) for: ${userDescription}

Return ONLY valid JSON, no markdown, no explanation.

Format:
{"tables":[{"id":"tbl-01","name":"users","columns":[{"id":"tbl-01-c1","name":"id","type":"uuid","isPK":true,"isFK":false,"nullable":false,"strategy":"uuid","options":{}},{"id":"tbl-01-c2","name":"status","type":"enum","isPK":false,"isFK":false,"nullable":false,"strategy":"enum","options":{"values":["active","inactive"],"weights":[80,20],"lifecycleRules":[{"value":"inactive","nullFields":["last_login"]}]}},{"id":"tbl-01-c3","name":"org_id","type":"uuid","isPK":false,"isFK":true,"nullable":true,"strategy":"uuid","options":{},"fkTarget":{"tableId":"tbl-02","columnId":"tbl-02-c1"}},{"id":"tbl-01-c4","name":"created_at","type":"timestamp","isPK":false,"isFK":false,"nullable":false,"strategy":"timestamp","options":{}}],"position":{"x":0,"y":0}}],"relationships":[{"id":"rel-01","sourceTableId":"tbl-02","sourceColumnId":"tbl-02-c1","targetTableId":"tbl-01","targetColumnId":"tbl-01-c3","type":"one-to-many","semantic":"connection"}]}

Rules:
- Every table: id (uuid PK) + created_at (timestamp) minimum
- snake_case names. IDs: tbl-01, tbl-01-c1, rel-01
- Positions: {"x":(idx%4)*350,"y":Math.floor(idx/4)*250}
- Every column needs "options" field ({} if empty)
- FK columns: isFK:true + fkTarget:{tableId,columnId}
- Enums: include realistic weights + lifecycleRules where applicable
- Temporal deps: "options":{"dependsOn":"created_at","dependencyRule":"after"}
- Types: uuid,string,integer,decimal,boolean,timestamp,email,name,phone,enum
- Strategies: uuid,enum,integer,decimal,timestamp,past_date,future_date,email,company_name,name,phone,boolean,random_string
- Semantics: connection,trigger,temporal,lifecycle,risk,activity
- Cover: core entities, junction tables, audit tables, config tables`;
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

export default function AIGeneratorModal({ onClose }: AIGeneratorModalProps) {
  const [prompt, setPrompt] = useState('');
  const [complexity, setComplexity] = useState<Complexity>('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tables: number; relationships: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  const handleGenerate = async (isRetry?: boolean) => {
    if (!prompt.trim()) return;

    if (!apiKey) {
      setError('API key not configured. Add VITE_ANTHROPIC_API_KEY to .env');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsed(0);

    const startTime = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);

    let messageContent = buildPrompt(prompt, complexity);
    if (isRetry) {
      messageContent += '\n\nYour previous response was not valid JSON. Return ONLY the raw JSON object.';
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          messages: [{ role: 'user', content: messageContent }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API error (${response.status}): ${errBody.slice(0, 300)}`);
      }

      const data = await response.json();
      const rawText = data.content?.[0]?.text || '';
      const jsonStr = extractJSON(rawText);

      let parsed: { tables: Table[]; relationships: Relationship[] };
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        if (!isRetry) {
          clearInterval(timer);
          setLoading(false);
          setError('Failed to parse schema. Retrying...');
          setTimeout(() => handleGenerate(true), 500);
          return;
        }
        throw new Error('Failed to parse AI response as valid JSON. Please try again.');
      }

      if (!Array.isArray(parsed.tables) || parsed.tables.length === 0) {
        throw new Error('AI response did not contain a valid tables array.');
      }

      // Ensure every table has a position and every column has options
      parsed.tables = parsed.tables.map((t, index) => ({
        ...t,
        position: t.position && typeof t.position.x === 'number'
          ? t.position
          : { x: (index % 4) * 350, y: Math.floor(index / 4) * 250 },
        columns: (t.columns || []).map(c => ({
          ...c,
          options: c.options || {},
          isPK: c.isPK ?? false,
          isFK: c.isFK ?? false,
          nullable: c.nullable ?? false,
        })),
      }));

      const rels = Array.isArray(parsed.relationships) ? parsed.relationships : [];

      const store = useSchemaStore.getState();
      store.clearAll();
      store.importSchema(parsed.tables, rels);

      setResult({ tables: parsed.tables.length, relationships: rels.length });
      setTimeout(() => onClose(), 1500);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out (120s). Try a simpler description or retry.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            Generate with AI
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Describe your schema
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the database schema you want to create..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none h-28"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Complexity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(COMPLEXITY_CONFIG) as [Complexity, typeof COMPLEXITY_CONFIG[Complexity]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setComplexity(key)}
                  disabled={loading}
                  className={`p-2 text-center rounded-md border transition-all ${
                    complexity === key
                      ? 'bg-purple-50 border-purple-200 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-semibold">{config.label}</p>
                  <p className="text-[9px] text-slate-400">{config.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  disabled={loading}
                  className="px-2 py-1 text-[10px] text-slate-500 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 rounded-md border border-slate-100 hover:border-purple-200 transition-all text-left"
                >
                  {example.length > 60 ? example.slice(0, 60) + '...' : example}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <Loader2 size={16} className="text-purple-500 animate-spin shrink-0" />
              <p className="text-xs text-purple-700 font-medium">
                Generating schema... {elapsed}s
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-700">{error}</p>
                <button
                  onClick={() => handleGenerate()}
                  className="text-[10px] font-bold text-red-600 hover:text-red-800 mt-1 uppercase"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">
                Generated {result.tables} tables with {result.relationships} relationships
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || loading || !apiKey}
            className="px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : 'Generate Schema'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
