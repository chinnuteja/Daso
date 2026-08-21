import { describe, expect, it } from 'vitest';

import { reachableFrom } from '../support/importGraph';

/**
 * INV-43 — Runner Mode reaches no teaching module.
 */
describe('INV-43 — Runner Mode reaches no teaching module (§7.5, precursor to INV-22)', () => {
  it('INV-43: no module reachable from the Runner Mode entry imports teaching', () => {
    const reachable = reachableFrom(['src/app/run/page.tsx']);
    expect(reachable.length).toBeGreaterThan(0);
    expect(reachable.some((file) => file.path === 'src/app/run/page.tsx')).toBe(true);

    const offenders = reachable
      .filter((file) => {
        const text = file.text;
        return (
          file.path.includes('adapters/teaching') ||
          file.path.includes('ports/teaching') ||
          file.path.includes('orchestrator/events') ||
          file.path.includes('orchestrator/transition') ||
          file.path.includes('ui/flows/JourneyFlow') ||
          /\bTeachingSource\b|\brequest_interpretation\b|\bcreateScriptedTeachingSource\b/u.test(
            text,
          )
        );
      })
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });
});
