import { describe, expect, it } from 'vitest';

import { bodyFromVersion } from '../../../src/core/compiler';
import { foldApprovedEvents } from '../../../src/core/ledger/fold';
import { allocateTargetToolId, buildForkSnapshot } from '../../../src/core/reuse';
import { EventId } from '../../../src/core/schema/primitives';
import { canonicalJson } from '../../../src/core/serialization/canonicalJson';
import { flightLabGraph } from '../../fixtures/persistence/flightLab';
import { flightLabLedger } from '../../fixtures/ledger/flightLab';

function ids(): readonly ReturnType<typeof EventId.parse>[] {
  return flightLabLedger.map((_, index) => EventId.parse(`event_${String(200 + index).padStart(3, '0')}`));
}

describe('pure fork snapshot', () => {
  it('allocates copy then copy-2 slugs', () => {
    expect(allocateTargetToolId('mayas-flight-lab', [])).toBe('mayas-flight-lab-copy');
    expect(allocateTargetToolId('mayas-flight-lab', ['mayas-flight-lab-copy'])).toBe(
      'mayas-flight-lab-copy-2',
    );
  });

  it('re-keys approvals and compiles from the target ledger', () => {
    const graph = flightLabGraph();
    const source = graph.tools[0];
    const version = graph.versions[1];
    expect(source).toBeDefined();
    expect(version).toBeDefined();
    if (source === undefined || version === undefined) {
      return;
    }
    const before = canonicalJson({ source, version, ledger: flightLabLedger });
    const snapshot = buildForkSnapshot({
      sourceDefinition: source,
      sourceVersion: version,
      sourceLedger: flightLabLedger,
      targetToolId: 'mayas-flight-lab-copy',
      targetOwnerChildId: 'child_local_02',
      targetDisplayName: "Leo's copy of Maya's Flight Lab",
      replacementEventIds: ids(),
      targetVersionId: 'tool_version_200',
      forkedAt: '2026-08-21T09:05:00Z',
    });
    expect(canonicalJson(foldApprovedEvents(snapshot.ledger))).toBe(
      canonicalJson(bodyFromVersion(snapshot.version)),
    );
    expect(snapshot.version.version).toBe(2);
    expect(snapshot.definition.forkedFrom).toEqual({
      toolId: 'mayas-flight-lab',
      versionId: 'tool_version_002',
      ownerChildId: 'child_local_01',
    });
    const approval = snapshot.ledger.find((entry) => entry.entryKind === 'approval' && entry.sequence === 15);
    const candidate = snapshot.ledger.find((entry) => entry.entryKind === 'candidate' && entry.sequence === 14);
    expect(approval !== undefined && approval.entryKind === 'approval').toBe(true);
    expect(candidate !== undefined && candidate.entryKind === 'candidate').toBe(true);
    if (approval !== undefined && approval.entryKind === 'approval' && candidate !== undefined) {
      expect(approval.approves).toBe(candidate.eventId);
      expect(approval.approves).not.toBe('event_014');
    }
    expect(canonicalJson({ source, version, ledger: flightLabLedger })).toBe(before);
  });

  it('rejects a missing replacement id and a non-active source version', () => {
    const graph = flightLabGraph();
    const source = graph.tools[0];
    const v1 = graph.versions[0];
    const v2 = graph.versions[1];
    expect(source).toBeDefined();
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    if (source === undefined || v1 === undefined || v2 === undefined) {
      return;
    }
    expect(() =>
      buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion: v1,
        sourceLedger: flightLabLedger,
        targetToolId: 'mayas-flight-lab-copy',
        targetOwnerChildId: 'child_local_02',
        targetDisplayName: 'copy',
        replacementEventIds: ids(),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      }),
    ).toThrow(/not the active version/u);
    expect(() =>
      buildForkSnapshot({
        sourceDefinition: source,
        sourceVersion: v2,
        sourceLedger: flightLabLedger,
        targetToolId: 'mayas-flight-lab-copy',
        targetOwnerChildId: 'child_local_02',
        targetDisplayName: 'copy',
        replacementEventIds: ids().slice(1),
        targetVersionId: 'tool_version_200',
        forkedAt: '2026-08-21T09:05:00Z',
      }),
    ).toThrow(/cover every source/u);
  });
});
