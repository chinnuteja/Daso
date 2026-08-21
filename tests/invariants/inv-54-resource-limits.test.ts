import { describe, expect, it } from 'vitest';

import { CORE_ROOT, listSourceFiles } from '../support/sourceTree';
import { RESOURCE_LIMITS, validateCandidate } from '../../src/core/validator';
import { emptyValidationContext } from '../support/validationContext';
import { EXCLUDE_OBSTRUCTED_MUTATION } from '../../src/adapters/teaching/scripted';

/**
 * INV-54 — Resource limits are enforced (§7.4).
 */

describe('INV-54 — resource limits are enforced (§7.4)', () => {
  it('INV-54: exceeding each declared cap produces a rejection naming that cap', () => {
    const overRules = validateCandidate(
      EXCLUDE_OBSTRUCTED_MUTATION,
      emptyValidationContext({
        existingRules: Array.from({ length: RESOURCE_LIMITS.maxRules }, (_, index) => `rule_${index}`),
      }),
    );
    expect(overRules.ok).toBe(false);
    if (overRules.ok === false) {
      expect(overRules.reasons.some((reason) => reason.limit === 'maxRules')).toBe(true);
    }

    const overInputs = validateCandidate(
      { operation: 'add_input', input: 'design_name' },
      emptyValidationContext({
        existingInputs: ['design_name', 'distance_m', 'obstruction', 'note'],
      }),
    );
    expect(overInputs.ok).toBe(false);
    if (overInputs.ok === false) {
      expect(overInputs.reasons.some((reason) => reason.limit === 'maxInputs')).toBe(true);
    }

    const overMetrics = validateCandidate(
      { operation: 'add_metric', metric: 'median_distance' },
      emptyValidationContext({ existingMetrics: ['median_distance', 'consistency'] }),
    );
    expect(overMetrics.ok).toBe(false);
    if (overMetrics.ok === false) {
      expect(overMetrics.reasons.some((reason) => reason.limit === 'maxMetrics')).toBe(true);
    }

    const overPending = validateCandidate(
      { operation: 'add_metric', metric: 'median_distance' },
      emptyValidationContext({ pendingCandidates: RESOURCE_LIMITS.maxPendingCandidates }),
    );
    expect(overPending.ok).toBe(false);
    if (overPending.ok === false) {
      expect(overPending.reasons.some((reason) => reason.limit === 'maxPendingCandidates')).toBe(true);
    }

    const huge = {
      operation: 'add_input',
      input: 'design_name',
      padding: 'x'.repeat(RESOURCE_LIMITS.maxCandidateChars),
    };
    const overChars = validateCandidate(huge, emptyValidationContext());
    expect(overChars.ok).toBe(false);
    if (overChars.ok === false) {
      expect(overChars.reasons.some((reason) => reason.limit === 'maxCandidateChars')).toBe(true);
    }
  });

  it('INV-54: caps are exported constants and no validator call site hardcodes a competing number', () => {
    expect(RESOURCE_LIMITS).toEqual({
      maxRules: 8,
      maxInputs: 4,
      maxMetrics: 2,
      maxCandidateChars: 2000,
      maxPendingCandidates: 3,
    });

    const values = new Set(Object.values(RESOURCE_LIMITS).map(String));
    const offenders = listSourceFiles(CORE_ROOT)
      .filter((file) => file.path.startsWith('src/core/validator/') && !file.path.endsWith('limits.ts'))
      .flatMap((file) => {
        const hits: string[] = [];
        for (const value of values) {
          const asLiteral = new RegExp(`(?<![.\\d])\\b${value}\\b(?![.\\d])`, 'u');
          if (asLiteral.test(file.text)) {
            hits.push(`${file.path} hardcodes ${value}`);
          }
        }
        return hits;
      });
    expect(offenders).toEqual([]);
  });
});
