import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#a78bfa', '#60a5fa'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1a1a28', border: '1px solid #2a2a3e', color: '#e0e0e8', fontSize: 12 },
  itemStyle: { color: '#e0e0e8' },
};

const GRID_PROPS = { stroke: '#1e1e2e' };
const AXIS_STYLE = { fill: '#8888a0', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

type ChartType = 'none' | 'kpi' | 'line' | 'multiline' | 'pie' | 'bar' | 'groupedbar' | 'scatter' | 'histogram';

interface ChartDetection {
  type: ChartType;
  textCols: string[];
  numCols: string[];
  dateCols: string[];
}

const DATE_NAME_PATTERNS = /date|time|month|year|quarter|week|_at$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function classifyColumn(col: string, rows: Record<string, unknown>[]): 'text' | 'number' | 'date' {
  const firstNonNull = rows.find((r) => r[col] != null)?.[col];
  if (firstNonNull === undefined || firstNonNull === null) return 'text';

  if (typeof firstNonNull === 'number') return 'number';

  const str = String(firstNonNull);
  if (ISO_DATE_PATTERN.test(str) || DATE_NAME_PATTERNS.test(col)) return 'date';

  return 'text';
}

export function detectChartType(columns: string[], rows: Record<string, unknown>[]): ChartDetection {
  const textCols: string[] = [];
  const numCols: string[] = [];
  const dateCols: string[] = [];

  for (const col of columns) {
    const type = classifyColumn(col, rows);
    if (type === 'text') textCols.push(col);
    else if (type === 'number') numCols.push(col);
    else dateCols.push(col);
  }

  const none: ChartDetection = { type: 'none', textCols, numCols, dateCols };

  if (rows.length === 0) return none;
  if (rows.length === 1 && numCols.length >= 2) return { type: 'kpi', textCols, numCols, dateCols };
  if (dateCols.length === 1 && numCols.length === 1) return { type: 'line', textCols, numCols, dateCols };
  if (dateCols.length === 1 && numCols.length >= 2) return { type: 'multiline', textCols, numCols, dateCols };
  if (textCols.length === 1 && numCols.length === 1 && rows.length <= 6) return { type: 'pie', textCols, numCols, dateCols };
  if (textCols.length === 1 && numCols.length === 1 && rows.length > 6) return { type: 'bar', textCols, numCols, dateCols };
  if (textCols.length === 1 && numCols.length >= 2) return { type: 'groupedbar', textCols, numCols, dateCols };
  if (numCols.length === 2 && textCols.length === 0) return { type: 'scatter', textCols, numCols, dateCols };
  if (numCols.length === 1 && textCols.length === 0 && rows.length > 10) return { type: 'histogram', textCols, numCols, dateCols };

  return none;
}

export function chartTypeLabel(type: ChartType): string {
  const labels: Record<ChartType, string> = {
    none: 'None',
    kpi: 'KPI Cards',
    line: 'Line Chart',
    multiline: 'Multi-Line Chart',
    pie: 'Donut Chart',
    bar: 'Bar Chart',
    groupedbar: 'Grouped Bar Chart',
    scatter: 'Scatter Plot',
    histogram: 'Histogram',
  };
  return labels[type];
}

const MONEY_PATTERN = /amount|revenue|price|cost|total|payment|balance|spent|salary/i;

function formatKPIValue(col: string, value: unknown): string {
  if (value == null) return '—';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  const isMoney = MONEY_PATTERN.test(col);
  const rounded = Number.isInteger(num) ? num : Math.round(num * 100) / 100;
  const formatted = rounded.toLocaleString('en-US');
  return isMoney ? `$${formatted}` : formatted;
}

function renderPieLabel({ percent }: { percent: number }) {
  return `${(percent * 100).toFixed(0)}%`;
}

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
}

export function ChartPanel({ columns, rows }: Props) {
  const detection = detectChartType(columns, rows);
  const { type, textCols, numCols, dateCols } = detection;

  if (type === 'none') return null;

  if (type === 'kpi') {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="flex flex-wrap gap-4 justify-center">
          {numCols.map((col) => (
            <div key={col} className="bg-bg-card border border-[var(--border)] rounded-lg px-6 py-4 text-center min-w-[140px]">
              <div className="text-xs text-[var(--muted)] font-mono mb-1 uppercase">{col}</div>
              <div className="text-2xl font-bold text-white font-mono">{formatKPIValue(col, rows[0][col])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis type="number" tick={AXIS_STYLE} />
          <YAxis type="category" dataKey={textCols[0]} tick={AXIS_STYLE} width={100} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey={numCols[0]} fill={COLORS[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    const pieData = rows.map((r) => ({ name: String(r[textCols[0]]), value: Number(r[numCols[0]]) }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            label={renderPieLabel}
            labelLine={false}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={dateCols[0]} tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Line type="monotone" dataKey={numCols[0]} stroke={COLORS[0]} dot />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'multiline') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={dateCols[0]} tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} />
          <Tooltip {...TOOLTIP_STYLE} />
          {numCols.map((col, i) => (
            <Line key={col} type="monotone" dataKey={col} stroke={COLORS[i % COLORS.length]} dot />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'groupedbar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={textCols[0]} tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} />
          <Tooltip {...TOOLTIP_STYLE} />
          {numCols.map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey={numCols[0]} name={numCols[0]} tick={AXIS_STYLE} />
          <YAxis dataKey={numCols[1]} name={numCols[1]} tick={AXIS_STYLE} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Scatter data={rows} fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'histogram') {
    const col = numCols[0];
    const values = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / 10 || 1;
    const bins = Array.from({ length: 10 }, (_, i) => {
      const lo = min + i * binWidth;
      const hi = lo + binWidth;
      const count = values.filter((v) => (i === 9 ? v >= lo && v <= hi : v >= lo && v < hi)).length;
      return { range: `${Math.round(lo)}–${Math.round(hi)}`, count };
    });
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="range" tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
