import { z } from 'zod';

import { foldApprovedEvents } from '../ledger/fold';
import { CandidateEntry, Ledger, LedgerEntry, compareEntries } from '../ledger/types';
import { EventId, RuleId } from '../schema/primitives';
import { InputField, MetricId } from '../schema/vocabulary';
import { childApprovedCandidateIds } from './summaryCounts';

/**
 * Structured child-facing authorship explanation (specification section 10).
 *
 * Core returns a subject and an attribution kind. Display copy such as "Chosen by Maya"
 * is assembled by the presentation layer so the kernel stays free of locale and of any
 * particular child's name.
 */

export const AuthorshipAttribution = z.enum([
  'child_chosen',
  'ai_suggested_child_accepted',
  'child_taught',
]);
export type AuthorshipAttribution = z.infer<typeof AuthorshipAttribution>;

export const AuthorshipSubject = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('metric'), metric: MetricId }),
  z.strictObject({ kind: z.literal('input'), input: InputField }),
  z.strictObject({ kind: z.literal('rule'), ruleId: RuleId }),
]);
export type AuthorshipSubject = z.infer<typeof AuthorshipSubject>;

export const AuthorshipExplanationEntry = z.strictObject({
  eventId: EventId,
  subject: AuthorshipSubject,
  attribution: AuthorshipAttribution,
});
export type AuthorshipExplanationEntry = z.infer<typeof AuthorshipExplanationEntry>;

export function authorshipExplanation(
  entries: readonly LedgerEntry[],
): readonly AuthorshipExplanationEntry[] {
  const ordered = [...Ledger.parse(entries)].sort(compareEntries);
  const body = foldApprovedEvents(ordered);
  const approvedIds = childApprovedCandidateIds(ordered);
  const heldMetrics = new Set<MetricId>(body.metrics);
  const heldInputs = new Set<InputField>(body.inputs);
  const heldRules = new Set<string>(body.rules.map((rule) => rule.ruleId));

  const result: AuthorshipExplanationEntry[] = [];

  for (const entry of ordered) {
    if (entry.entryKind !== 'candidate' || !approvedIds.has(entry.eventId)) {
      continue;
    }
    const explained = explainIfHeld(entry, heldMetrics, heldInputs, heldRules);
    if (explained !== null) {
      result.push(explained);
    }
  }

  return result;
}

function explainIfHeld(
  entry: CandidateEntry,
  heldMetrics: ReadonlySet<MetricId>,
  heldInputs: ReadonlySet<InputField>,
  heldRules: ReadonlySet<string>,
): AuthorshipExplanationEntry | null {
  const mutation = entry.candidateMutation;
  const attribution = attributionOf(entry);

  switch (mutation.operation) {
    case 'add_metric': {
      if (!heldMetrics.has(mutation.metric)) {
        return null;
      }
      return AuthorshipExplanationEntry.parse({
        eventId: entry.eventId,
        subject: { kind: 'metric', metric: mutation.metric },
        attribution,
      });
    }
    case 'add_input': {
      if (!heldInputs.has(mutation.input)) {
        return null;
      }
      return AuthorshipExplanationEntry.parse({
        eventId: entry.eventId,
        subject: { kind: 'input', input: mutation.input },
        attribution,
      });
    }
    case 'add_rule': {
      if (!heldRules.has(mutation.rule.ruleId)) {
        return null;
      }
      return AuthorshipExplanationEntry.parse({
        eventId: entry.eventId,
        subject: { kind: 'rule', ruleId: mutation.rule.ruleId },
        attribution,
      });
    }
    default:
      return null;
  }
}

function attributionOf(entry: CandidateEntry): AuthorshipAttribution {
  if (entry.type === 'rule_correction') {
    return 'child_taught';
  }
  if (entry.actor === 'ai') {
    return 'ai_suggested_child_accepted';
  }
  return 'child_chosen';
}
