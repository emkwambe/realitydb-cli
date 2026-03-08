import type { GeneratorContext } from '../types.js';

export function generateUuid(ctx: GeneratorContext): string {
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(ctx.seed.nextInt(0, 255));
  }

  // Set version 4 (bits 4-7 of byte 6)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant (bits 6-7 of byte 8)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
