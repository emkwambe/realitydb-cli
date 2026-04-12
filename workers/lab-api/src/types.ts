export interface Env {
  DB: D1Database;
  TEMPLATES: R2Bucket;
  NEON_API_KEY: string;
  NEON_PROJECT_ID: string;
  LAB_API_KEY: string;
}

export interface Lab {
  id: string;
  user_id: string;
  name: string;
  template: string;
  rows: number;
  neon_branch_id: string;
  neon_endpoint_id: string;
  connection_string: string;
  status: 'active' | 'expired' | 'error';
  created_at: string;
  expires_at: string;
  deleted_at: string | null;
}

export interface CreateLabRequest {
  template: string;
  rows?: number;
  ttl?: string;
  name?: string;
  apiKey: string;
}
