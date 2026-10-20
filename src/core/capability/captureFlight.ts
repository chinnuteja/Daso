import type { CapabilityLifecycleRepository, ExperimentTrialRepository } from '../ports/repositories';
import { ExperimentTrial } from '../schema/experimentTrial';

/** Resolve the active version from trusted storage; UI supplies observation facts only. */
export async function recordFlightObservation(repositories: {
  readonly capabilities: CapabilityLifecycleRepository;
  readonly trials: ExperimentTrialRepository;
}, input: { readonly toolId: string; readonly trialId: string; readonly designName: string; readonly distanceM: number; readonly obstruction: boolean; readonly createdAt: string }): Promise<void> {
  const definition = await repositories.capabilities.getDefinition(input.toolId);
  if (definition?.currentVersionId == null) throw new Error('Save a flight rule before reusing it.');
  const version = await repositories.capabilities.getVersion(definition.currentVersionId);
  if (version?.kind !== 'flight_validity' || version.toolId !== input.toolId) throw new Error('The active flight rule is incomplete. Reload before recording.');
  await repositories.trials.save(ExperimentTrial.parse({ ...input, toolVersionIdAtCapture: version.versionId, setupChanged: false, validAtCapture: true, validUnderCurrentVersion: !input.obstruction, note: 'Child-entered observation' }));
}
