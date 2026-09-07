import { foldApprovedEvents } from '../ledger/fold';
import type { LedgerEntry } from '../ledger/types';
import type { IsoTimestamp, ToolVersionId } from '../schema/primitives';
import { ToolVersion, ToolVersionBody } from '../schema/toolVersion';
import { canonicalJson } from '../serialization/canonicalJson';
import { deepFreeze } from '../serialization/deepFreeze';

export interface CompilationMetadata {
  readonly versionId: ToolVersionId;
  readonly compiledAt: IsoTimestamp;
}

/**
 * Pure compiler: fold approved events, attach injected identity and time, freeze.
 * Reads no clock, id factory, repository, browser API, or network.
 */
export function compileToolVersion(
  entries: readonly LedgerEntry[],
  metadata: CompilationMetadata,
): ToolVersion {
  const body = foldApprovedEvents(entries);
  return deepFreeze(
    ToolVersion.parse({
      ...body,
      versionId: metadata.versionId,
      compiledAt: metadata.compiledAt,
    }),
  );
}

export function bodyFromVersion(version: ToolVersion): ToolVersionBody {
  return ToolVersionBody.parse({
    toolId: version.toolId,
    version: version.version,
    inputs: version.inputs,
    metrics: version.metrics,
    rules: version.rules,
    ...(version.coachingPreference === undefined
      ? {}
      : { coachingPreference: version.coachingPreference }),
  });
}

/**
 * Idempotency decision: reuse the active version when the folded body is canonically equal.
 * Decided before requesting a new id or time.
 */
export function shouldReuseActiveVersion(
  folded: ToolVersionBody,
  active: ToolVersion | null,
): boolean {
  if (active === null) {
    return false;
  }
  return canonicalJson(folded) === canonicalJson(bodyFromVersion(active));
}
