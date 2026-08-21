/**
 * Declared resource caps for a Flight Lab tool. "Stays within resource limits" is a
 * check against these constants, not a sentence in a spec.
 */
export const RESOURCE_LIMITS = {
  maxRules: 8,
  maxInputs: 4,
  maxMetrics: 2,
  maxCandidateChars: 2000,
  maxPendingCandidates: 3,
} as const;

export type ResourceLimitName = keyof typeof RESOURCE_LIMITS;
