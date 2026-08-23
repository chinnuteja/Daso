import { EvidenceRequest, type EvidenceSource } from '../../core/ports/evidence';
import { EvidenceSelection, type EvidenceItem } from '../../core/evidence';

const PREFERRED_IDS = ['event_001', 'trial_004', 'event_014', 'tool_version_002'] as const;

/**
 * Local EvidenceSource. It only chooses ids that already exist on the supplied
 * projection. It does not invent events or write a summary.
 */
export function createScriptedEvidenceSource(): EvidenceSource {
  return {
    select: async (request: EvidenceRequest): Promise<EvidenceSelection> => {
      const parsed = EvidenceRequest.parse(request);
      const items = parsed.projection.items;
      const byId = new Map(items.map((item) => [item.referenceId, item]));
      const chosen: string[] = [];

      for (const id of PREFERRED_IDS) {
        if (byId.has(id)) {
          chosen.push(id);
        }
      }

      addIfMissing(chosen, items, (item) => item.kind === 'candidate' && item.type === 'definition_decision');
      addIfMissing(chosen, items, (item) => item.kind === 'trial');
      addIfMissing(chosen, items, (item) => item.kind === 'candidate' && item.type === 'rule_correction');
      addIfMissing(chosen, items, (item) => item.kind === 'version' && item.isActive);

      return EvidenceSelection.parse({ evidenceEventIds: chosen });
    },
  };
}

function addIfMissing(
  chosen: string[],
  items: readonly EvidenceItem[],
  match: (item: EvidenceItem) => boolean,
): void {
  if (chosen.some((id) => items.some((item) => item.referenceId === id && match(item)))) {
    return;
  }
  const found = items.find(match);
  if (found !== undefined && !chosen.includes(found.referenceId) && chosen.length < 5) {
    chosen.push(found.referenceId);
  }
}
