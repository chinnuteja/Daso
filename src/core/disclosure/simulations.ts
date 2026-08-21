import { z } from 'zod';

import { NonEmptyString } from '../schema/primitives';

/**
 * Ruling R7: the sole registry of honestly simulated capabilities (specification section 15,
 * "Any simulation must be disclosed").
 *
 * Every field is required, so an entry that does not say what is fake, what is genuinely real,
 * and where the user is told, cannot be constructed. A simulated behaviour missing from this
 * registry is a rejected build, not a documentation gap.
 */

export const DisclosureSurface = z.enum([
  'readme',
  'in_product_capture_screen',
  'in_product_runner_mode',
  'in_product_parent_view',
]);
export type DisclosureSurface = z.infer<typeof DisclosureSurface>;

export const SimulatedCapability = z.enum([
  'automatic_distance_measurement',
  'obstruction_detection',
  'parent_summary_delivery',
  'second_child_identity',
]);
export type SimulatedCapability = z.infer<typeof SimulatedCapability>;

export const SimulationDisclosure = z.strictObject({
  capability: SimulatedCapability,
  /** The part a viewer might otherwise believe is real. */
  whatIsSimulated: NonEmptyString,
  /** The part that genuinely works, so the disclosure does not undersell the artifact. */
  whatIsReal: NonEmptyString,
  /** Where the user is told. At least one surface; a private note is not a disclosure. */
  disclosedAt: z.array(DisclosureSurface).min(1),
});
export type SimulationDisclosure = z.infer<typeof SimulationDisclosure>;

export const SIMULATION_DISCLOSURES: readonly SimulationDisclosure[] = Object.freeze([
  SimulationDisclosure.parse({
    capability: 'automatic_distance_measurement',
    whatIsSimulated: 'Automatic detection of how far a paper airplane flew.',
    whatIsReal:
      'The child enters or confirms the measured distance, and that recorded observation is what the metrics and the replay actually use.',
    disclosedAt: ['in_product_capture_screen', 'readme'],
  }),
  SimulationDisclosure.parse({
    capability: 'obstruction_detection',
    whatIsSimulated: 'Computer vision deciding that a flight touched something.',
    whatIsReal:
      "The child's own judgement, recorded as an observation, and the taught rule that acts on it.",
    disclosedAt: ['in_product_capture_screen', 'readme'],
  }),
  SimulationDisclosure.parse({
    capability: 'parent_summary_delivery',
    whatIsSimulated: 'Delivery of the summary to a parent by SMS or push notification.',
    whatIsReal:
      'On-device generation of the summary and the check that every claim it makes cites an event that exists.',
    disclosedAt: ['in_product_parent_view', 'readme'],
  }),
  SimulationDisclosure.parse({
    capability: 'second_child_identity',
    whatIsSimulated: 'Separate accounts and authentication for the second child on day two.',
    whatIsReal:
      "Fork semantics and rule inheritance: the second child's session runs Maya's approved rules and cannot alter her version.",
    disclosedAt: ['in_product_runner_mode', 'readme'],
  }),
]);
