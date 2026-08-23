import type { ChildProfileRepository } from '../../../core/ports/repositories';
import { ChildProfile } from '../../../core/schema/childProfile';
import type { ChildId } from '../../../core/schema/primitives';
import { STORE, type TeachDasoDatabase } from '../database';
import { getParsed } from './access';
import { deleteIndexedDbProfileGraph } from './deleteGraph';

export function createIndexedDbProfileRepository(database: TeachDasoDatabase): ChildProfileRepository {
  return {
    async get(childId: ChildId): Promise<ChildProfile | null> {
      return getParsed(database, STORE.childProfiles, childId, ChildProfile);
    },

    async save(profile: ChildProfile): Promise<void> {
      await database.put(STORE.childProfiles, ChildProfile.parse(profile));
    },

    async deleteProfile(childId: ChildId): Promise<void> {
      await database.delete(STORE.childProfiles, childId);
    },

    async deleteProfileGraph(childId: ChildId): Promise<void> {
      await deleteIndexedDbProfileGraph(database, childId);
    },
  };
}
