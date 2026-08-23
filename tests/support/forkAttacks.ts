import { buildForkSnapshot, type ForkSnapshot } from '../../src/core/reuse';
import { EventId } from '../../src/core/schema/primitives';
import type { ToolDefinition } from '../../src/core/schema/toolDefinition';
import { flightLabGraph } from '../fixtures/persistence/flightLab';

export function validLeoForkSnapshot(): ForkSnapshot {
  const graph = flightLabGraph();
  const source = graph.tools[0];
  const version = graph.versions[1];
  if (source === undefined || version === undefined) {
    throw new Error('fixture missing');
  }
  return buildForkSnapshot({
    sourceDefinition: source,
    sourceVersion: version,
    sourceLedger: graph.entries,
    targetToolId: 'mayas-flight-lab-copy',
    targetOwnerChildId: 'child_local_02',
    targetDisplayName: "Leo's copy of Maya's Flight Lab",
    replacementEventIds: graph.entries.map((_, index) =>
      EventId.parse(`event_${String(200 + index).padStart(3, '0')}`),
    ),
    targetVersionId: 'tool_version_200',
    forkedAt: '2026-08-21T09:05:00Z',
  });
}

/** Drop the unapproved note (sequence 11) and compact so integrity still passes. */
export function omitUnapprovedAndCompact(snapshot: ForkSnapshot): ForkSnapshot {
  const kept = snapshot.ledger.filter((entry) => entry.sequence !== 11);
  return {
    ...snapshot,
    ledger: kept.map((entry, index) => ({ ...entry, sequence: index + 1 })),
  };
}

export function duplicateTargetEventId(snapshot: ForkSnapshot): ForkSnapshot {
  const first = snapshot.ledger[0];
  const last = snapshot.ledger[snapshot.ledger.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error('empty ledger');
  }
  return {
    ...snapshot,
    ledger: [...snapshot.ledger.slice(0, -1), { ...last, eventId: first.eventId }],
  };
}

export function gappedTargetSequence(snapshot: ForkSnapshot): ForkSnapshot {
  const last = snapshot.ledger[snapshot.ledger.length - 1];
  if (last === undefined) {
    throw new Error('empty ledger');
  }
  return {
    ...snapshot,
    ledger: [...snapshot.ledger.slice(0, -1), { ...last, sequence: last.sequence + 1 }],
  };
}

export function sameOwnerFork(snapshot: ForkSnapshot): ForkSnapshot {
  const lineage = snapshot.definition.forkedFrom;
  if (lineage === undefined) {
    throw new Error('snapshot missing lineage');
  }
  const definition: ToolDefinition = {
    ...snapshot.definition,
    ownerChildId: lineage.ownerChildId,
  };
  return { ...snapshot, definition };
}
