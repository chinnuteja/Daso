import type { ChildProfileRepository } from '../../../core/ports/repositories';
import { ChildProfile } from '../../../core/schema/childProfile';
import type { ChildId } from '../../../core/schema/primitives';
import type { MemoryRecords } from './store';

export function createMemoryProfileRepository(records: MemoryRecords): ChildProfileRepository {
  return {
    async get(childId: ChildId): Promise<ChildProfile | null> {
      const raw = records.profiles.get(childId);
      if (raw === undefined) {
        return null;
      }
      return ChildProfile.parse(raw);
    },

    async save(profile: ChildProfile): Promise<void> {
      const parsed = ChildProfile.parse(profile);
      records.profiles.set(parsed.childId, parsed);
    },

    async deleteProfile(childId: ChildId): Promise<void> {
      records.profiles.delete(childId);
    },
  };
}
