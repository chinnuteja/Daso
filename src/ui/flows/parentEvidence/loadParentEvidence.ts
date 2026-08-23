import { bodyFromVersion } from '../../../core/compiler';
import { exportToolGraph, type ToolExport } from '../../../core/dataRights';
import {
  buildEvidenceProjection,
  buildParentSummary,
  renderParentClauses,
  renderParentSummaryText,
  validateEvidenceSelection,
  type ParentClauses,
  type ParentRenderAttribution,
} from '../../../core/evidence';
import { foldApprovedEvents } from '../../../core/ledger/fold';
import type { LedgerEntry } from '../../../core/ledger/types';
import type { Clock } from '../../../core/ports/clock';
import type { EvidenceSource } from '../../../core/ports/evidence';
import type { IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { redactOrphanedForkDefinition, resolveForkAttribution } from '../../../core/reuse';
import type { ChildProfile } from '../../../core/schema/childProfile';
import type { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { ParentSummary } from '../../../core/schema/parentSummary';
import type { PermissionGrant } from '../../../core/schema/permissionGrant';
import { ChildId, ToolId } from '../../../core/schema/primitives';
import type { ToolDefinition } from '../../../core/schema/toolDefinition';
import type { ToolVersion } from '../../../core/schema/toolVersion';
import { canonicalJson } from '../../../core/serialization/canonicalJson';
import { PARENT_EMPTY_COPY, PARENT_INTEGRITY_COPY } from '../../copy/parent';

export interface StoredGraphView {
  readonly versionIds: readonly string[];
  readonly eventIds: readonly string[];
  readonly trialIds: readonly string[];
  readonly grantIds: readonly string[];
  readonly summaryIds: readonly string[];
}

export interface ParentEvidenceView {
  readonly tool: ToolDefinition;
  readonly owner: ChildProfile;
  readonly version: ToolVersion;
  readonly summary: ParentSummary;
  readonly clauses: ParentClauses;
  readonly sourceDeleted: boolean;
  readonly visibleTitle: string;
  readonly teacherDisplayName: string;
  readonly exportGraph: ToolExport;
  readonly stored: StoredGraphView;
}

export type ParentEvidenceLoadResult =
  | { readonly status: 'empty'; readonly message: string }
  | { readonly status: 'integrity_error'; readonly message: string }
  | { readonly status: 'ready'; readonly view: ParentEvidenceView };

export async function loadParentEvidence(input: {
  readonly repositories: Repositories;
  readonly evidence: EvidenceSource;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly rawToolId: string;
}): Promise<ParentEvidenceLoadResult> {
  const toolId = ToolId.safeParse(input.rawToolId);
  if (!toolId.success) {
    return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
  }

  const tool = await input.repositories.tools.get(toolId.data);
  if (tool === null) {
    return { status: 'empty', message: PARENT_EMPTY_COPY };
  }
  const owner = await input.repositories.profiles.get(tool.ownerChildId);
  const version = await input.repositories.versions.get(tool.currentVersionId);
  if (owner === null || version === null || version.toolId !== tool.toolId) {
    return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
  }

  const versions = await input.repositories.versions.listByTool(tool.toolId);
  const ledger = await input.repositories.ledger.listByTool(tool.toolId);
  const trials = await input.repositories.trials.listByTool(tool.toolId);
  const grants = await input.repositories.grants.listByTool(tool.toolId);
  const summaries = await input.repositories.summaries.listByTool(tool.toolId);

  try {
    if (canonicalJson(foldApprovedEvents(ledger)) !== canonicalJson(bodyFromVersion(version))) {
      return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
    }
  } catch {
    return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
  }

  const sourceAuthor =
    tool.forkedFrom === undefined
      ? null
      : await input.repositories.profiles.get(tool.forkedFrom.ownerChildId);
  const attribution = resolveForkAttribution({
    displayName: tool.displayName,
    ownerDisplayName: owner.displayName,
    isFork: tool.forkedFrom !== undefined,
    sourceAuthorDisplayName: sourceAuthor?.displayName ?? null,
  });
  const renderAttribution: ParentRenderAttribution = {
    teacherDisplayName: attribution.teacherDisplayName,
    toolDisplayName: attribution.visibleTitle,
    sourceDeleted: attribution.sourceDeleted,
  };

  const projection = buildEvidenceProjection({
    tool: attribution.sourceDeleted ? redactOrphanedForkDefinition(tool) : tool,
    ownerDisplayName: attribution.teacherDisplayName,
    version,
    ledger,
    trials,
  });

  const existing = latestSummary(summaries);
  if (existing !== null && (existing.childId !== owner.childId || existing.toolId !== tool.toolId)) {
    return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
  }

  let summary = existing;
  if (
    summary === null ||
    !selectionStillValid(projection, summary.evidenceEventIds) ||
    (attribution.sourceDeleted &&
      summary.text !==
        renderParentSummaryText(projection, { evidenceEventIds: summary.evidenceEventIds }, renderAttribution))
  ) {
    const selection = await input.evidence.select({ projection });
    try {
      validateEvidenceSelection(projection, selection);
    } catch {
      return { status: 'integrity_error', message: PARENT_INTEGRITY_COPY };
    }
    const built = buildParentSummary({
      projection,
      selection,
      childId: ChildId.parse(owner.childId),
      ids: input.ids,
      clock: input.clock,
      attribution: renderAttribution,
    });
    summary =
      existing !== null && attribution.sourceDeleted
        ? ParentSummary.parse({
            ...built,
            summaryId: existing.summaryId,
            createdAt: existing.createdAt,
          })
        : built;
    await input.repositories.summaries.save(summary);
  }

  const refreshedSummaries = await input.repositories.summaries.listByTool(tool.toolId);
  return {
    status: 'ready',
    view: {
      tool: attribution.sourceDeleted ? redactOrphanedForkDefinition(tool) : tool,
      owner,
      version,
      summary,
      clauses: renderParentClauses(projection, { evidenceEventIds: summary.evidenceEventIds }, renderAttribution),
      sourceDeleted: attribution.sourceDeleted,
      visibleTitle: attribution.visibleTitle,
      teacherDisplayName: attribution.teacherDisplayName,
      exportGraph: exportToolGraph({
        tool: attribution.sourceDeleted ? redactOrphanedForkDefinition(tool) : tool,
        versions,
        ledger,
        trials,
        grants,
        summaries: refreshedSummaries,
      }),
      stored: storedView(versions, ledger, trials, grants, refreshedSummaries),
    },
  };
}

function latestSummary(summaries: readonly ParentSummary[]): ParentSummary | null {
  if (summaries.length === 0) {
    return null;
  }
  const ordered = [...summaries].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return left.summaryId < right.summaryId ? -1 : 1;
    }
    return left.createdAt < right.createdAt ? -1 : 1;
  });
  return ordered[ordered.length - 1] ?? null;
}

function selectionStillValid(
  projection: ReturnType<typeof buildEvidenceProjection>,
  evidenceEventIds: readonly string[],
): boolean {
  try {
    validateEvidenceSelection(projection, { evidenceEventIds });
    return true;
  } catch {
    return false;
  }
}

function storedView(
  versions: readonly ToolVersion[],
  ledger: readonly LedgerEntry[],
  trials: readonly ExperimentTrial[],
  grants: readonly PermissionGrant[],
  summaries: readonly ParentSummary[],
): StoredGraphView {
  return {
    versionIds: versions.map((version) => version.versionId),
    eventIds: ledger.map((entry) => entry.eventId),
    trialIds: trials.map((trial) => trial.trialId),
    grantIds: grants.map((grant) => grant.grantId),
    summaryIds: summaries.map((summary) => summary.summaryId),
  };
}
