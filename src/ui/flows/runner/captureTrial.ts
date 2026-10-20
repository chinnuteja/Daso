import { bodyFromVersion } from '../../../core/compiler';
import { foldApprovedEvents } from '../../../core/ledger/fold';
import type { Clock } from '../../../core/ports/clock';
import type { IdFactory } from '../../../core/ports/ids';
import type { Repositories } from '../../../core/ports/repositories';
import { ExperimentTrial } from '../../../core/schema/experimentTrial';
import type { ToolId } from '../../../core/schema/primitives';
import { canonicalJson } from '../../../core/serialization/canonicalJson';

export class ActiveVersionCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActiveVersionCaptureError';
  }
}

export interface TrialCaptureDraft {
  readonly toolId: ToolId;
  readonly designName: string;
  readonly distanceM?: number;
  readonly loadCount?: number;
  readonly obstruction: boolean;
  readonly setupChanged?: boolean;
  readonly validAtCapture: boolean;
  readonly note?: string;
}

/**
 * Neutral active-version trial capture. Teaching composition and Runner composition both
 * call this. The UI cannot supply a capture version id.
 */
export async function captureTrialUnderActiveVersion(input: {
  readonly repositories: Repositories;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly trial: TrialCaptureDraft;
}): Promise<ExperimentTrial> {
  const definition = await input.repositories.tools.get(input.trial.toolId);
  if (definition === null) {
    throw new ActiveVersionCaptureError(
      `tool ${input.trial.toolId} does not exist; capture is rejected`,
    );
  }
  const version = await input.repositories.versions.get(definition.currentVersionId);
  if (version === null) {
    throw new ActiveVersionCaptureError(
      `active version ${definition.currentVersionId} is missing; capture is rejected`,
    );
  }
  if (version.toolId !== definition.toolId) {
    throw new ActiveVersionCaptureError(
      'active version belongs to a different tool; capture is rejected',
    );
  }
  const ledger = await input.repositories.ledger.listByTool(definition.toolId);
  try {
    if (canonicalJson(foldApprovedEvents(ledger)) !== canonicalJson(bodyFromVersion(version))) {
      throw new ActiveVersionCaptureError(
        'stored history does not match the saved version; capture is rejected',
      );
    }
  } catch (error) {
    if (error instanceof ActiveVersionCaptureError) {
      throw error;
    }
    throw new ActiveVersionCaptureError(
      'stored history does not match the saved version; capture is rejected',
    );
  }
  const trial = ExperimentTrial.parse({
    trialId: input.ids.next('trial'),
    toolId: input.trial.toolId,
    toolVersionIdAtCapture: version.versionId,
    designName: input.trial.designName,
    ...(input.trial.distanceM === undefined ? {} : { distanceM: input.trial.distanceM }),
    ...(input.trial.loadCount === undefined ? {} : { loadCount: input.trial.loadCount }),
    obstruction: input.trial.obstruction,
    ...(input.trial.setupChanged === undefined ? {} : { setupChanged: input.trial.setupChanged }),
    validAtCapture: input.trial.validAtCapture,
    validUnderCurrentVersion: input.trial.validAtCapture,
    createdAt: input.clock.now(),
    ...(input.trial.note === undefined ? {} : { note: input.trial.note }),
  });
  await input.repositories.trials.save(trial);
  return trial;
}
