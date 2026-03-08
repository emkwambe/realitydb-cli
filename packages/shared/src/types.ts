export type Result<T, E = DataboxError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface DataboxError {
  code: string;
  message: string;
  details?: unknown;
}
