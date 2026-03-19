import type { Template } from './templates';

interface Props {
  templates: Template[];
  onSelect: (template: Template) => void;
  loading: boolean;
}

export function TemplateGallery({ templates, onSelect, loading }: Props) {
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-sans mb-3">
          <span className="text-green">RealityDB</span>{' '}
          <span className="text-accent">Sandbox</span>
        </h1>
        <p className="text-[var(--muted)] text-lg mb-6">
          Practice SQL on production-realistic data — right in your browser
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge>Real PostgreSQL</Badge>
          <Badge>Runs locally in browser</Badge>
          <Badge>No account needed</Badge>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-10">
          <h2 className="text-xs font-mono font-semibold text-[var(--muted)] uppercase tracking-widest mb-4">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter((t) => t.category === category)
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  disabled={loading}
                  className="bg-bg-card border border-[var(--border)] rounded-lg p-5 text-left hover:border-accent/40 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-sans font-semibold text-white group-hover:text-accent transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2">
                    <span>{template.tables.length} tables</span>
                    <span>·</span>
                    <span>~{template.rowsPerTable} rows/table</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.tables.map((table) => (
                      <span
                        key={table}
                        className="px-2 py-0.5 bg-bg-elevated rounded text-[10px] font-mono text-[var(--muted)]"
                      >
                        {table}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--muted)]">
      <span className="w-1.5 h-1.5 rounded-full bg-green" />
      {children}
    </span>
  );
}
