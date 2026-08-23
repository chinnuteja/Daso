import { replay } from '../runtime';
import type { LedgerEntry } from '../ledger/types';
import type { ExperimentTrial } from '../schema/experimentTrial';
import type { ToolDefinition } from '../schema/toolDefinition';
import type { ToolVersion } from '../schema/toolVersion';
import { EvidenceProjection, type EvidenceItem } from './schema';

export function buildEvidenceProjection(input: {
  readonly tool: ToolDefinition;
  readonly ownerDisplayName: string;
  readonly version: ToolVersion;
  readonly ledger: readonly LedgerEntry[];
  readonly trials: readonly ExperimentTrial[];
}): EvidenceProjection {
  const runtime = replay(input.version, input.trials);
  const approved = new Set(
    input.ledger
      .filter((entry): entry is Extract<LedgerEntry, { entryKind: 'approval' }> =>
        entry.entryKind === 'approval' && entry.actor === 'child',
      )
      .map((entry) => entry.approves),
  );

  const items: EvidenceItem[] = [];
  items.push({
    kind: 'version',
    referenceId: input.version.versionId,
    ruleIds: input.version.rules.map((rule) => rule.ruleId),
    isActive: input.tool.currentVersionId === input.version.versionId,
  });

  for (const trial of input.trials) {
    const projection = runtime.projections.find((candidate) => candidate.trialId === trial.trialId);
    items.push({
      kind: 'trial',
      referenceId: trial.trialId,
      designName: trial.designName,
      obstruction: trial.obstruction,
      validUnderCurrentVersion: projection?.validUnderCurrentVersion ?? trial.validUnderCurrentVersion,
    });
  }

  for (const entry of input.ledger) {
    if (entry.entryKind !== 'candidate' || !approved.has(entry.eventId)) {
      continue;
    }
    if (entry.type !== 'definition_decision' && entry.type !== 'rule_correction') {
      continue;
    }
    const ruleId =
      entry.candidateMutation.operation === 'add_rule' ? entry.candidateMutation.rule.ruleId : undefined;
    items.push({
      kind: 'candidate',
      referenceId: entry.eventId,
      type: entry.type,
      approved: true,
      originalInput: entry.originalInput,
      ...(ruleId === undefined ? {} : { ruleId }),
    });
  }

  const unique = new Map<string, EvidenceItem>();
  for (const item of items) {
    unique.set(item.referenceId, item);
  }
  const sorted = [...unique.values()].sort((left, right) =>
    left.referenceId < right.referenceId ? -1 : 1,
  );
  return EvidenceProjection.parse({
    toolId: input.tool.toolId,
    toolDisplayName: input.tool.displayName,
    ownerDisplayName: input.ownerDisplayName,
    items: sorted,
  });
}
