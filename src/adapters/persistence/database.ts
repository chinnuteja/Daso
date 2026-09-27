import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * IndexedDB layout for Teach Daso. Every schema step is additive: it only creates stores
 * and indexes. No migration may rewrite, renumber, or reorder a ledger entry.
 */

export const DATABASE_NAME = 'teach-daso';
export const DATABASE_VERSION = 2;

export const STORE = {
  childProfiles: 'childProfiles',
  tools: 'tools',
  toolVersions: 'toolVersions',
  ledgerEntries: 'ledgerEntries',
  trials: 'trials',
  grants: 'grants',
  summaries: 'summaries',
  drawDocuments: 'drawDocuments',
  markSnapshots: 'markSnapshots',
  meta: 'meta',
} as const;

export class PersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export interface TeachDasoDb extends DBSchema {
  childProfiles: { key: string; value: unknown };
  tools: { key: string; value: unknown; indexes: { ownerChildId: string } };
  toolVersions: { key: string; value: unknown; indexes: { toolId: string } };
  ledgerEntries: {
    key: string;
    value: unknown;
    indexes: { toolId: string; toolIdSequence: [string, number] };
  };
  trials: { key: string; value: unknown; indexes: { toolId: string } };
  grants: { key: string; value: unknown; indexes: { toolId: string } };
  summaries: { key: string; value: unknown; indexes: { toolId: string } };
  drawDocuments: { key: string; value: unknown; indexes: { ownerChildId: string } };
  markSnapshots: {
    key: string;
    value: unknown;
    indexes: { toolId: string; sourceDocumentId: string };
  };
  meta: { key: string; value: unknown };
}

export type TeachDasoDatabase = IDBPDatabase<TeachDasoDb>;

export async function openTeachDasoDatabase(
  name: string = DATABASE_NAME,
): Promise<TeachDasoDatabase> {
  return openDB<TeachDasoDb>(name, DATABASE_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore(STORE.childProfiles, { keyPath: 'childId' });

        const tools = database.createObjectStore(STORE.tools, { keyPath: 'toolId' });
        tools.createIndex('ownerChildId', 'ownerChildId');

        const versions = database.createObjectStore(STORE.toolVersions, { keyPath: 'versionId' });
        versions.createIndex('toolId', 'toolId');

        const ledger = database.createObjectStore(STORE.ledgerEntries, { keyPath: 'eventId' });
        ledger.createIndex('toolId', 'toolId');
        ledger.createIndex('toolIdSequence', ['toolId', 'sequence'], { unique: true });

        const trials = database.createObjectStore(STORE.trials, { keyPath: 'trialId' });
        trials.createIndex('toolId', 'toolId');

        const grants = database.createObjectStore(STORE.grants, { keyPath: 'grantId' });
        grants.createIndex('toolId', 'toolId');

        const summaries = database.createObjectStore(STORE.summaries, { keyPath: 'summaryId' });
        summaries.createIndex('toolId', 'toolId');

        database.createObjectStore(STORE.meta, { keyPath: 'key' });
      }
      if (oldVersion < 2) {
        const documents = database.createObjectStore(STORE.drawDocuments, { keyPath: 'documentId' });
        documents.createIndex('ownerChildId', 'ownerChildId');

        const snapshots = database.createObjectStore(STORE.markSnapshots, { keyPath: 'snapshotId' });
        snapshots.createIndex('toolId', 'toolId');
        snapshots.createIndex('sourceDocumentId', 'sourceDocumentId');
      }
    },
  });
}
