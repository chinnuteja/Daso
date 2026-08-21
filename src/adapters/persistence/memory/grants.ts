import type { PermissionGrantRepository } from '../../../core/ports/repositories';
import { PermissionGrant } from '../../../core/schema/permissionGrant';
import type { GrantId, ToolId } from '../../../core/schema/primitives';
import type { MemoryRecords } from './store';

export function createMemoryGrantRepository(records: MemoryRecords): PermissionGrantRepository {
  return {
    async get(grantId: GrantId): Promise<PermissionGrant | null> {
      const raw = records.grants.get(grantId);
      if (raw === undefined) {
        return null;
      }
      return PermissionGrant.parse(raw);
    },

    async listByTool(toolId: ToolId): Promise<readonly PermissionGrant[]> {
      const found: PermissionGrant[] = [];
      for (const raw of records.grants.values()) {
        const parsed = PermissionGrant.parse(raw);
        if (parsed.toolId === toolId) {
          found.push(parsed);
        }
      }
      return found.sort((left, right) => (left.grantId < right.grantId ? -1 : 1));
    },

    async save(grant: PermissionGrant): Promise<void> {
      const parsed = PermissionGrant.parse(grant);
      records.grants.set(parsed.grantId, parsed);
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      for (const [grantId, raw] of records.grants.entries()) {
        const parsed = PermissionGrant.parse(raw);
        if (parsed.toolId === toolId) {
          records.grants.delete(grantId);
        }
      }
    },
  };
}
