import { readFile, stat } from 'node:fs/promises';
import { loadRealityPack } from '@databox/generators';
import { uploadToGist } from './sharing/gistUpload.js';
import { compressPack } from './sharing/compress.js';

export interface ShareOptions {
  method?: 'gist' | 'file';
  description?: string;
}

export interface ShareResult {
  method: string;
  location: string;
  packName: string;
  size: string;
  compressedSize?: string;
  tableCount: number;
  totalRows: number;
  gistUrl?: string;
  gistId?: string;
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
    const content = await readFile(filePath, 'utf-8');

    // Calculate compressed size for display
    const compressed = await compressPack(content);
    const compressedSize = formatSize(compressed.length);

    const filename = `${pack.metadata.name}.realitydb-pack.json`;
    const result = await uploadToGist(content, {
      filename,
      description: options?.description ?? `RealityDB Reality Pack: ${pack.metadata.name}`,
      public: true,
    });

    return {
      method: 'gist',
      location: result.url,
      packName: pack.metadata.name,
      size,
      compressedSize,
      tableCount: pack.metadata.tableCount,
      totalRows: pack.metadata.totalRows,
      gistUrl: result.url,
      gistId: result.gistId,
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
