import { LedgerEntry } from '../../../core/ledger/types';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ParentSummary } from '../../../core/schema/parentSummary';
import { PermissionGrant } from '../../../core/schema/permissionGrant';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { PersistenceError } from '../database';
import { shouldFailAfterDeleteWrite } from '../atomicCommit';
import type { MemoryRecords } from './store';

interface MemorySnapshot {
  readonly profiles: Map<string, unknown>;
  readonly tools: Map<string, unknown>;
  readonly versions: Map<string, unknown>;
  readonly ledger: Map<string, unknown>;
  readonly trials: Map<string, unknown>;
  readonly grants: Map<string, unknown>;
  readonly summaries: Map<string, unknown>;
}

type StoreName = Exclude<keyof MemoryRecords, 'meta'>;

interface ScheduledDelete {
  readonly store: StoreName;
  readonly key: string;
}

function snapshotRecords(records: MemoryRecords): MemorySnapshot {
  return {
    profiles: new Map(records.profiles),
    tools: new Map(records.tools),
    versions: new Map(records.versions),
    ledger: new Map(records.ledger),
    trials: new Map(records.trials),
    grants: new Map(records.grants),
    summaries: new Map(records.summaries),
  };
}

function restoreRecords(records: MemoryRecords, snapshot: MemorySnapshot): void {
  const stores: readonly StoreName[] = [
    'profiles',
    'tools',
    'versions',
    'ledger',
    'trials',
    'grants',
    'summaries',
  ];
  for (const store of stores) {
    records[store].clear();
    for (const [key, value] of snapshot[store]) {
      records[store].set(key, value);
    }
  }
}

function scheduleToolGraph(records: MemoryRecords, toolId: ToolId): ScheduledDelete[] {
  const scheduled: ScheduledDelete[] = [];
  if (records.tools.has(toolId)) {
    scheduled.push({ store: 'tools', key: toolId });
  }
  for (const [versionId, raw] of records.versions.entries()) {
    if (ToolVersion.parse(raw).toolId === toolId) {
      scheduled.push({ store: 'versions', key: versionId });
    }
  }
  for (const [eventId, raw] of records.ledger.entries()) {
    if (LedgerEntry.parse(raw).toolId === toolId) {
      scheduled.push({ store: 'ledger', key: eventId });
    }
  }
  for (const [trialId, raw] of records.trials.entries()) {
    if (ExperimentTrial.parse(raw).toolId === toolId) {
      scheduled.push({ store: 'trials', key: trialId });
    }
  }
  for (const [grantId, raw] of records.grants.entries()) {
    if (PermissionGrant.parse(raw).toolId === toolId) {
      scheduled.push({ store: 'grants', key: grantId });
    }
  }
  for (const [summaryId, raw] of records.summaries.entries()) {
    if (ParentSummary.parse(raw).toolId === toolId) {
      scheduled.push({ store: 'summaries', key: summaryId });
    }
  }
  return scheduled;
}

function applyScheduled(records: MemoryRecords, scheduled: readonly ScheduledDelete[]): void {
  if (scheduled.length === 0) {
    return;
  }
  const snapshot = snapshotRecords(records);
  try {
    const first = scheduled[0];
    if (first === undefined) {
      return;
    }
    records[first.store].delete(first.key);
    if (shouldFailAfterDeleteWrite()) {
      throw new PersistenceError('injected delete failure after store mutation');
    }
    for (const next of scheduled.slice(1)) {
      records[next.store].delete(next.key);
    }
  } catch (error) {
    restoreRecords(records, snapshot);
    throw error;
  }
}

export function deleteMemoryToolGraph(records: MemoryRecords, toolId: ToolId): void {
  applyScheduled(records, scheduleToolGraph(records, toolId));
}

export function deleteMemoryProfileGraph(records: MemoryRecords, childId: ChildId): void {
  const owned: ToolId[] = [];
  for (const raw of records.tools.values()) {
    const parsed = ToolDefinition.parse(raw);
    if (parsed.ownerChildId === childId) {
      owned.push(parsed.toolId);
    }
  }
  const scheduled: ScheduledDelete[] = [];
  for (const toolId of owned) {
    scheduled.push(...scheduleToolGraph(records, toolId));
  }
  if (records.profiles.has(childId)) {
    scheduled.push({ store: 'profiles', key: childId });
  }
  applyScheduled(records, scheduled);
}
