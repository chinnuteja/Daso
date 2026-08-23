import { allocateTargetToolId, buildForkSnapshot, type ForkSnapshot } from '../../../core/reuse';
import type { Clock } from '../../../core/ports/clock';
import type { IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { ChildId, EventId, ToolId } from '../../../core/schema/primitives';
import type { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ChildProfile } from '../../../core/schema/childProfile';
import { LEO_PROFILE } from './secondChild';

export class ForkReuseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForkReuseError';
  }
}

export interface ReuseResult {
  readonly snapshot: ForkSnapshot;
  readonly reused: boolean;
}

export async function ensureSecondChildProfile(repositories: Repositories): Promise<ChildProfile> {
  const existing = await repositories.profiles.get(LEO_PROFILE.childId);
  if (existing !== null) {
    return existing;
  }
  await repositories.profiles.save(LEO_PROFILE);
  return LEO_PROFILE;
}

export async function findExistingFork(
  repositories: Repositories,
  ownerChildId: ChildId,
  sourceToolId: ToolId,
  sourceVersionId: string,
): Promise<ToolDefinition | null> {
  const owned = await repositories.tools.listByOwner(ownerChildId);
  return (
    owned.find(
      (tool) =>
        tool.forkedFrom !== undefined &&
        tool.forkedFrom.toolId === sourceToolId &&
        tool.forkedFrom.versionId === sourceVersionId,
    ) ?? null
  );
}

export async function createOrReuseFork(input: {
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly sourceToolId: string;
  readonly targetOwner: ChildProfile;
}): Promise<ReuseResult> {
  const sourceToolId = ToolId.parse(input.sourceToolId);
  const sourceDefinition = await input.repositories.tools.get(sourceToolId);
  if (sourceDefinition === null) {
    throw new ForkReuseError(`source tool ${input.sourceToolId} is missing`);
  }
  const sourceVersion = await input.repositories.versions.get(sourceDefinition.currentVersionId);
  if (sourceVersion === null) {
    throw new ForkReuseError('source active version is missing');
  }
  const existing = await findExistingFork(
    input.repositories,
    input.targetOwner.childId,
    sourceDefinition.toolId,
    sourceVersion.versionId,
  );
  if (existing !== null) {
    const version = await input.repositories.versions.get(existing.currentVersionId);
    const ledger = await input.repositories.ledger.listByTool(existing.toolId);
    if (version === null) {
      throw new ForkReuseError('existing fork version is missing');
    }
    return { snapshot: { definition: existing, version, ledger }, reused: true };
  }

  const owned = await input.repositories.tools.listByOwner(input.targetOwner.childId);
  const targetToolId = allocateTargetToolId(
    sourceDefinition.toolId,
    owned.map((tool) => tool.toolId),
  );
  const sourceLedger = await input.repositories.ledger.listByTool(sourceDefinition.toolId);
  const replacementEventIds = sourceLedger.map(() => EventId.parse(input.ids.next('event')));
  const snapshot = buildForkSnapshot({
    sourceDefinition,
    sourceVersion,
    sourceLedger,
    targetToolId,
    targetOwnerChildId: input.targetOwner.childId,
    targetDisplayName: `${input.targetOwner.displayName}'s copy of ${sourceDefinition.displayName}`,
    replacementEventIds,
    targetVersionId: input.ids.next('tool_version'),
    forkedAt: input.clock.now(),
  });
  await input.repositories.versions.saveForkSnapshot(snapshot);
  return { snapshot, reused: false };
}
