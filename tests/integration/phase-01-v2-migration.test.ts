import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';
import { deleteDB, openDB } from 'idb';

import { DATABASE_VERSION, openTeachDasoDatabase, STORE } from '../../src/adapters/persistence';
import { createIndexedDbRepositories } from '../../src/adapters/persistence/indexedDb';

const name = 'teach-daso-phase-01-migration';

afterEach(async () => {
  await deleteDB(name);
});

describe('Additive persistence migration', () => {
  it('keeps a v1 profile byte-for-byte while adding Draw and capability-lifecycle stores', async () => {
    const legacy = await openDB(name, 1, {
      upgrade(database) {
        database.createObjectStore('childProfiles', { keyPath: 'childId' });
        const tools = database.createObjectStore('tools', { keyPath: 'toolId' });
        tools.createIndex('ownerChildId', 'ownerChildId');
        const versions = database.createObjectStore('toolVersions', { keyPath: 'versionId' });
        versions.createIndex('toolId', 'toolId');
        const ledger = database.createObjectStore('ledgerEntries', { keyPath: 'eventId' });
        ledger.createIndex('toolId', 'toolId');
        ledger.createIndex('toolIdSequence', ['toolId', 'sequence'], { unique: true });
        const trials = database.createObjectStore('trials', { keyPath: 'trialId' });
        trials.createIndex('toolId', 'toolId');
        const grants = database.createObjectStore('grants', { keyPath: 'grantId' });
        grants.createIndex('toolId', 'toolId');
        const summaries = database.createObjectStore('summaries', { keyPath: 'summaryId' });
        summaries.createIndex('toolId', 'toolId');
        database.createObjectStore('meta', { keyPath: 'key' });
      },
    });
    const profile = { childId: 'child_local_01', displayName: 'Maya', untouched: true };
    await legacy.put(STORE.childProfiles, profile);
    legacy.close();

    const migrated = await openTeachDasoDatabase(name);
    expect(DATABASE_VERSION).toBe(3);
    expect(await migrated.get(STORE.childProfiles, profile.childId)).toEqual(profile);
    expect(migrated.objectStoreNames.contains(STORE.drawDocuments)).toBe(true);
    expect(migrated.objectStoreNames.contains(STORE.markSnapshots)).toBe(true);
    expect(migrated.transaction(STORE.drawDocuments).store.indexNames.contains('ownerChildId')).toBe(true);
    expect(migrated.transaction(STORE.markSnapshots).store.indexNames.contains('toolId')).toBe(true);
    expect(migrated.objectStoreNames.contains(STORE.capabilityDefinitions)).toBe(true);
    expect(migrated.objectStoreNames.contains(STORE.capabilityVersions)).toBe(true);
    expect(migrated.objectStoreNames.contains(STORE.capabilityEntries)).toBe(true);
    const repositories = createIndexedDbRepositories(migrated);
    expect(await repositories.drawAssets.listDocumentsByOwner('child_local_01')).toEqual([]);
    expect(await repositories.capabilities.listDefinitionsByOwner('child_local_01')).toEqual([]);
    migrated.close();
  });
});
