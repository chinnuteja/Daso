import { z } from 'zod';

import { ChildId, IsoTimestamp, NonEmptyString } from './primitives';
import { InputPreference, ReadingBand } from './vocabulary';

/**
 * Specification section 9.1. A reading band rather than a birth date, because the band is
 * the only thing the experience actually adapts to.
 */
export const ChildProfile = z.strictObject({
  childId: ChildId,
  displayName: NonEmptyString,
  readingBand: ReadingBand,
  inputPreferences: z.array(InputPreference).min(1),
  createdAt: IsoTimestamp,
});
export type ChildProfile = z.infer<typeof ChildProfile>;
