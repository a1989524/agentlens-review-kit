import { createHash } from 'node:crypto';
import type { Digest, HashedRecord } from './types.ts';

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize((value as Record<string, unknown>)[key])]));
  }
  throw new TypeError('UNSUPPORTED_CANONICAL_VALUE');
}
export function hashRecord(value: unknown): Digest {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}
export function seal<T extends object>(record: T): Readonly<T & {content_hash: Digest}> {
  return Object.freeze({...record, content_hash: hashRecord(record)});
}
export function verifyRecord(value: unknown): asserts value is HashedRecord & Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('RECORD_REQUIRED');
  const {content_hash, ...body} = value as Record<string, unknown>;
  if (typeof content_hash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(content_hash) || hashRecord(body) !== content_hash) {
    throw new Error('RECORD_INTEGRITY_MISMATCH');
  }
}
