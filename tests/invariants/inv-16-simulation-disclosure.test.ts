import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  SIMULATION_DISCLOSURES,
  SimulationDisclosure,
  type SimulationDisclosure as SimulationDisclosureType,
} from '../../src/core/disclosure/simulations';

/**
 * INV-16 — simulations must be disclosed (specification section 15).
 *
 * Every registry entry must say what is fake, what is genuinely real, and where the user is
 * told. The type makes an undisclosed entry impossible to construct.
 */

describe('INV-16 — every simulated capability is disclosed (§15)', () => {
  it('INV-16: every registry entry has non-empty whatIsSimulated, whatIsReal, and disclosedAt', () => {
    expect(SIMULATION_DISCLOSURES.length).toBeGreaterThan(0);

    for (const entry of SIMULATION_DISCLOSURES) {
      const parsed = SimulationDisclosure.parse(entry);
      expect(parsed.whatIsSimulated.length).toBeGreaterThan(0);
      expect(parsed.whatIsReal.length).toBeGreaterThan(0);
      expect(parsed.disclosedAt.length).toBeGreaterThan(0);
    }
  });

  it('INV-16: SimulationDisclosure.parse rejects an entry missing whatIsSimulated', () => {
    const parsed = SimulationDisclosure.safeParse({
      capability: 'automatic_distance_measurement',
      whatIsReal: 'The child enters the measured distance.',
      disclosedAt: ['readme'],
    });
    expect(parsed.success).toBe(false);
  });

  it('INV-16: SimulationDisclosure.parse rejects an entry missing whatIsReal', () => {
    const parsed = SimulationDisclosure.safeParse({
      capability: 'automatic_distance_measurement',
      whatIsSimulated: 'Automatic detection of distance.',
      disclosedAt: ['readme'],
    });
    expect(parsed.success).toBe(false);
  });

  it('INV-16: SimulationDisclosure.parse rejects an entry missing disclosedAt', () => {
    const parsed = SimulationDisclosure.safeParse({
      capability: 'automatic_distance_measurement',
      whatIsSimulated: 'Automatic detection of distance.',
      whatIsReal: 'The child enters the measured distance.',
    });
    expect(parsed.success).toBe(false);
  });

  it('INV-16: the type rejects an entry missing any required disclosure field', () => {
    expectTypeOf<{
      capability: 'automatic_distance_measurement';
      whatIsReal: string;
      disclosedAt: ['readme'];
    }>().not.toExtend<SimulationDisclosureType>();

    expectTypeOf<{
      capability: 'automatic_distance_measurement';
      whatIsSimulated: string;
      disclosedAt: ['readme'];
    }>().not.toExtend<SimulationDisclosureType>();

    expectTypeOf<{
      capability: 'automatic_distance_measurement';
      whatIsSimulated: string;
      whatIsReal: string;
    }>().not.toExtend<SimulationDisclosureType>();
  });
});
