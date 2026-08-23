import { ToolDefinition } from '../../core/schema/toolDefinition';
import { ToolVersion } from '../../core/schema/toolVersion';
import { PersistenceError } from './database';

/**
 * A stored definition may only point at a version that exists for the same tool.
 */
export function requireActiveVersion(
  definition: ToolDefinition,
  version: ToolVersion | null,
): ToolVersion {
  if (version === null) {
    throw new PersistenceError(
      `definition ${definition.toolId} points at missing version ${definition.currentVersionId}`,
    );
  }
  if (version.toolId !== definition.toolId) {
    throw new PersistenceError(
      `definition ${definition.toolId} points at version ${version.versionId} owned by ${version.toolId}`,
    );
  }
  return version;
}
