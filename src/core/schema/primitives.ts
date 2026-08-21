import { z } from 'zod';

/**
 * Scalar building blocks for the section 9 data model.
 *
 * Identifier shapes are pinned to the specification's own examples
 * (`child_local_01`, `mayas-flight-lab`, `tool_version_002`, `event_014`, `trial_004`,
 * `grant_camera_flight_lab`, `summary_001`). Sequential identifiers are zero-padded to at
 * least three digits so that the identifier a fixture states by hand and the identifier the
 * injected IdFactory produces are the same string.
 */

export const IsoTimestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u,
    'must be an ISO-8601 UTC instant such as 2026-08-18T10:00:00Z',
  );
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

export const NonEmptyString = z.string().min(1);
export type NonEmptyString = z.infer<typeof NonEmptyString>;

export const PositiveInt = z.number().int().positive();
export type PositiveInt = z.infer<typeof PositiveInt>;

export const ChildId = z
  .string()
  .regex(/^child_[a-z0-9]+(?:_[a-z0-9]+)*$/u, 'must look like child_local_01');
export type ChildId = z.infer<typeof ChildId>;

export const ToolId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'must be a lower-case slug such as mayas-flight-lab');
export type ToolId = z.infer<typeof ToolId>;

export const ToolVersionId = z
  .string()
  .regex(/^tool_version_\d{3,}$/u, 'must look like tool_version_002');
export type ToolVersionId = z.infer<typeof ToolVersionId>;

export const EventId = z.string().regex(/^event_\d{3,}$/u, 'must look like event_014');
export type EventId = z.infer<typeof EventId>;

export const TrialId = z.string().regex(/^trial_\d{3,}$/u, 'must look like trial_004');
export type TrialId = z.infer<typeof TrialId>;

export const SummaryId = z.string().regex(/^summary_\d{3,}$/u, 'must look like summary_001');
export type SummaryId = z.infer<typeof SummaryId>;

export const GrantId = z
  .string()
  .regex(/^grant_[a-z0-9]+(?:_[a-z0-9]+)*$/u, 'must look like grant_camera_flight_lab');
export type GrantId = z.infer<typeof GrantId>;

export const RuleId = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/u, 'must be a snake_case identifier such as exclude_obstructed_flight');
export type RuleId = z.infer<typeof RuleId>;

/**
 * A parent summary cites the identifiers of the things it claims happened (section 9.7's
 * example cites a trial, an authorship event and a tool version), so the reference is a
 * closed union of the three identifier families rather than a free string.
 */
export const EvidenceReferenceId = z.union([TrialId, EventId, ToolVersionId]);
export type EvidenceReferenceId = z.infer<typeof EvidenceReferenceId>;

/** Metres. Non-negative; a measurement is an observation, never a negative quantity. */
export const DistanceMetres = z.number().min(0);
export type DistanceMetres = z.infer<typeof DistanceMetres>;

/**
 * Position of an entry in an append-only stream. Starts at 1 and increases strictly, which
 * is what makes a dropped or reordered event detectable rather than invisible.
 */
export const LedgerSequence = PositiveInt;
export type LedgerSequence = z.infer<typeof LedgerSequence>;
