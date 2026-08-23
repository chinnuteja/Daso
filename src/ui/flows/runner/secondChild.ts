import { ChildProfile } from '../../../core/schema/childProfile';

/** Constrained Day-2 local profile. Not production authentication. */
export const LEO_PROFILE = ChildProfile.parse({
  childId: 'child_local_02',
  displayName: 'Leo',
  readingBand: 'developing',
  inputPreferences: ['touch', 'voice'],
  createdAt: '2026-08-21T09:00:00Z',
});

export const MAYA_CHILD_ID = 'child_local_01';
export const LEO_CHILD_ID = LEO_PROFILE.childId;
