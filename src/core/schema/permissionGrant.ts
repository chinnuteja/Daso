import { z } from 'zod';

import { GrantId, IsoTimestamp, ToolId } from './primitives';
import { Capability, PermissionApprover, PermissionScope } from './vocabulary';

/**
 * Specification section 9.6. A grant is scoped and expiring by construction: there is no
 * shape here that expresses an open-ended or background capability.
 */
export const PermissionGrant = z.strictObject({
  grantId: GrantId,
  toolId: ToolId,
  capability: Capability,
  scope: PermissionScope,
  approvedBy: PermissionApprover,
  expiresAt: IsoTimestamp,
});
export type PermissionGrant = z.infer<typeof PermissionGrant>;
