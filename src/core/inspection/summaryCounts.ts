import { z } from 'zod';

import { foldApprovedEvents } from '../ledger/fold';
import { Ledger, LedgerEntry, compareEntries } from '../ledger/types';
import { CandidateMutation } from '../schema/mutation';
import { EventId } from '../schema/primitives';
import { ExperimentTrial } from '../schema/experimentTrial';
import { InputField, MetricId } from '../schema/vocabulary';

/**
 * Internal authorship summary counts (specification section 10).
 *
 * `unapprovedDecisionsInCompiledVersion` is the number of unapproved candidates whose
 * mutation still appears in the folded body. Under ruling R1 that number is always zero;
 * the field exists so a broken fold cannot hide behind a missing count.
 */

export const AuthorshipSummaryCounts = z.strictObject({
  childDefinedDecisions: z.number().int().nonnegative(),
  observedExamples: z.number().int().nonnegative(),
  childCorrections: z.number().int().nonnegative(),
  aiSuggestionsAccepted: z.number().int().nonnegative(),
  unapprovedDecisionsInCompiledVersion: z.number().int().nonnegative(),
});
export type AuthorshipSummaryCounts = z.infer<typeof AuthorshipSummaryCounts>;

export function authorshipSummaryCounts(
  entries: readonly LedgerEntry[],
  trials: readonly ExperimentTrial[] = [],
): AuthorshipSummaryCounts {
  const ordered = [...Ledger.parse(entries)].sort(compareEntries);
  const body = foldApprovedEvents(ordered);
  const heldMetrics = new Set<MetricId>(body.metrics);
  const heldInputs = new Set<InputField>(body.inputs);
  const heldRules = new Set<string>(body.rules.map((rule) => rule.ruleId));
  const heldCoachingSource = body.coachingPreference?.sourceEventId;
  const approvedIds = childApprovedCandidateIds(ordered);

  let childDefinedDecisions = 0;
  let childCorrections = 0;
  let aiSuggestionsAccepted = 0;
  let unapprovedDecisionsInCompiledVersion = 0;

  for (const entry of ordered) {
    if (entry.entryKind !== 'candidate') {
      continue;
    }

    const approved = approvedIds.has(entry.eventId);
    if (approved && entry.type === 'definition_decision') {
      childDefinedDecisions += 1;
    }
    if (approved && entry.type === 'rule_correction') {
      childCorrections += 1;
    }
    if (approved && entry.actor === 'ai') {
      aiSuggestionsAccepted += 1;
    }
    if (
      !approved &&
      mutationAppearsInBody(entry.candidateMutation, heldMetrics, heldInputs, heldRules, heldCoachingSource, entry.eventId)
    ) {
      unapprovedDecisionsInCompiledVersion += 1;
    }
  }

  return AuthorshipSummaryCounts.parse({
    childDefinedDecisions,
    observedExamples: ExperimentTrial.array().parse(trials).length,
    childCorrections,
    aiSuggestionsAccepted,
    unapprovedDecisionsInCompiledVersion,
  });
}

export function childApprovedCandidateIds(
  ordered: readonly LedgerEntry[],
): ReadonlySet<EventId> {
  const candidateIds = new Set<EventId>(
    ordered.filter((entry) => entry.entryKind === 'candidate').map((entry) => entry.eventId),
  );
  const approved = new Set<EventId>();
  for (const entry of ordered) {
    if (entry.entryKind === 'approval' && entry.actor === 'child' && candidateIds.has(entry.approves)) {
      approved.add(entry.approves);
    }
  }
  return approved;
}

function mutationAppearsInBody(
  mutation: CandidateMutation,
  heldMetrics: ReadonlySet<MetricId>,
  heldInputs: ReadonlySet<InputField>,
  heldRules: ReadonlySet<string>,
  heldCoachingSource: EventId | undefined,
  eventId: EventId,
): boolean {
  switch (mutation.operation) {
    case 'add_metric':
      return heldMetrics.has(mutation.metric);
    case 'remove_metric':
      return !heldMetrics.has(mutation.metric);
    case 'add_input':
      return heldInputs.has(mutation.input);
    case 'add_rule':
      return heldRules.has(mutation.rule.ruleId);
    case 'remove_rule':
      return !heldRules.has(mutation.ruleId);
    case 'set_coaching_preference':
      return heldCoachingSource === eventId;
  }
}
