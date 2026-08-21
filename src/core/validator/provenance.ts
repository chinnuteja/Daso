/**
 * Provenance is stamped by the fold, never supplied by a proposer (§7.4, ruling R1).
 * These helpers inspect the raw candidate *before* schema parse, because a pre-stamped
 * `sourceEventId` is exactly the kind of extra key a strict schema would otherwise
 * swallow as a generic unknown-key failure.
 */

export function carriesPreStampedProvenance(input: unknown): boolean {
  return walkForKey(input, 'sourceEventId');
}

export function namedSourceEventIds(input: unknown): readonly string[] {
  const found: string[] = [];
  collectNamedIds(input, found);
  return found;
}

function walkForKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => walkForKey(item, key));
  }
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    return true;
  }
  return Object.values(record).some((child) => walkForKey(child, key));
}

function collectNamedIds(value: unknown, found: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNamedIds(item, found);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (typeof record.namedEventId === 'string') {
    found.push(record.namedEventId);
  }
  for (const child of Object.values(record)) {
    collectNamedIds(child, found);
  }
}
