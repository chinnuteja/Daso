import type { AuthorshipEvent } from '../schema/authorshipEvent';
import type { ChildProfile } from '../schema/childProfile';
import type { ExperimentTrial } from '../schema/experimentTrial';
import type { PermissionGrant } from '../schema/permissionGrant';
import type { ParentSummary } from '../schema/parentSummary';
import type {
  ChildId,
  DrawDocumentId,
  GrantId,
  MarkSnapshotId,
  ToolId,
  ToolVersionId,
  TrialId,
} from '../schema/primitives';
import type { DrawDocument, MarkSnapshot } from '../draw/schema';
import type { ForkSnapshot } from '../reuse/types';
import type { CapabilityLedgerEntry } from '../capability/ledger';
import type { CapabilityDefinition, DrawCapabilityVersion } from '../capability/types';
import type { SavedCapabilityVersion } from '../capability/types';
import type { ApprovedCapabilityCommit } from '../capability/approval';
import type { ToolDefinition } from '../schema/toolDefinition';
import type { ToolVersion } from '../schema/toolVersion';
import type { LedgerEntry } from '../ledger/types';

/**
 * Persistence contracts. Interfaces only: Phase 2 implements them over IndexedDB and Phase 3
 * may use an in-memory implementation behind the same interfaces. Because the domain only
 * ever sees these shapes, nothing about the storage engine can leak into the kernel.
 *
 * Deletion appears as whole-stream removal (specification section 11.4 requires real
 * deletion). There is deliberately no "update event" or "edit event" anywhere: an append-only
 * history is only append-only if the storage contract makes editing unexpressible.
 */

export interface ChildProfileRepository {
  get(childId: ChildId): Promise<ChildProfile | null>;
  save(profile: ChildProfile): Promise<void>;
  deleteProfile(childId: ChildId): Promise<void>;
  /**
   * One all-or-nothing commit: every owned tool graph plus this profile.
   * Does not add an eighth repository family.
   */
  deleteProfileGraph(childId: ChildId): Promise<void>;
}

export interface ToolDefinitionRepository {
  get(toolId: ToolId): Promise<ToolDefinition | null>;
  listByOwner(childId: ChildId): Promise<readonly ToolDefinition[]>;
  save(definition: ToolDefinition): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
  /**
   * One all-or-nothing commit of the complete tool graph. Does not add an
   * eighth repository family. Never deletes the owner profile.
   */
  deleteToolGraph(toolId: ToolId): Promise<void>;
}

export interface ToolVersionRepository {
  get(versionId: ToolVersionId): Promise<ToolVersion | null>;
  listByTool(toolId: ToolId): Promise<readonly ToolVersion[]>;
  /** Rejects an identifier that already exists: a compiled version is immutable. */
  save(version: ToolVersion): Promise<void>;
  /**
   * One all-or-nothing commit: persist the immutable version and activate it on the
   * tool definition. Does not add an eighth repository family.
   */
  saveAndActivate(version: ToolVersion, definition: ToolDefinition): Promise<void>;
  /**
   * One all-or-nothing commit of a second-child fork: target ledger, immutable
   * version, and definition. Does not add an eighth repository family.
   */
  saveForkSnapshot(snapshot: ForkSnapshot): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

export interface AuthorshipLedgerRepository {
  /**
   * Appends one entry. Rejects a duplicate event id and a non-monotonic sequence, which is
   * what makes a silently dropped or reordered event impossible rather than merely unlikely.
   */
  append(entry: LedgerEntry): Promise<void>;
  listByTool(toolId: ToolId): Promise<readonly LedgerEntry[]>;
  /** The section 9.4 read model, with `childApproved` derived from approval entries. */
  listRecordsByTool(toolId: ToolId): Promise<readonly AuthorshipEvent[]>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

export interface ExperimentTrialRepository {
  get(trialId: TrialId): Promise<ExperimentTrial | null>;
  listByTool(toolId: ToolId): Promise<readonly ExperimentTrial[]>;
  save(trial: ExperimentTrial): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

export interface PermissionGrantRepository {
  get(grantId: GrantId): Promise<PermissionGrant | null>;
  listByTool(toolId: ToolId): Promise<readonly PermissionGrant[]>;
  save(grant: PermissionGrant): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

export interface ParentSummaryRepository {
  listByTool(toolId: ToolId): Promise<readonly ParentSummary[]>;
  save(summary: ParentSummary): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

/**
 * The only new persistence family in the Kale migration. It deliberately owns both mutable
 * drawing documents and immutable selected-mark snapshots, instead of scattering Draw state
 * across generic blobs or adding a repository per UI gesture.
 */
export interface DrawAssetRepository {
  getDocument(documentId: DrawDocumentId): Promise<DrawDocument | null>;
  listDocumentsByOwner(childId: ChildId): Promise<readonly DrawDocument[]>;
  saveDocument(document: DrawDocument): Promise<void>;
  getMarkSnapshot(snapshotId: MarkSnapshotId): Promise<MarkSnapshot | null>;
  listMarkSnapshotsByTool(toolId: ToolId): Promise<readonly MarkSnapshot[]>;
  /** Rejects duplicate ids: an approved source mark cannot be replaced. */
  saveMarkSnapshot(snapshot: MarkSnapshot): Promise<void>;
  deleteByTool(toolId: ToolId): Promise<void>;
}

/**
 * The generic v2 authority stream. Draw uses it first; Flight will use the same append/review/
 * approval ordering later rather than inventing a second approval mechanism.
 */
export interface CapabilityLifecycleRepository {
  commitApprovedCapability(input: ApprovedCapabilityCommit): Promise<SavedCapabilityVersion>;
  getVersion(versionId: ToolVersionId): Promise<SavedCapabilityVersion | null>;
  getDefinition(toolId: ToolId): Promise<CapabilityDefinition | null>;
  listDefinitionsByOwner(childId: ChildId): Promise<readonly CapabilityDefinition[]>;
  listEntriesByTool(toolId: ToolId): Promise<readonly CapabilityLedgerEntry[]>;
  append(entry: CapabilityLedgerEntry): Promise<void>;
  /** Approval is the only method that creates the immutable snapshot/version and active pointer. */
  commitDrawApproval(input: {
    readonly definition: CapabilityDefinition;
    readonly version: DrawCapabilityVersion;
    readonly snapshot: MarkSnapshot;
    readonly approval: CapabilityLedgerEntry;
  }): Promise<DrawCapabilityVersion>;
  getDrawVersion(versionId: ToolVersionId): Promise<DrawCapabilityVersion | null>;
  listDrawVersionsByTool(toolId: ToolId): Promise<readonly DrawCapabilityVersion[]>;
}

/** The complete persistence surface the domain is allowed to ask for. */
export interface Repositories {
  readonly profiles: ChildProfileRepository;
  readonly tools: ToolDefinitionRepository;
  readonly versions: ToolVersionRepository;
  readonly ledger: AuthorshipLedgerRepository;
  readonly trials: ExperimentTrialRepository;
  readonly grants: PermissionGrantRepository;
  readonly summaries: ParentSummaryRepository;
  readonly drawAssets: DrawAssetRepository;
  readonly capabilities: CapabilityLifecycleRepository;
}
