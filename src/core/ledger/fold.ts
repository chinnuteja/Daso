import { AuthorshipEvent } from '../schema/authorshipEvent';
import { CandidateMutation, toDocumentedMutation } from '../schema/mutation';
import { EventId, ToolId } from '../schema/primitives';
import { ToolVersionBody } from '../schema/toolVersion';
import { InputField, MetricId, ToolRule } from '../schema/vocabulary';
import { deepFreeze } from '../serialization/deepFreeze';
import { CandidateEntry, Ledger, LedgerEntry, compareEntries } from './types';

/**
 * Ruling R1: a tool version body IS the fold of a tool's approved authorship events.
 *
 * Provenance is therefore not a field anyone supplies; it is a consequence of this reduction.
 * A behaviour whose candidate entry has no matching child approval entry has no path into the
 * output, which is what turns section 12's "AI secretly authors the tool" from a policy into
 * an impossibility. `sourceEventId` on each rule is stamped here, from the identifier of the
 * approved candidate that introduced it — a caller cannot state it and cannot forge it.
 *
 * Admission is decided by the presence of a child approval entry, never by who authored the
 * candidate. A child-authored candidate that was never approved is excluded exactly as an
 * AI-authored one is.
 */

export class LedgerFoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerFoldError';
  }
}

export function foldApprovedEvents(entries: readonly LedgerEntry[]): ToolVersionBody {
  const ordered = orderedLedger(entries);
  const approvedIds = childApprovedCandidateIds(ordered);

  const inputs: InputField[] = [];
  const metrics: MetricId[] = [];
  let rules: readonly ToolRule[] = [];
  let ruleChanges = 0;

  for (const entry of ordered) {
    if (entry.entryKind !== 'candidate' || !approvedIds.has(entry.eventId)) {
      continue;
    }

    const mutation: CandidateMutation = entry.candidateMutation;

    switch (mutation.operation) {
      case 'add_input': {
        if (!inputs.includes(mutation.input)) {
          inputs.push(mutation.input);
        }
        break;
      }
      case 'add_metric': {
        if (!metrics.includes(mutation.metric)) {
          metrics.push(mutation.metric);
        }
        break;
      }
      case 'remove_metric': {
        const index = metrics.indexOf(mutation.metric);
        if (index !== -1) {
          metrics.splice(index, 1);
        }
        break;
      }
      case 'add_rule': {
        rules = withRule(rules, {
          ruleId: mutation.rule.ruleId,
          when: mutation.rule.when,
          effect: mutation.rule.effect,
          sourceEventId: entry.eventId,
        });
        ruleChanges += 1;
        break;
      }
      case 'remove_rule': {
        rules = rules.filter((rule) => rule.ruleId !== mutation.ruleId);
        ruleChanges += 1;
        break;
      }
      default:
        return assertExhaustive(mutation);
    }
  }

  // Version numbering is derived, not supplied. The definition a child assembles while
  // teaching (metrics and inputs) is version 1; each approved rule change is a correction and
  // produces the next immutable version. That is exactly section 6 scene 5's version 1 -> 2.
  const body = ToolVersionBody.parse({
    toolId: singleToolId(ordered),
    version: 1 + ruleChanges,
    inputs,
    metrics,
    rules,
  });

  return deepFreeze(body);
}

/**
 * The section 9.4 read model. `childApproved` is computed here — by looking for a child
 * approval entry that references the candidate — and is the only place in the system where
 * that field acquires a value. Approval entries themselves are ledger bookkeeping and are not
 * projected: the boolean on the candidate's record is what they mean.
 */
export function foldAuthorshipRecords(
  entries: readonly LedgerEntry[],
): readonly AuthorshipEvent[] {
  const ordered = orderedLedger(entries);
  const approvedIds = childApprovedCandidateIds(ordered);

  const records = ordered
    .filter((entry): entry is CandidateEntry => entry.entryKind === 'candidate')
    .map((entry) =>
      AuthorshipEvent.parse({
        eventId: entry.eventId,
        toolId: entry.toolId,
        actor: entry.actor,
        type: entry.type,
        originalInput: entry.originalInput,
        candidateMutation: toDocumentedMutation(entry.candidateMutation),
        childApproved: approvedIds.has(entry.eventId),
        createdAt: entry.createdAt,
      }),
    );

  return deepFreeze(records);
}

/**
 * The identifiers of candidates that carry a child approval entry. An approval by any other
 * actor is ignored, and an approval that references something which is not a candidate in this
 * stream is ignored, so a dangling reference cannot admit a behaviour.
 */
function childApprovedCandidateIds(ordered: readonly LedgerEntry[]): ReadonlySet<EventId> {
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

function orderedLedger(entries: readonly LedgerEntry[]): readonly LedgerEntry[] {
  const parsed = Ledger.parse(entries);
  if (parsed.length === 0) {
    throw new LedgerFoldError('a ledger with no entries describes no tool and cannot be folded');
  }
  return [...parsed].sort(compareEntries);
}

function singleToolId(ordered: readonly LedgerEntry[]): ToolId {
  const toolIds = new Set<ToolId>(ordered.map((entry) => entry.toolId));
  if (toolIds.size !== 1) {
    throw new LedgerFoldError(
      `a fold covers one tool stream, but these entries name ${toolIds.size} tools: ` +
        [...toolIds].sort().join(', '),
    );
  }
  const [toolId] = [...toolIds];
  if (toolId === undefined) {
    throw new LedgerFoldError('a ledger with no entries describes no tool and cannot be folded');
  }
  return toolId;
}

/** Last writer wins for a repeated rule id, at the position the rule first appeared. */
function withRule(rules: readonly ToolRule[], rule: ToolRule): readonly ToolRule[] {
  const index = rules.findIndex((held) => held.ruleId === rule.ruleId);
  if (index === -1) {
    return [...rules, rule];
  }
  return rules.map((held, at) => (at === index ? rule : held));
}

function assertExhaustive(value: never): never {
  throw new LedgerFoldError(`unhandled candidate mutation: ${JSON.stringify(value)}`);
}
