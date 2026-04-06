export function writeCsvOutput(
  allData: Record<string, any[]>,
  writer: (table: string, csv: string) => void,
): void {
  for (const [tableName, rows] of Object.entries(allData)) {
    if (rows.length === 0) {
      writer(tableName, '');
      continue;
    }

    const columns = Object.keys(rows[0]);
    const lines: string[] = [];

    // Header row
    lines.push(columns.map(escapeCsvField).join(','));

    // Data rows
    for (const row of rows) {
      const values = columns.map(col => escapeCsvField(row[col]));
      lines.push(values.join(','));
    }

    writer(tableName, lines.join('\n') + '\n');
  }
}

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
