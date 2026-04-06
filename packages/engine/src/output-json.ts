import type { GenerationMeta } from './types';

export function writeJsonOutput(
  allData: Record<string, any[]>,
  meta: GenerationMeta,
  writer: (chunk: string) => void,
): void {
  writer('{\n');
  writer('  "_meta": {\n');
  writer(`    "generator": ${JSON.stringify(meta.generator)},\n`);
  writer(`    "version": ${JSON.stringify(meta.version)},\n`);
  writer(`    "generated_at": ${JSON.stringify(meta.generated_at)},\n`);
  writer(`    "template": ${JSON.stringify(meta.template)},\n`);
  writer(`    "total_rows": ${meta.total_rows},\n`);
  writer(`    "elapsed_seconds": ${meta.elapsed_seconds},\n`);
  writer(`    "seed": ${meta.seed === null ? 'null' : meta.seed}\n`);
  writer('  },\n');
  writer('  "tables": {\n');

  const tableNames = Object.keys(allData);
  for (let ti = 0; ti < tableNames.length; ti++) {
    const tableName = tableNames[ti];
    const tableData = allData[tableName];
    const isLastTable = ti === tableNames.length - 1;

    writer(`    ${JSON.stringify(tableName)}: {\n`);
    writer(`      "row_count": ${tableData.length},\n`);
    writer(`      "data": [\n`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < tableData.length; i += BATCH_SIZE) {
      const batch = tableData.slice(i, Math.min(i + BATCH_SIZE, tableData.length));
      const lines = batch.map((row: any, idx: number) => {
        const isLast = (i + idx) === tableData.length - 1;
        return `        ${JSON.stringify(row)}${isLast ? '' : ','}`;
      });
      writer(lines.join('\n') + '\n');
    }

    writer(`      ]\n`);
    writer(`    }${isLastTable ? '' : ','}\n`);
  }

  writer('  }\n');
  writer('}\n');
}
