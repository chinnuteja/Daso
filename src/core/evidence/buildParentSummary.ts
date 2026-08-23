import type { Clock } from '../ports/clock';
import type { IdFactory } from '../ports/ids';
import { ParentSummary } from '../schema/parentSummary';
import type { ChildId } from '../schema/primitives';
import { EvidenceProjection } from './schema';
import { renderParentSummaryText, type ParentRenderAttribution } from './render';
import { validateEvidenceSelection } from './validate';

export function buildParentSummary(input: {
  readonly projection: EvidenceProjection;
  readonly selection: unknown;
  readonly childId: ChildId;
  readonly ids: IdFactory;
  readonly clock: Clock;
  readonly attribution?: ParentRenderAttribution;
}): ParentSummary {
  const projection = EvidenceProjection.parse(input.projection);
  const validated = validateEvidenceSelection(projection, input.selection);
  const text = renderParentSummaryText(
    projection,
    { evidenceEventIds: validated.evidenceEventIds },
    input.attribution,
  );
  return ParentSummary.parse({
    summaryId: input.ids.next('summary'),
    childId: input.childId,
    toolId: projection.toolId,
    text,
    evidenceEventIds: validated.evidenceEventIds,
    createdAt: input.clock.now(),
  });
}
