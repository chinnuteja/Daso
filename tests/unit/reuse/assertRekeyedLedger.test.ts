import { describe, expect, it } from 'vitest';

import { assertRekeyedLedger } from '../../../src/core/reuse';
import { flightLabGraph } from '../../fixtures/persistence/flightLab';
import {
  omitUnapprovedAndCompact,
  validLeoForkSnapshot,
} from '../../support/forkAttacks';

describe('assertRekeyedLedger', () => {
  it('accepts a complete remapped Flight Lab fork', () => {
    const graph = flightLabGraph();
    const sourceVersion = graph.versions[1];
    const snapshot = validLeoForkSnapshot();
    expect(sourceVersion).toBeDefined();
    if (sourceVersion === undefined) {
      return;
    }
    expect(() =>
      assertRekeyedLedger({
        sourceLedger: graph.entries,
        targetLedger: snapshot.ledger,
        sourceVersion,
        targetVersion: snapshot.version,
        targetToolId: snapshot.definition.toolId,
      }),
    ).not.toThrow();
  });

  it('rejects an omitted unapproved source entry even when the version body still matches', () => {
    const graph = flightLabGraph();
    const sourceVersion = graph.versions[1];
    const snapshot = omitUnapprovedAndCompact(validLeoForkSnapshot());
    expect(sourceVersion).toBeDefined();
    if (sourceVersion === undefined) {
      return;
    }
    expect(() =>
      assertRekeyedLedger({
        sourceLedger: graph.entries,
        targetLedger: snapshot.ledger,
        sourceVersion,
        targetVersion: snapshot.version,
        targetToolId: snapshot.definition.toolId,
      }),
    ).toThrow(/re-key every source entry/u);
  });
});
