import { describe, expect, it } from 'vitest';

import { reachableFrom } from '../support/importGraph';
import { runScriptedFlightLabJourney } from '../journey/runScriptedJourney';

/**
 * INV-56 — Approval never traverses the network (§7.3, §11.1).
 */

describe('INV-56 — approval never traverses the network (§7.3, §11.1)', () => {
  it('INV-56: the approval path contains no fetch, no route call, and no agent import', () => {
    const reachable = reachableFrom([
      'src/ui/screens/ReviewMutationScreen.tsx',
      'src/ui/flows/executeIntents.ts',
    ]);
    expect(reachable.length).toBeGreaterThan(0);

    const offenders = reachable
      .filter((file) => {
        return (
          file.path.includes('adapters/agents') ||
          file.path.includes('app/api/agents') ||
          /\bfetch\s*\(/u.test(file.text) ||
          /\/api\/agents\//u.test(file.text)
        );
      })
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('INV-56: a journey run with the model transport hard-disabled still reaches an approved rule in the fold', async () => {
    const result = await runScriptedFlightLabJourney({ approveCorrection: true });
    expect(result.compiledBody).not.toBeNull();
    expect(result.compiledBody?.rules.map((rule) => rule.ruleId)).toContain(
      'exclude_obstructed_flight',
    );
  });
});
