import type { LedgerEntry } from '../ledger/types';
import type { ChildId, EventId, IsoTimestamp, ToolId, ToolVersionId } from '../schema/primitives';
import type { ToolDefinition } from '../schema/toolDefinition';
import type { ToolVersion } from '../schema/toolVersion';

export class ForkBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForkBuildError';
  }
}

export interface ForkSnapshot {
  readonly definition: ToolDefinition;
  readonly version: ToolVersion;
  readonly ledger: readonly LedgerEntry[];
}

export interface BuildForkSnapshotInput {
  readonly sourceDefinition: ToolDefinition;
  readonly sourceVersion: ToolVersion;
  readonly sourceLedger: readonly LedgerEntry[];
  readonly targetToolId: ToolId;
  readonly targetOwnerChildId: ChildId;
  readonly targetDisplayName: string;
  readonly replacementEventIds: readonly EventId[];
  readonly targetVersionId: ToolVersionId;
  readonly forkedAt: IsoTimestamp;
}
