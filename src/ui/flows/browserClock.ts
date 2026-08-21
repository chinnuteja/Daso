import { IsoTimestamp } from '../../core/schema/primitives';
import type { Clock } from '../../core/ports/clock';

export function createBrowserClock(): Clock {
  return {
    now: (): IsoTimestamp => IsoTimestamp.parse(new Date().toISOString()),
  };
}
