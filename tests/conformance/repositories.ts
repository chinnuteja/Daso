import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  persistGraph,
  setFailAfterDeleteWrite,
  setFailAfterForkWrite,
  setFailAfterVersionWrite,
} from '../../src/adapters/persistence';
import { allocateTargetToolId, buildForkSnapshot, ORPHANED_FORK_DISPLAY_NAME } from '../../src/core/reuse';
import { EventId } from '../../src/core/schema/primitives';
import { LEO_PROFILE } from '../../src/ui/flows/runner/secondChild';
import {
  duplicateTargetEventId,
  gappedTargetSequence,
  omitUnapprovedAndCompact,
  sameOwnerFork,
} from '../support/forkAttacks';
import { PersistenceError } from '../../src/adapters/persistence/database';
import type { Repositories } from '../../src/core/ports/repositories';
import { ExperimentTrial } from '../../src/core/schema/experimentTrial';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * One repository contract, executed once per implementation. Adding an assertion here
 * asserts it for both memory and IndexedDB; skipping it for one of them is a failed test,
 * not a configuration option.
 */

export interface ConformanceHarness {
  readonly repositories: Repositories;
  teardown(): Promise<void>;
}

export function defineRepositoryConformance(
  implementationName: string,
  open: () => Promise<ConformanceHarness>,
): void {
  describe(`repository conformance (${implementationName})`, () => {
    let harness: ConformanceHarness;

    beforeEach(async () => {
      harness = await open();
    });

    afterEach(async () => {
      setFailAfterVersionWrite(false);
      setFailAfterForkWrite(false);
      setFailAfterDeleteWrite(false);
      await harness.teardown();
    });

    it('saves and reads a child profile', async () => {
      const graph = flightLabGraph();
      await harness.repositories.profiles.save(graph.profile);
      const loaded = await harness.repositories.profiles.get(graph.profile.childId);
      expect(canonicalJson(loaded)).toBe(canonicalJson(graph.profile));
    });

    it('returns null for a missing profile', async () => {
      expect(await harness.repositories.profiles.get('child_missing_01')).toBeNull();
    });

    it('round-trips the Flight Lab graph', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);

      const profile = await harness.repositories.profiles.get(graph.profile.childId);
      const tool = await harness.repositories.tools.get(graph.tools[0]?.toolId ?? '');
      const versions = await harness.repositories.versions.listByTool('mayas-flight-lab');
      const entries = await harness.repositories.ledger.listByTool('mayas-flight-lab');
      const trials = await harness.repositories.trials.listByTool('mayas-flight-lab');
      const grants = await harness.repositories.grants.listByTool('mayas-flight-lab');
      const summaries = await harness.repositories.summaries.listByTool('mayas-flight-lab');
      const records = await harness.repositories.ledger.listRecordsByTool('mayas-flight-lab');

      expect(canonicalJson(profile)).toBe(canonicalJson(graph.profile));
      expect(canonicalJson(tool)).toBe(canonicalJson(graph.tools[0]));
      expect(canonicalJson(versions)).toBe(canonicalJson(graph.versions));
      expect(canonicalJson(entries)).toBe(canonicalJson(flightLabLedger));
      expect(canonicalJson(trials)).toBe(canonicalJson(graph.trials));
      expect(canonicalJson(grants)).toBe(canonicalJson(graph.grants));
      expect(canonicalJson(summaries)).toBe(canonicalJson(graph.summaries));

      const correction = records.find((record) => record.eventId === 'event_014');
      const unapprovedNote = records.find((record) => record.eventId === 'event_011');
      expect(correction?.childApproved).toBe(true);
      expect(unapprovedNote?.childApproved).toBe(false);
    });

    it('lists the ledger in ascending sequence order', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      const entries = await harness.repositories.ledger.listByTool('mayas-flight-lab');
      const sequences = entries.map((entry) => entry.sequence);
      expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
      expect(sequences[0]).toBe(1);
      expect(sequences[sequences.length - 1]).toBe(15);
    });

    it('rejects a duplicate event id', async () => {
      const graph = flightLabGraph();
      const first = graph.entries[0];
      expect(first).toBeDefined();
      if (first === undefined) {
        return;
      }
      await harness.repositories.ledger.append(first);
      await expect(harness.repositories.ledger.append(first)).rejects.toThrow();
    });

    it('rejects a sequence that does not strictly follow the highest', async () => {
      const graph = flightLabGraph();
      const first = graph.entries[0];
      const third = graph.entries[2];
      expect(first).toBeDefined();
      expect(third).toBeDefined();
      if (first === undefined || third === undefined) {
        return;
      }
      await harness.repositories.ledger.append(first);
      await expect(harness.repositories.ledger.append(third)).rejects.toThrow();
    });

    it('rejects a second write of an existing version id', async () => {
      const graph = flightLabGraph();
      const version = graph.versions[1];
      expect(version).toBeDefined();
      if (version === undefined) {
        return;
      }
      await harness.repositories.versions.save(version);
      await expect(harness.repositories.versions.save(version)).rejects.toBeInstanceOf(
        PersistenceError,
      );
    });

    it('returns tool versions deeply frozen', async () => {
      const graph = flightLabGraph();
      const version = graph.versions[1];
      expect(version).toBeDefined();
      if (version === undefined) {
        return;
      }
      await harness.repositories.versions.save(version);
      const loaded = await harness.repositories.versions.get(version.versionId);
      expect(loaded).not.toBeNull();
      expect(Object.isFrozen(loaded)).toBe(true);
      expect(Object.isFrozen(loaded?.rules)).toBe(true);
    });

    it('rejects a trial carrying an extra unknown key', async () => {
      const graph = flightLabGraph();
      const trial = graph.trials[0];
      expect(trial).toBeDefined();
      if (trial === undefined) {
        return;
      }
      const extra = { ...trial, extraUnknown: 'creep' };
      await expect(
        harness.repositories.trials.save(extra as never),
      ).rejects.toThrow();
      expect(ExperimentTrial.safeParse(extra).success).toBe(false);
    });

    it('lists tools by owner', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      const listed = await harness.repositories.tools.listByOwner('child_local_01');
      expect(listed.map((tool) => tool.toolId)).toEqual(['mayas-flight-lab']);
    });

    it('commits a version and definition atomically', async () => {
      const graph = flightLabGraph();
      const version = graph.versions[0];
      const definition = graph.tools[0];
      expect(version).toBeDefined();
      expect(definition).toBeDefined();
      if (version === undefined || definition === undefined) {
        return;
      }
      const activating = {
        ...definition,
        currentVersionId: version.versionId,
      };
      await harness.repositories.versions.saveAndActivate(version, activating);
      expect(canonicalJson(await harness.repositories.versions.get(version.versionId))).toBe(
        canonicalJson(version),
      );
      expect((await harness.repositories.tools.get(definition.toolId))?.currentVersionId).toBe(
        version.versionId,
      );
    });

    it('rolls back version and pointer when compilation fails after the version write', async () => {
      const graph = flightLabGraph();
      const version = graph.versions[0];
      const definition = graph.tools[0];
      expect(version).toBeDefined();
      expect(definition).toBeDefined();
      if (version === undefined || definition === undefined) {
        return;
      }
      setFailAfterVersionWrite(true);
      await expect(
        harness.repositories.versions.saveAndActivate(version, {
          ...definition,
          currentVersionId: version.versionId,
        }),
      ).rejects.toThrow(/injected compilation failure/u);
      expect(await harness.repositories.versions.get(version.versionId)).toBeNull();
      expect(await harness.repositories.tools.get(definition.toolId)).toBeNull();
    });

    it('leaves the active pointer unchanged when a duplicate version is activated', async () => {
      const graph = flightLabGraph();
      const first = graph.versions[0];
      const second = graph.versions[1];
      const definition = graph.tools[0];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(definition).toBeDefined();
      if (first === undefined || second === undefined || definition === undefined) {
        return;
      }
      await harness.repositories.versions.saveAndActivate(first, {
        ...definition,
        currentVersionId: first.versionId,
      });
      await expect(
        harness.repositories.versions.saveAndActivate(first, {
          ...definition,
          currentVersionId: first.versionId,
        }),
      ).rejects.toBeInstanceOf(PersistenceError);
      expect((await harness.repositories.tools.get(definition.toolId))?.currentVersionId).toBe(
        first.versionId,
      );
      expect(await harness.repositories.versions.get(second.versionId)).toBeNull();
    });

    it('leaves the previous definition unchanged when the pointer is missing or belongs to another tool', async () => {
      const graph = flightLabGraph();
      const version = graph.versions[0];
      const definition = graph.tools[0];
      expect(version).toBeDefined();
      expect(definition).toBeDefined();
      if (version === undefined || definition === undefined) {
        return;
      }
      await harness.repositories.versions.saveAndActivate(version, {
        ...definition,
        currentVersionId: version.versionId,
      });
      await harness.repositories.versions.save({
        versionId: 'tool_version_101',
        toolId: 'other-paper-lab',
        version: 1,
        inputs: ['design_name'],
        metrics: ['median_distance'],
        rules: [],
        compiledAt: '2026-08-18T12:01:00Z',
      });
      const before = canonicalJson(await harness.repositories.tools.get(definition.toolId));
      await expect(
        harness.repositories.tools.save({
          ...definition,
          currentVersionId: 'tool_version_999',
        }),
      ).rejects.toThrow(/missing version/u);
      await expect(
        harness.repositories.tools.save({
          ...definition,
          currentVersionId: 'tool_version_101',
        }),
      ).rejects.toThrow(/owned by/u);
      expect(canonicalJson(await harness.repositories.tools.get(definition.toolId))).toBe(before);
    });

    it('commits a fork snapshot and rolls back an injected fork failure', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      await harness.repositories.profiles.save(LEO_PROFILE);
      const source = graph.tools[0];
      const sourceVersion = graph.versions[1];
      expect(source).toBeDefined();
      expect(sourceVersion).toBeDefined();
      if (source === undefined || sourceVersion === undefined) {
        return;
      }
      const sourceBefore = canonicalJson(await harness.repositories.tools.get(source.toolId));
      const snapshot = buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion,
        sourceLedger: graph.entries,
        targetToolId: allocateTargetToolId(source.toolId, []),
        targetOwnerChildId: LEO_PROFILE.childId,
        targetDisplayName: "Leo's copy of Maya's Flight Lab",
        replacementEventIds: graph.entries.map((_, index) =>
          EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
        ),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      });

      setFailAfterForkWrite(true);
      await expect(harness.repositories.versions.saveForkSnapshot(snapshot)).rejects.toThrow(
        /injected fork failure/u,
      );
      expect(await harness.repositories.tools.get(snapshot.definition.toolId)).toBeNull();
      expect(await harness.repositories.versions.get(snapshot.version.versionId)).toBeNull();
      expect(await harness.repositories.ledger.listByTool(snapshot.definition.toolId)).toEqual([]);
      expect(canonicalJson(await harness.repositories.tools.get(source.toolId))).toBe(sourceBefore);
      setFailAfterForkWrite(false);

      await harness.repositories.versions.saveForkSnapshot(snapshot);
      expect((await harness.repositories.tools.get(snapshot.definition.toolId))?.ownerChildId).toBe(
        LEO_PROFILE.childId,
      );
      expect(await harness.repositories.versions.get(snapshot.version.versionId)).not.toBeNull();
      expect((await harness.repositories.ledger.listByTool(snapshot.definition.toolId)).length).toBe(
        graph.entries.length,
      );
      expect(await harness.repositories.trials.listByTool(snapshot.definition.toolId)).toEqual([]);
    });

    it('rejects a lineage-bearing definition on tools.save and saveAndActivate', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      const source = graph.tools[0];
      const sourceVersion = graph.versions[1];
      expect(source).toBeDefined();
      expect(sourceVersion).toBeDefined();
      if (source === undefined || sourceVersion === undefined) {
        return;
      }
      const snapshot = buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion,
        sourceLedger: graph.entries,
        targetToolId: allocateTargetToolId(source.toolId, []),
        targetOwnerChildId: LEO_PROFILE.childId,
        targetDisplayName: "Leo's copy of Maya's Flight Lab",
        replacementEventIds: graph.entries.map((_, index) =>
          EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
        ),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      });
      const mayaBefore = canonicalJson(await harness.repositories.tools.get(source.toolId));
      await expect(harness.repositories.tools.save(snapshot.definition)).rejects.toThrow(
        /saveForkSnapshot/u,
      );
      await expect(
        harness.repositories.versions.saveAndActivate(snapshot.version, snapshot.definition),
      ).rejects.toThrow(/saveForkSnapshot/u);
      expect(await harness.repositories.tools.get(snapshot.definition.toolId)).toBeNull();
      expect(await harness.repositories.versions.get(snapshot.version.versionId)).toBeNull();
      expect(canonicalJson(await harness.repositories.tools.get(source.toolId))).toBe(mayaBefore);
    });

    it('rejects incomplete, colliding, gapped, and same-owner forks without writing', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      const source = graph.tools[0];
      const sourceVersion = graph.versions[1];
      expect(source).toBeDefined();
      expect(sourceVersion).toBeDefined();
      if (source === undefined || sourceVersion === undefined) {
        return;
      }
      const snapshot = buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion,
        sourceLedger: graph.entries,
        targetToolId: allocateTargetToolId(source.toolId, []),
        targetOwnerChildId: LEO_PROFILE.childId,
        targetDisplayName: "Leo's copy of Maya's Flight Lab",
        replacementEventIds: graph.entries.map((_, index) =>
          EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
        ),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      });
      const mayaBefore = canonicalJson(await harness.repositories.tools.get(source.toolId));
      for (const attack of [
        omitUnapprovedAndCompact(snapshot),
        duplicateTargetEventId(snapshot),
        gappedTargetSequence(snapshot),
        sameOwnerFork(snapshot),
      ]) {
        await expect(harness.repositories.versions.saveForkSnapshot(attack)).rejects.toThrow();
        expect(await harness.repositories.tools.get(snapshot.definition.toolId)).toBeNull();
        expect(await harness.repositories.versions.get(snapshot.version.versionId)).toBeNull();
        expect(await harness.repositories.ledger.listByTool(snapshot.definition.toolId)).toEqual([]);
        expect(canonicalJson(await harness.repositories.tools.get(source.toolId))).toBe(mayaBefore);
      }
    });

    it('deleteByTool removes that tool stream and leaves get returning null', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      await harness.repositories.tools.deleteByTool('mayas-flight-lab');
      await harness.repositories.versions.deleteByTool('mayas-flight-lab');
      await harness.repositories.ledger.deleteByTool('mayas-flight-lab');
      await harness.repositories.trials.deleteByTool('mayas-flight-lab');
      await harness.repositories.grants.deleteByTool('mayas-flight-lab');
      await harness.repositories.summaries.deleteByTool('mayas-flight-lab');

      expect(await harness.repositories.tools.get('mayas-flight-lab')).toBeNull();
      expect(await harness.repositories.versions.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.ledger.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.trials.listByTool('mayas-flight-lab')).toEqual([]);
    });

    it('deleteToolGraph empties all six tool streams and leaves the owner profile', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      await harness.repositories.tools.deleteToolGraph('mayas-flight-lab');
      expect(await harness.repositories.tools.get('mayas-flight-lab')).toBeNull();
      expect(await harness.repositories.versions.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.ledger.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.trials.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.grants.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.summaries.listByTool('mayas-flight-lab')).toEqual([]);
      expect(await harness.repositories.profiles.get(graph.profile.childId)).not.toBeNull();
      await harness.repositories.tools.deleteToolGraph('mayas-flight-lab');
    });

    it('deleteProfileGraph removes owned tools and the profile, not another child', async () => {
      const graph = flightLabGraph();
      await persistGraph(harness.repositories, graph);
      await harness.repositories.profiles.save(LEO_PROFILE);
      const source = graph.tools[0];
      const sourceVersion = graph.versions[1];
      expect(source).toBeDefined();
      expect(sourceVersion).toBeDefined();
      if (source === undefined || sourceVersion === undefined) {
        return;
      }
      const snapshot = buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion,
        sourceLedger: graph.entries,
        targetToolId: allocateTargetToolId(source.toolId, []),
        targetOwnerChildId: LEO_PROFILE.childId,
        targetDisplayName: "Leo's copy of Maya's Flight Lab",
        replacementEventIds: graph.entries.map((_, index) =>
          EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
        ),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      });
      await harness.repositories.versions.saveForkSnapshot(snapshot);
      await harness.repositories.profiles.deleteProfileGraph(graph.profile.childId);
      expect(await harness.repositories.profiles.get(graph.profile.childId)).toBeNull();
      expect(await harness.repositories.tools.get(source.toolId)).toBeNull();
      const surviving = await harness.repositories.tools.get(snapshot.definition.toolId);
      expect(surviving).not.toBeNull();
      expect(surviving?.displayName).toBe(ORPHANED_FORK_DISPLAY_NAME);
      expect(surviving?.forkedFrom).toEqual(snapshot.definition.forkedFrom);
      expect(await harness.repositories.summaries.listByTool(snapshot.definition.toolId)).toEqual([]);
      expect(await harness.repositories.profiles.get(LEO_PROFILE.childId)).not.toBeNull();
    });
  });
}
