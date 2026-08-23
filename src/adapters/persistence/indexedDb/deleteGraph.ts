import type { IDBPTransaction } from 'idb';

import { LedgerEntry } from '../../../core/ledger/types';
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

interface ScheduledDelete {
  readonly store: (typeof PROFILE_GRAPH_STORES)[number];
  readonly key: string;
}

async function scheduleToolGraph(tx: DeleteTx, toolId: ToolId): Promise<ScheduledDelete[]> {
  const scheduled: ScheduledDelete[] = [];
  const tool = await tx.objectStore(STORE.tools).get(toolId);
  if (tool !== undefined) {
    scheduled.push({ store: STORE.tools, key: toolId });
  }
  const versions = await tx.objectStore(STORE.toolVersions).index('toolId').getAll(toolId);
  for (const raw of versions) {
    scheduled.push({ store: STORE.toolVersions, key: ToolVersion.parse(raw).versionId });
  }
  const entries = await tx.objectStore(STORE.ledgerEntries).index('toolId').getAll(toolId);
  for (const raw of entries) {
    scheduled.push({ store: STORE.ledgerEntries, key: LedgerEntry.parse(raw).eventId });
  }
  const trials = await tx.objectStore(STORE.trials).index('toolId').getAll(toolId);
  for (const raw of trials) {
    scheduled.push({ store: STORE.trials, key: ExperimentTrial.parse(raw).trialId });
  }
  const grants = await tx.objectStore(STORE.grants).index('toolId').getAll(toolId);
  for (const raw of grants) {
    scheduled.push({ store: STORE.grants, key: PermissionGrant.parse(raw).grantId });
  }
  const summaries = await tx.objectStore(STORE.summaries).index('toolId').getAll(toolId);
  for (const raw of summaries) {
    scheduled.push({ store: STORE.summaries, key: ParentSummary.parse(raw).summaryId });
  }
  return scheduled;
}

async function applyScheduled(tx: DeleteTx, scheduled: readonly ScheduledDelete[]): Promise<void> {
  if (scheduled.length === 0) {
    await tx.done;
    return;
  }
  const first = scheduled[0];
  if (first === undefined) {
    await tx.done;
    return;
  }
  await tx.objectStore(first.store).delete(first.key);
  if (shouldFailAfterDeleteWrite()) {
    await abortTransaction(tx, 'injected delete failure after store mutation');
  }
  for (const next of scheduled.slice(1)) {
    await tx.objectStore(next.store).delete(next.key);
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
  const scheduled: ScheduledDelete[] = [];
  for (const raw of ownedRaw) {
    const tool = ToolDefinition.parse(raw);
    scheduled.push(...(await scheduleToolGraph(tx, tool.toolId)));
  }
  const profile = await tx.objectStore(STORE.childProfiles).get(childId);
  if (profile !== undefined) {
    scheduled.push({ store: STORE.childProfiles, key: childId });
  }
  await applyScheduled(tx, scheduled);
}
