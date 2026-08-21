import type { ValidationContext } from '../../src/core/validator';

export function emptyValidationContext(
  overrides: Partial<ValidationContext> = {},
): ValidationContext {
  return {
    toolId: 'mayas-flight-lab',
    now: '2026-08-18T10:00:00Z',
    existingInputs: [],
    existingMetrics: [],
    existingRules: [],
    pendingCandidates: 0,
    knownEventIds: new Set<string>(),
    grants: [],
    ...overrides,
  };
}
