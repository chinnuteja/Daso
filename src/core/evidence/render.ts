import { EvidenceProjection } from './schema';
import { validateEvidenceSelection } from './validate';
import { DELETED_PROFILE_TEACHER } from '../reuse/orphanedFork';

export const SUGGESTED_CONVERSATION = 'Ask Maya what made that throw unfair.';
export const ANONYMOUS_CONVERSATION = 'Ask what made that throw unfair.';

export interface ParentRenderAttribution {
  readonly teacherDisplayName?: string;
  readonly toolDisplayName?: string;
  readonly sourceDeleted?: boolean;
}

export interface ParentSupportRow {
  readonly label: string;
  readonly referenceId: string;
}

export interface ParentClauses {
  readonly heading: string;
  readonly question: string;
  readonly observation: string;
  readonly rule: string;
  readonly result: string;
  readonly conversation: string;
  readonly supporting: readonly ParentSupportRow[];
}

export function renderParentClauses(
  projection: EvidenceProjection,
  selection: unknown,
  attribution: ParentRenderAttribution = {},
): ParentClauses {
  const parsed = EvidenceProjection.parse(projection);
  const validated = validateEvidenceSelection(parsed, selection);
  const byId = new Map(parsed.items.map((item) => [item.referenceId, item]));
  const selected = validated.evidenceEventIds.map((id) => byId.get(id));

  const question = selected.find(
    (item) => item !== undefined && item.kind === 'candidate' && item.type === 'definition_decision',
  );
  const observation = selected.find((item) => item !== undefined && item.kind === 'trial');
  const rule = selected.find(
    (item) => item !== undefined && item.kind === 'candidate' && item.type === 'rule_correction',
  );
  const version = selected.find((item) => item !== undefined && item.kind === 'version');

  if (
    question === undefined ||
    question.kind !== 'candidate' ||
    observation === undefined ||
    observation.kind !== 'trial' ||
    rule === undefined ||
    rule.kind !== 'candidate' ||
    version === undefined ||
    version.kind !== 'version'
  ) {
    throw new Error('validated selection lost a required item');
  }

  const teacher = attribution.teacherDisplayName ?? parsed.ownerDisplayName;
  const toolName = attribution.toolDisplayName ?? parsed.toolDisplayName;
  const sourceDeleted = attribution.sourceDeleted === true;
  const counted = observation.validUnderCurrentVersion ? 'counted' : 'not counted';
  return {
    heading: `What ${teacher} taught ${toolName}`,
    question: `${teacher} chose to investigate this: ${question.originalInput}`,
    observation: `An observed ${observation.designName} throw ${
      observation.obstruction ? 'touched something' : 'did not touch anything'
    }.`,
    rule: `${teacher} taught this: ${rule.originalInput}`,
    result: `The saved version now treats that ${observation.designName} throw as ${counted}.`,
    conversation:
      sourceDeleted || teacher === DELETED_PROFILE_TEACHER
        ? ANONYMOUS_CONVERSATION
        : `Ask ${teacher} what made that throw unfair.`,
    supporting: validated.evidenceEventIds.map((id) => {
      const item = byId.get(id);
      if (item === undefined) {
        return { label: 'Stored record', referenceId: id };
      }
      if (item.kind === 'trial') {
        return { label: 'Recorded observation', referenceId: id };
      }
      if (item.kind === 'version') {
        return { label: 'Saved version', referenceId: id };
      }
      if (item.type === 'rule_correction') {
        return { label: 'Child-taught rule', referenceId: id };
      }
      return { label: 'Chosen question', referenceId: id };
    }),
  };
}

export function renderParentSummaryText(
  projection: EvidenceProjection,
  selection: unknown,
  attribution: ParentRenderAttribution = {},
): string {
  const clauses = renderParentClauses(projection, selection, attribution);
  return [clauses.question, clauses.observation, clauses.rule, clauses.result, clauses.conversation].join(
    ' ',
  );
}
