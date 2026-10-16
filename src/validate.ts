// Small validators. A rejection is a 400 naming the field (src/app.ts).
// Length caps are parser guards on an already size-limited body.

export class ValidationError extends Error {
  constructor(readonly field: string, readonly reason: string) {
    super(`${field}: ${reason}`);
  }
}

export function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('body', 'must be a JSON object');
  return body as Record<string, unknown>;
}

export function rejectUnknownFields(obj: Record<string, unknown>, allowed: readonly string[]): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) throw new ValidationError(k, 'unknown_field');
  }
}

export function str(obj: Record<string, unknown>, field: string, re: RegExp, max = 256): string {
  const v = obj[field];
  if (typeof v !== 'string' || v.length === 0 || v.length > max || !re.test(v)) throw new ValidationError(field, 'invalid');
  return v;
}

export function int(obj: Record<string, unknown>, field: string, min: number, max: number): number {
  const v = obj[field];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new ValidationError(field, 'invalid');
  return v;
}

export function oneOf<T extends string>(obj: Record<string, unknown>, field: string, values: readonly T[]): T {
  const v = obj[field];
  if (typeof v !== 'string' || !(values as readonly string[]).includes(v)) throw new ValidationError(field, 'invalid');
  return v as T;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MACOS_RE = /^\d{1,3}\.\d{1,3}$/;
export const VERSION_RE = /^[0-9A-Za-z.+-]{1,32}$/;
