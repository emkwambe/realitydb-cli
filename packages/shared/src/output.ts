export interface CIOutput {
  success: boolean;
  command: string;
  version: string;
  timestamp: string;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

export function formatCIOutput(result: CIOutput): string {
  return JSON.stringify(result, null, 2);
}
