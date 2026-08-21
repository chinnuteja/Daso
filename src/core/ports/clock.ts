import { IsoTimestamp } from '../schema/primitives';

/**
 * The only source of time available to the domain. `src/core` never reads the wall clock, so
 * a replay of the same events produces the same timestamps and the same canonical JSON.
 */
export interface Clock {
  now(): IsoTimestamp;
}

/**
 * A clock that always reports the same instant. Sufficient for fixtures and replay, and the
 * reason the domain needs no test-only branch: the injected port is the only difference
 * between a fixture run and a device run.
 */
export function createFixedClock(instant: IsoTimestamp): Clock {
  const pinned = IsoTimestamp.parse(instant);
  return {
    now: (): IsoTimestamp => pinned,
  };
}
