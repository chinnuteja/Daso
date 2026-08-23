import { z } from 'zod';

import { bodyFromVersion } from '../compiler';
import { foldApprovedEvents } from '../ledger/fold';
import { LedgerEntry } from '../ledger/types';
import { ExperimentTrial } from '../schema/experimentTrial';
import { ParentSummary } from '../schema/parentSummary';
import { PermissionGrant } from '../schema/permissionGrant';
import { ToolDefinition } from '../schema/toolDefinition';
import { ToolVersion } from '../schema/toolVersion';
import { canonicalJson } from '../serialization/canonicalJson';

export const ToolExport = z.strictObject({
  format: z.literal('teach-daso/tool-export-v1'),
  tool: ToolDefinition,
  versions: z.array(ToolVersion),
  ledger: z.array(LedgerEntry),
  trials: z.array(ExperimentTrial),
  grants: z.array(PermissionGrant),
  summaries: z.array(ParentSummary),
});
export type ToolExport = z.infer<typeof ToolExport>;

export class ToolExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolExportError';
  }
}

export function exportToolGraph(input: {
  readonly tool: ToolDefinition;
  readonly versions: readonly ToolVersion[];
  readonly ledger: readonly LedgerEntry[];
  readonly trials: readonly ExperimentTrial[];
  readonly grants: readonly PermissionGrant[];
  readonly summaries: readonly ParentSummary[];
}): ToolExport {
  const tool = ToolDefinition.parse(input.tool);
  const versions = [...input.versions]
    .map((version) => ToolVersion.parse(version))
    .sort((left, right) => (left.versionId < right.versionId ? -1 : 1));
  const ledger = [...input.ledger]
    .map((entry) => LedgerEntry.parse(entry))
    .sort((left, right) => left.sequence - right.sequence);
  const trials = [...input.trials]
    .map((trial) => ExperimentTrial.parse(trial))
    .sort((left, right) => (left.trialId < right.trialId ? -1 : 1));
  const grants = [...input.grants]
    .map((grant) => PermissionGrant.parse(grant))
    .sort((left, right) => (left.grantId < right.grantId ? -1 : 1));
  const summaries = [...input.summaries]
    .map((summary) => ParentSummary.parse(summary))
    .sort((left, right) => (left.summaryId < right.summaryId ? -1 : 1));

  const active = versions.find((version) => version.versionId === tool.currentVersionId);
  if (active === undefined) {
    throw new ToolExportError('export rejected: active version is missing');
  }
  if (active.toolId !== tool.toolId) {
    throw new ToolExportError('export rejected: active version belongs to another tool');
  }
  for (const version of versions) {
    if (version.toolId !== tool.toolId) {
      throw new ToolExportError('export rejected: a version belongs to another tool');
    }
  }
  for (const entry of ledger) {
    if (entry.toolId !== tool.toolId) {
      throw new ToolExportError('export rejected: a ledger entry belongs to another tool');
    }
  }
  for (const trial of trials) {
    if (trial.toolId !== tool.toolId) {
      throw new ToolExportError('export rejected: a trial belongs to another tool');
    }
  }
  for (const grant of grants) {
    if (grant.toolId !== tool.toolId) {
      throw new ToolExportError('export rejected: a grant belongs to another tool');
    }
  }
  for (const summary of summaries) {
    if (summary.toolId !== tool.toolId) {
      throw new ToolExportError('export rejected: a summary belongs to another tool');
    }
  }
  if (canonicalJson(foldApprovedEvents(ledger)) !== canonicalJson(bodyFromVersion(active))) {
    throw new ToolExportError('export rejected: ledger fold does not match the active version');
  }

  return ToolExport.parse({
    format: 'teach-daso/tool-export-v1',
    tool,
    versions,
    ledger,
    trials,
    grants,
    summaries,
  });
}
