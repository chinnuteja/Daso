import { EvidenceGroundingError, EvidenceProjection, EvidenceSelection } from './schema';

export interface ValidatedEvidenceSelection {
  readonly evidenceEventIds: readonly string[];
}

export function validateEvidenceSelection(
  projection: EvidenceProjection,
  raw: unknown,
): ValidatedEvidenceSelection {
  const parsedProjection = EvidenceProjection.parse(projection);
  const parsed = EvidenceSelection.safeParse(raw);
  if (!parsed.success) {
    throw new EvidenceGroundingError('evidence selection is not a closed id list');
  }

  const ids = parsed.data.evidenceEventIds;
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new EvidenceGroundingError('evidence selection contains a duplicate id');
  }

  const allowed = new Map(parsedProjection.items.map((item) => [item.referenceId, item]));
  for (const id of ids) {
    if (!allowed.has(id)) {
      throw new EvidenceGroundingError(`evidence id ${id} is not in the local projection`);
    }
  }

  const selected = ids.map((id) => allowed.get(id)).filter((item) => item !== undefined);
  const hasObservation = selected.some((item) => item.kind === 'trial');
  const hasQuestion = selected.some(
    (item) => item.kind === 'candidate' && item.type === 'definition_decision',
  );
  const hasRule = selected.some((item) => item.kind === 'candidate' && item.type === 'rule_correction');
  const hasActiveVersion = selected.some((item) => item.kind === 'version' && item.isActive);
  if (!hasObservation || !hasQuestion || !hasRule || !hasActiveVersion) {
    throw new EvidenceGroundingError('evidence selection is missing a required Flight Lab fact');
  }

  return { evidenceEventIds: [...ids].sort((left, right) => (left < right ? -1 : 1)) };
}
