import {
  SIMULATION_DISCLOSURES,
  type DisclosureSurface,
  type SimulationDisclosure,
} from '../../core/disclosure/simulations';

export function disclosuresForSurface(
  surface: DisclosureSurface,
): readonly SimulationDisclosure[] {
  return SIMULATION_DISCLOSURES.filter((entry) => entry.disclosedAt.includes(surface));
}
