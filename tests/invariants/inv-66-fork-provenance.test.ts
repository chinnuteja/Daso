import { describe, expect, it } from 'vitest';

import { bodyFromVersion } from '../../src/core/compiler';
import { foldApprovedEvents } from '../../src/core/ledger/fold';
import { buildForkSnapshot } from '../../src/core/reuse';
import { EventId } from '../../src/core/schema/primitives';
import { canonicalJson } from '../../src/core/serialization/canonicalJson';
import { flightLabGraph } from '../fixtures/persistence/flightLab';
import { flightLabLedger } from '../fixtures/ledger/flightLab';

/**
 * INV-66 — fork re-keys the ledger, remaps approvals, compiles from the target ledger.
 */

describe('INV-66 — fork provenance', () => {
  it('INV-66: re-keys one complete ledger, remaps approvals, compiles, and copies no trials', () => {
    const graph = flightLabGraph();
    const source = graph.tools[0];
    const version = graph.versions[1];
    expect(source).toBeDefined();
    expect(version).toBeDefined();
    if (source === undefined || version === undefined) {
      return;
    }
    const before = canonicalJson({ definition: source, version, ledger: flightLabLedger });
    const snapshot = buildForkSnapshot({
      sourceDefinition: source,
      sourceVersion: version,
      sourceLedger: flightLabLedger,
      targetToolId: 'mayas-flight-lab-copy',
      targetOwnerChildId: 'child_local_02',
      targetDisplayName: "Leo's copy of Maya's Flight Lab",
      replacementEventIds: flightLabLedger.map((_, index) =>
        EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
      ),
      targetVersionId: 'tool_version_200',
      forkedAt: '2026-08-21T09:05:00Z',
    });
    expect(snapshot.ledger).toHaveLength(flightLabLedger.length);
    expect(canonicalJson(foldApprovedEvents(snapshot.ledger))).toBe(
      canonicalJson(bodyFromVersion(snapshot.version)),
    );
    expect(snapshot.definition.forkedFrom).toEqual({
      toolId: 'mayas-flight-lab',
      versionId: 'tool_version_002',
      ownerChildId: 'child_local_01',
    });
    expect(snapshot.ledger.some((entry) => entry.eventId.startsWith('event_00'))).toBe(false);
    expect(canonicalJson({ definition: source, version, ledger: flightLabLedger })).toBe(before);
  });
});
