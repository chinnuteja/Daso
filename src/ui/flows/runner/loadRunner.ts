import { authorshipExplanation, type AuthorshipExplanationEntry } from '../../../core/inspection';
import { bodyFromVersion } from '../../../core/compiler';
import { foldApprovedEvents } from '../../../core/ledger/fold';
import type { LedgerEntry } from '../../../core/ledger/types';
import type { Repositories } from '../../../core/ports/repositories';
import { resolveForkAttribution } from '../../../core/reuse';
import { replay, type RuntimeResult } from '../../../core/runtime';
import { ChildId, ToolId } from '../../../core/schema/primitives';
import type { ChildProfile } from '../../../core/schema/childProfile';
import type { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolDefinition } from '../../../core/schema/toolDefinition';
import type { ToolVersion } from '../../../core/schema/toolVersion';
import { canonicalJson } from '../../../core/serialization/canonicalJson';

export type RunnerStatus = 'loading' | 'empty' | 'ready' | 'integrity_error';

export interface RunnerView {
  readonly tool: ToolDefinition;
  readonly version: ToolVersion;
  readonly viewer: ChildProfile;
  readonly owner: ChildProfile;
  readonly sourceAuthor: ChildProfile | null;
  readonly sourceDeleted: boolean;
  readonly visibleTitle: string;
  readonly creditName: string;
  readonly ledger: readonly LedgerEntry[];
  readonly trials: readonly ExperimentTrial[];
  readonly runtime: RuntimeResult;
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly canCapture: boolean;
  readonly needsCopy: boolean;
}

export type RunnerLoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'ready'; readonly view: RunnerView }
  | { readonly status: 'integrity_error'; readonly message: string };

export const RUNNER_INTEGRITY_COPY =
  'This saved tool cannot be used right now. Its stored history does not match the saved version.';

export async function loadRunner(
  repositories: Repositories,
  rawToolId: string,
  rawViewerId: string,
): Promise<RunnerLoadResult> {
  const toolId = ToolId.safeParse(rawToolId);
  const viewerId = ChildId.safeParse(rawViewerId);
  if (!toolId.success || !viewerId.success) {
    return { status: 'integrity_error', message: RUNNER_INTEGRITY_COPY };
  }

  const tool = await repositories.tools.get(toolId.data);
  if (tool === null) {
    return { status: 'empty' };
  }
  const version = await repositories.versions.get(tool.currentVersionId);
  const viewer = await repositories.profiles.get(viewerId.data);
  const owner = await repositories.profiles.get(tool.ownerChildId);
  if (version === null || viewer === null || owner === null) {
    return { status: 'integrity_error', message: RUNNER_INTEGRITY_COPY };
  }
  if (version.toolId !== tool.toolId) {
    return { status: 'integrity_error', message: RUNNER_INTEGRITY_COPY };
  }

  const ledger = await repositories.ledger.listByTool(tool.toolId);
  const trials = await repositories.trials.listByTool(tool.toolId);
  try {
    if (canonicalJson(foldApprovedEvents(ledger)) !== canonicalJson(bodyFromVersion(version))) {
      return { status: 'integrity_error', message: RUNNER_INTEGRITY_COPY };
    }
  } catch {
    return { status: 'integrity_error', message: RUNNER_INTEGRITY_COPY };
  }

  let sourceAuthor: ChildProfile | null = null;
  if (tool.forkedFrom !== undefined) {
    sourceAuthor = await repositories.profiles.get(tool.forkedFrom.ownerChildId);
  }
  const attribution = resolveForkAttribution({
    displayName: tool.displayName,
    ownerDisplayName: owner.displayName,
    isFork: tool.forkedFrom !== undefined,
    sourceAuthorDisplayName: sourceAuthor?.displayName ?? null,
  });

  const ownsTool = viewer.childId === tool.ownerChildId;
  return {
    status: 'ready',
    view: {
      tool,
      version,
      viewer,
      owner,
      sourceAuthor,
      sourceDeleted: attribution.sourceDeleted,
      visibleTitle: attribution.visibleTitle,
      creditName: attribution.teacherDisplayName,
      ledger,
      trials,
      runtime: replay(version, trials),
      explanation: authorshipExplanation(ledger),
      canCapture: ownsTool,
      needsCopy: !ownsTool,
    },
  };
}
