import { compareEntries, Ledger, LedgerEntry } from './types';

/**
 * Sequence continuity is a property of the ledger, not of a storage engine.
 *
 * A gap, a duplicate event id, or a stream that does not start at 1 means an event was
 * dropped or rewritten. That is silent provenance corruption (E.11): it must fail when the
 * stream is loaded, not later when a version is compiled.
 */

export class LedgerIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerIntegrityError';
  }
}

export function assertLedgerIntegrity(entries: readonly LedgerEntry[]): void {
  const parsed = Ledger.parse(entries);
  const ordered = [...parsed].sort(compareEntries);

  const seenIds = new Set<string>();
  for (const entry of ordered) {
    if (seenIds.has(entry.eventId)) {
      throw new LedgerIntegrityError(
        `event ${entry.eventId} appears more than once; history is append-only`,
      );
    }
    seenIds.add(entry.eventId);
  }

  if (ordered.length === 0) {
    return;
  }

  const first = ordered[0];
  if (first === undefined) {
    return;
  }

  if (first.sequence !== 1) {
    throw new LedgerIntegrityError(
      `a ledger stream must start at sequence 1, found ${first.sequence}`,
    );
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous === undefined || current === undefined) {
      throw new LedgerIntegrityError('ledger integrity walk encountered a hole in the array');
    }
    if (current.sequence !== previous.sequence + 1) {
      throw new LedgerIntegrityError(
        `sequence gap between ${previous.sequence} and ${current.sequence}; ` +
          'a dropped or reordered event is provenance corruption',
      );
    }
  }
}
