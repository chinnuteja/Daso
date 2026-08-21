import { Ledger, LedgerEntry } from './types';

/**
 * The complete write surface of the ledger: append, and nothing else.
 *
 * There is no update and no delete here on purpose. Section 10's history is only append-only
 * if editing has no representation; Phase 7's deletion removes whole streams through the
 * repository port instead of editing an entry.
 */

export class LedgerAppendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerAppendError';
  }
}

export function appendEntry(
  ledger: readonly LedgerEntry[],
  entry: LedgerEntry,
): readonly LedgerEntry[] {
  const existing = Ledger.parse(ledger);
  const candidate = LedgerEntry.parse(entry);

  const last = existing[existing.length - 1];

  if (existing.some((held) => held.eventId === candidate.eventId)) {
    throw new LedgerAppendError(
      `event ${candidate.eventId} is already in the ledger; history is append-only`,
    );
  }

  if (last !== undefined && candidate.sequence <= last.sequence) {
    throw new LedgerAppendError(
      `sequence ${candidate.sequence} does not follow ${last.sequence}; ` +
        'ledger sequences increase strictly so that a dropped or reordered event is detectable',
    );
  }

  if (last !== undefined && candidate.toolId !== last.toolId) {
    throw new LedgerAppendError(
      `entry ${candidate.eventId} belongs to tool ${candidate.toolId}, ` +
        `but this ledger stream belongs to ${last.toolId}`,
    );
  }

  if (candidate.entryKind === 'approval') {
    const approved = existing.find((held) => held.eventId === candidate.approves);
    if (approved === undefined || approved.entryKind !== 'candidate') {
      throw new LedgerAppendError(
        `approval ${candidate.eventId} references ${candidate.approves}, ` +
          'which is not an earlier candidate entry in this ledger',
      );
    }
  }

  return [...existing, candidate];
}

/** Spec name for the single write operation (PHASE_01 D.1 INV-12). */
export const append = appendEntry;

/** Appends in order, applying every append rule to each entry. */
export function appendEntries(
  ledger: readonly LedgerEntry[],
  entries: readonly LedgerEntry[],
): readonly LedgerEntry[] {
  return entries.reduce<readonly LedgerEntry[]>(
    (accumulated, entry) => append(accumulated, entry),
    ledger,
  );
}
