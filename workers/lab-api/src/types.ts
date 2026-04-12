export interface Env {
  DB: D1Database;
  TEMPLATES: R2Bucket;
  NEON_API_KEY: string;
  NEON_PROJECT_ID: string;
  ENVIRONMENT: string;
}

export interface Lab {
  id: string;
  name: string;
  template: string;
  rows: number;
  table_count: number;
  status: 'creating' | 'seeding' | 'ready' | 'error' | 'expired';
  branch_id: string;
  connection_string: string;
  read_only_connection?: string;
  tier: string;
  created_at: string;
  expires_at: string;
  error_message?: string;
}

export interface CreateLabRequest {
  template: string;
  rows?: number;
  ttl?: string;
  name?: string;
  tier?: string;
}

export interface NeonBranch {
  id: string;
  name: string;
  endpoints: Array<{
    id: string;
    host: string;
  }>;
}
