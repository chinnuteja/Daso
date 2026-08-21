import type { PermissionGrantRepository } from '../../../core/ports/repositories';
import { PermissionGrant } from '../../../core/schema/permissionGrant';
import type { GrantId, ToolId } from '../../../core/schema/primitives';
import { STORE, type TeachDasoDatabase } from '../database';
import { getParsed, listByToolIndex } from './access';

export function createIndexedDbGrantRepository(
  database: TeachDasoDatabase,
): PermissionGrantRepository {
  return {
    async get(grantId: GrantId): Promise<PermissionGrant | null> {
      return getParsed(database, STORE.grants, grantId, PermissionGrant);
    },

    async listByTool(toolId: ToolId): Promise<readonly PermissionGrant[]> {
      const found = await listByToolIndex(database, STORE.grants, toolId, PermissionGrant);
      return found.sort((left, right) => (left.grantId < right.grantId ? -1 : 1));
    },

    async save(grant: PermissionGrant): Promise<void> {
      await database.put(STORE.grants, PermissionGrant.parse(grant));
    },

    async deleteByTool(toolId: ToolId): Promise<void> {
      const found = await listByToolIndex(database, STORE.grants, toolId, PermissionGrant);
      const tx = database.transaction(STORE.grants, 'readwrite');
      for (const grant of found) {
        await tx.store.delete(grant.grantId);
      }
      await tx.done;
    },
  };
}
