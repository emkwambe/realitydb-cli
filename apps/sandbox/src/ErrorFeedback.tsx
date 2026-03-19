import type { TableInfo } from './sandbox';

interface Props {
  error: string;
  schema: TableInfo[];
}

function fuzzyMatchColumns(name: string, schema: TableInfo[]): { col: string; table: string }[] {
  const lower = name.toLowerCase();
  const matches: { col: string; table: string }[] = [];
  for (const table of schema) {
    for (const col of table.columns) {
      if (col.name.toLowerCase().includes(lower) || lower.includes(col.name.toLowerCase())) {
        matches.push({ col: col.name, table: table.name });
      }
    }
  }
  return matches.slice(0, 3);
}

function fuzzyMatchTables(name: string, schema: TableInfo[]): string[] {
  const lower = name.toLowerCase();
  return schema
    .filter((t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()))
    .map((t) => t.name)
    .slice(0, 3);
}

function getSuggestion(error: string, schema: TableInfo[]): string | null {
  let match: RegExpMatchArray | null;

  match = error.match(/column "?(\w+)"? does not exist/i);
  if (match) {
    const name = match[1];
    const matches = fuzzyMatchColumns(name, schema);
    if (matches.length > 0) {
      const suggestions = matches.map((m) => `'${m.col}' in table '${m.table}'`).join(', ');
      return `Column '${name}' not found. Did you mean ${suggestions}?`;
    }
    return `Column '${name}' not found. Check your column names against the schema.`;
  }

  match = error.match(/relation "?(\w+)"? does not exist/i);
  if (match) {
    const name = match[1];
    const fuzzy = fuzzyMatchTables(name, schema);
    const tableList = schema.map((t) => t.name).join(', ');
    if (fuzzy.length > 0) {
      return `Table '${name}' not found. Did you mean: ${fuzzy.join(', ')}? Available tables: ${tableList}`;
    }
    return `Table '${name}' not found. Available tables: ${tableList}`;
  }

  if (/must appear in the GROUP BY clause/i.test(error)) {
    return 'Add the non-aggregated columns to your GROUP BY clause, or wrap them in an aggregate function (COUNT, SUM, AVG, MAX, MIN).';
  }

  match = error.match(/column reference "?(\w+)"? is ambiguous/i);
  if (match) {
    return `Column '${match[1]}' exists in multiple tables. Prefix with the table name: tablename.${match[1]}`;
  }

  match = error.match(/syntax error at or near "?(\w+)"?/i);
  if (match) {
    return `Check for missing commas, unclosed parentheses, or misspelled keywords near '${match[1]}'.`;
  }

  if (/operator does not exist|cannot cast/i.test(error)) {
    return 'Try casting the column: column::integer or CAST(column AS integer)';
  }

  if (/division by zero/i.test(error)) {
    return 'Use NULLIF to prevent division by zero: numerator / NULLIF(denominator, 0)';
  }

  return null;
}

export function ErrorFeedback({ error, schema }: Props) {
  const suggestion = getSuggestion(error, schema);
  if (!suggestion) return null;

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-2 flex items-start gap-2">
      <span className="text-lg leading-none">💡</span>
      <p className="text-cyan-300 text-sm font-mono">{suggestion}</p>
    </div>
  );
}
