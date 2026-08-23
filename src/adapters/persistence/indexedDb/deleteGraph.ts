import type { IDBPTransaction } from 'idb';

import { LedgerEntry } from '../../../core/ledger/types';
import { redactOrphanedForkDefinition } from '../../../core/reuse/orphanedFork';
import type { ChildId, ToolId } from '../../../core/schema/primitives';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import { ParentSummary } from '../../../core/schema/parentSummary';
import { PermissionGrant } from '../../../core/schema/permissionGrant';
import { ToolDefinition } from '../../../core/schema/toolDefinition';
import { ToolVersion } from '../../../core/schema/toolVersion';
import { shouldFailAfterDeleteWrite } from '../atomicCommit';
import { STORE, type TeachDasoDatabase, type TeachDasoDb } from '../database';
import { abortTransaction } from './access';

const PROFILE_GRAPH_STORES = [
  STORE.tools,
  STORE.toolVersions,
  STORE.ledgerEntries,
  STORE.trials,
  STORE.grants,
  STORE.summaries,
  STORE.childProfiles,
] as const;

type DeleteTx = IDBPTransaction<TeachDasoDb, (typeof PROFILE_GRAPH_STORES)[number][], 'readwrite'>;

type ScheduledMutation =
  | { readonly kind: 'delete'; readonly store: (typeof PROFILE_GRAPH_STORES)[number]; readonly key: string }
  | { readonly kind: 'put'; readonly store: typeof STORE.tools; readonly value: ToolDefinition };

async function scheduleToolGraph(tx: DeleteTx, toolId: ToolId): Promise<ScheduledMutation[]> {
  const scheduled: ScheduledMutation[] = [];
  const tool = await tx.objectStore(STORE.tools).get(toolId);
  if (tool !== undefined) {
    scheduled.push({ kind: 'delete', store: STORE.tools, key: toolId });
  }
  const versions = await tx.objectStore(STORE.toolVersions).index('toolId').getAll(toolId);
  for (const raw of versions) {
    scheduled.push({ kind: 'delete', store: STORE.toolVersions, key: ToolVersion.parse(raw).versionId });
  }
  const entries = await tx.objectStore(STORE.ledgerEntries).index('toolId').getAll(toolId);
  for (const raw of entries) {
    scheduled.push({ kind: 'delete', store: STORE.ledgerEntries, key: LedgerEntry.parse(raw).eventId });
  }
  const trials = await tx.objectStore(STORE.trials).index('toolId').getAll(toolId);
  for (const raw of trials) {
    scheduled.push({ kind: 'delete', store: STORE.trials, key: ExperimentTrial.parse(raw).trialId });
  }
  const grants = await tx.objectStore(STORE.grants).index('toolId').getAll(toolId);
  for (const raw of grants) {
    scheduled.push({ kind: 'delete', store: STORE.grants, key: PermissionGrant.parse(raw).grantId });
  }
  const summaries = await tx.objectStore(STORE.summaries).index('toolId').getAll(toolId);
  for (const raw of summaries) {
    scheduled.push({ kind: 'delete', store: STORE.summaries, key: ParentSummary.parse(raw).summaryId });
  }
  return scheduled;
}

async function scheduleSurvivingForkRedaction(
  tx: DeleteTx,
  deletedChildId: ChildId,
): Promise<ScheduledMutation[]> {
  const scheduled: ScheduledMutation[] = [];
  const allTools = await tx.objectStore(STORE.tools).getAll();
  for (const raw of allTools) {
    const parsed = ToolDefinition.parse(raw);
    if (parsed.forkedFrom === undefined || parsed.forkedFrom.ownerChildId !== deletedChildId) {
      continue;
    }
    if (parsed.ownerChildId === deletedChildId) {
      continue;
    }
    scheduled.push({
      kind: 'put',
      store: STORE.tools,
      value: redactOrphanedForkDefinition(parsed),
    });
    const summaries = await tx.objectStore(STORE.summaries).index('toolId').getAll(parsed.toolId);
    for (const summary of summaries) {
      scheduled.push({
        kind: 'delete',
        store: STORE.summaries,
        key: ParentSummary.parse(summary).summaryId,
      });
    }
  }
  return scheduled;
}

async function applyMutation(tx: DeleteTx, mutation: ScheduledMutation): Promise<void> {
  if (mutation.kind === 'delete') {
    await tx.objectStore(mutation.store).delete(mutation.key);
    return;
  }
  await tx.objectStore(STORE.tools).put(mutation.value);
}

async function applyScheduled(tx: DeleteTx, scheduled: readonly ScheduledMutation[]): Promise<void> {
  if (scheduled.length === 0) {
    await tx.done;
    return;
  }
  const first = scheduled[0];
  if (first === undefined) {
    await tx.done;
    return;
  }
  await applyMutation(tx, first);
  if (shouldFailAfterDeleteWrite()) {
    await abortTransaction(tx, 'injected delete failure after store mutation');
  }
  for (const next of scheduled.slice(1)) {
    await applyMutation(tx, next);
  }
  await tx.done;
}

export async function deleteIndexedDbToolGraph(
  database: TeachDasoDatabase,
  toolId: ToolId,
): Promise<void> {
  const tx = database.transaction([...PROFILE_GRAPH_STORES], 'readwrite');
  const scheduled = await scheduleToolGraph(tx, toolId);
  await applyScheduled(tx, scheduled);
}

export async function deleteIndexedDbProfileGraph(
  database: TeachDasoDatabase,
  childId: ChildId,
): Promise<void> {
  const tx = database.transaction([...PROFILE_GRAPH_STORES], 'readwrite');
  const ownedRaw = await tx.objectStore(STORE.tools).index('ownerChildId').getAll(childId);
  const scheduled: ScheduledMutation[] = [];
  for (const raw of ownedRaw) {
    const tool = ToolDefinition.parse(raw);
    scheduled.push(...(await scheduleToolGraph(tx, tool.toolId)));
  }
  const profile = await tx.objectStore(STORE.childProfiles).get(childId);
  if (profile !== undefined) {
    scheduled.push({ kind: 'delete', store: STORE.childProfiles, key: childId });
  }
  scheduled.push(...(await scheduleSurvivingForkRedaction(tx, childId)));
  await applyScheduled(tx, scheduled);
}
