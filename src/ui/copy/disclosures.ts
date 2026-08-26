import {
  SIMULATION_DISCLOSURES,
  type DisclosureSurface,
  type SimulationDisclosure,
} from '../../core/disclosure/simulations';

/** Product-surface copy after source-profile deletion. Registry text still names Maya in README. */
const ORPHANED_SECOND_CHILD_REAL =
  "Fork semantics and rule inheritance: the second child's session runs the original approved rules and cannot alter that version.";

export function disclosuresForSurface(
  surface: DisclosureSurface,
): readonly SimulationDisclosure[] {
  return SIMULATION_DISCLOSURES.filter((entry) => entry.disclosedAt.includes(surface));
}

export function disclosureWhatIsReal(
  entry: SimulationDisclosure,
  options: { readonly sourceDeleted?: boolean } = {},
): string {
  if (options.sourceDeleted === true && entry.capability === 'second_child_identity') {
    return ORPHANED_SECOND_CHILD_REAL;
  }
  return entry.whatIsReal;
}
