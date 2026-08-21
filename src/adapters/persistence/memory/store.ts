export interface MemoryRecords {
  readonly profiles: Map<string, unknown>;
  readonly tools: Map<string, unknown>;
  readonly versions: Map<string, unknown>;
  readonly ledger: Map<string, unknown>;
  readonly trials: Map<string, unknown>;
  readonly grants: Map<string, unknown>;
  readonly summaries: Map<string, unknown>;
  readonly meta: Map<string, unknown>;
}

export function createEmptyMemoryRecords(): MemoryRecords {
  return {
    profiles: new Map(),
    tools: new Map(),
    versions: new Map(),
    ledger: new Map(),
    trials: new Map(),
    grants: new Map(),
    summaries: new Map(),
    meta: new Map(),
  };
}
