import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SIMULATION_DISCLOSURES } from '../../src/core/disclosure/simulations';
import { disclosuresForSurface } from '../../src/ui/copy/disclosures';
import { CaptureDisclosures } from '../../src/ui/screens/CaptureTrialScreen';

/**
 * INV-46 — capture-screen disclosures are shown.
 */
describe('INV-46 — capture-screen disclosures are shown (§15, ruling R7)', () => {
  it('INV-46: every registry entry naming in_product_capture_screen is rendered', () => {
    const required = SIMULATION_DISCLOSURES.filter((entry) =>
      entry.disclosedAt.includes('in_product_capture_screen'),
    );
    expect(required.map((entry) => entry.capability).sort()).toEqual([
      'automatic_distance_measurement',
      'obstruction_detection',
    ]);
    expect(disclosuresForSurface('in_product_capture_screen')).toEqual(required);

    const markup = renderToStaticMarkup(createElement(CaptureDisclosures));
    const visible = markup.replaceAll('&#x27;', "'").replaceAll('&apos;', "'");
    for (const entry of required) {
      expect(visible).toContain(entry.whatIsSimulated);
      expect(visible).toContain(entry.whatIsReal);
    }
  });
});
