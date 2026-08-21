import { append } from '../../core/ledger/append';
import { assertLedgerIntegrity } from '../../core/ledger/integrity';
import { Ledger, LedgerEntry, compareEntries } from '../../core/ledger/types';
import { PersistenceError } from './database';

/**
 * Runs the pure ledger integrity check at load time so a dropped event cannot be
 * mistaken for a short-but-valid history.
 */
export function guardLedgerOnLoad(entries: readonly LedgerEntry[]): readonly LedgerEntry[] {
  const ordered = [...Ledger.parse(entries)].sort(compareEntries);
  assertLedgerIntegrity(ordered);
  return ordered;
}

/**
 * Repeats Phase 1 append rules and additionally requires that the new sequence is exactly
 * one greater than the stream's highest (or 1 on an empty stream). Gaps are refused at
 * write time so they never have to be discovered at read time.
 */
export function guardedAppend(
  existing: readonly LedgerEntry[],
  entry: LedgerEntry,
): readonly LedgerEntry[] {
  const ordered = [...Ledger.parse(existing)].sort(compareEntries);
  const candidate = LedgerEntry.parse(entry);
  const highest = ordered[ordered.length - 1];
  const expected = highest === undefined ? 1 : highest.sequence + 1;

  if (candidate.sequence !== expected) {
    throw new PersistenceError(
      `sequence ${candidate.sequence} does not strictly follow ${highest === undefined ? 0 : highest.sequence}`,
    );
  }

  return append(ordered, candidate);
}
