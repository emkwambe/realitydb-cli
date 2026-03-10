import { stat } from 'node:fs/promises';
import { loadRealityPack } from '@databox/generators';

export interface ShareOptions {
  method?: 'gist' | 'file';
  description?: string;
}

export interface ShareResult {
  method: string;
  location: string;
  packName: string;
  size: string;
  tableCount: number;
  totalRows: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb} KB`;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb} MB`;
}

export async function shareRealityPack(
  filePath: string,
  options?: ShareOptions,
): Promise<ShareResult> {
  const pack = await loadRealityPack(filePath);
  const fileStat = await stat(filePath);
  const size = formatSize(fileStat.size);

  const method = options?.method ?? 'file';

  if (method === 'gist') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      // Fall back to file method
      return {
        method: 'file',
        location: filePath,
        packName: pack.metadata.name,
        size,
        tableCount: pack.metadata.tableCount,
        totalRows: pack.metadata.totalRows,
      };
    }
    // Future: implement gist upload
    // For V1, fall back to file
    return {
      method: 'file',
      location: filePath,
      packName: pack.metadata.name,
      size,
      tableCount: pack.metadata.tableCount,
      totalRows: pack.metadata.totalRows,
    };
  }

  return {
    method: 'file',
    location: filePath,
    packName: pack.metadata.name,
    size,
    tableCount: pack.metadata.tableCount,
    totalRows: pack.metadata.totalRows,
  };
}
