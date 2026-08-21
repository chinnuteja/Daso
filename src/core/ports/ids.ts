import { z } from 'zod';

import { EventId, GrantId, SummaryId, ToolVersionId, TrialId } from '../schema/primitives';

/**
 * Identifier generation as an injected port.
 *
 * Identifiers are sequential and human-readable, matching the specification's own examples
 * (`event_014`, `tool_version_002`, `trial_004`, `summary_001`). No randomness and no clock
 * are involved, so the same counters over the same sequence of calls always produce the same
 * identifiers — which is what makes a replayed session byte-identical.
 */

export const ID_KINDS = ['event', 'tool_version', 'trial', 'summary', 'grant'] as const;
export type IdKind = (typeof ID_KINDS)[number];

export type IdCounters = Readonly<Partial<Record<IdKind, number>>>;

export interface IdFactory {
  /** Returns the next identifier of `kind`, e.g. `event_014`. */
  next(kind: IdKind): string;
  /**
   * The counters after every call so far. Phase 2 persists this so that a reopened session
   * continues the sequence instead of reissuing an identifier that already exists.
   */
  snapshot(): IdCounters;
}

const ID_SCHEMAS: Readonly<Record<IdKind, z.ZodType<string>>> = {
  event: EventId,
  tool_version: ToolVersionId,
  trial: TrialId,
  summary: SummaryId,
  // Section 9.6's `grant_camera_flight_lab` is a hand-authored semantic identifier; the
  // schema accepts it, while the factory issues the sequential `grant_001` form.
  grant: GrantId,
};

const MINIMUM_DIGITS = 3;

/**
 * @param seed counters already consumed per kind; `{ event: 13 }` makes the next event id
 *             `event_014`. Omitted kinds start at zero.
 */
export function createSequentialIdFactory(seed: IdCounters = {}): IdFactory {
  const counters = new Map<IdKind, number>();
  for (const kind of ID_KINDS) {
    counters.set(kind, readSeed(seed, kind));
  }

  return {
    next: (kind: IdKind): string => {
      const previous = counters.get(kind) ?? 0;
      const value = previous + 1;
      counters.set(kind, value);
      return ID_SCHEMAS[kind].parse(`${kind}_${String(value).padStart(MINIMUM_DIGITS, '0')}`);
    },
    snapshot: (): IdCounters => {
      const result: Partial<Record<IdKind, number>> = {};
      for (const kind of ID_KINDS) {
        result[kind] = counters.get(kind) ?? 0;
      }
      return result;
    },
  };
}

function readSeed(seed: IdCounters, kind: IdKind): number {
  const value = seed[kind] ?? 0;
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`seed for ${kind} must be a non-negative integer, received ${value}`);
  }
  return value;
}
