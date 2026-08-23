import type { ReactNode } from 'react';

import { millimetresToMetres, type RuntimeResult } from '../../core/runtime';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import type { ReadingBand } from '../../core/schema/vocabulary';
import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { ToolVersion } from '../../core/schema/toolVersion';
import { ChoiceButton } from '../components/ChoiceButton';
import { WhyPanel } from './WhyPanel';

import styles from './screens.module.css';

const DESIGNS = ['Falcon', 'Dart', 'Glider'] as const;

export function RunnerScreen(props: {
  readonly status: 'loading' | 'empty' | 'ready' | 'integrity_error';
  readonly integrityMessage?: string;
  readonly title: string;
  readonly ownerName: string;
  readonly sourceAuthorName: string | null;
  readonly version: ToolVersion | null;
  readonly runtime: RuntimeResult | null;
  readonly lastTrial: ExperimentTrial | null;
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly readingBand: ReadingBand;
  readonly creditName: string;
  readonly canCapture: boolean;
  readonly needsCopy: boolean;
  readonly onMakeCopy?: () => void;
  readonly onCapture?: (fields: {
    readonly designName: string;
    readonly distanceM: number;
    readonly obstruction: boolean;
  }) => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.title}</p>
      <p className={styles.muted}>Runs from saved rules — no AI call in Runner Mode.</p>
      {props.status === 'loading' ? <p className={styles.muted}>Opening the saved tool…</p> : null}
      {props.status === 'empty' ? (
        <p className={styles.muted}>This tool is not saved on this tablet yet.</p>
      ) : null}
      {props.status === 'integrity_error' ? (
        <p className={styles.refusal}>{props.integrityMessage}</p>
      ) : null}
      {props.status === 'ready' && props.version !== null ? (
        <>
          <section className={styles.tile}>
            <p>Owner: {props.ownerName}</p>
            {props.sourceAuthorName !== null ? <p>Inherited from {props.sourceAuthorName}</p> : null}
            <p>Saved version: {props.version.versionId}</p>
            <p>Comparisons: {props.version.metrics.join(', ') || 'none'}</p>
            <p>Rules: {props.version.rules.map((rule) => rule.ruleId).join(', ') || 'none'}</p>
          </section>
          {props.runtime !== null ? <RankingPanel runtime={props.runtime} /> : null}
          {props.lastTrial !== null ? (
            <p>
              Latest throw: {props.lastTrial.designName} —{' '}
              {props.lastTrial.validUnderCurrentVersion ? 'counted' : 'not counted'}
            </p>
          ) : null}
          {inheritedRuleCopy(props.version, props.sourceAuthorName, props.explanation)}
          {props.needsCopy ? (
            <ChoiceButton onClick={props.onMakeCopy}>Make my copy</ChoiceButton>
          ) : null}
          {props.canCapture && props.onCapture !== undefined ? (
            <CaptureForm onCapture={props.onCapture} />
          ) : null}
          <WhyPanel
            explanation={props.explanation}
            readingBand={props.readingBand}
            childName={props.creditName}
          />
        </>
      ) : null}
    </div>
  );
}

function RankingPanel(props: { readonly runtime: RuntimeResult }) {
  const winner = props.runtime.winner ?? 'none yet';
  const ranking = props.runtime.ranking
    .map((entry) => {
      if (entry.medianDistanceMm !== undefined) {
        return `${entry.rank}. ${entry.designName} — ${String(millimetresToMetres(entry.medianDistanceMm))} m`;
      }
      return `${entry.rank}. ${entry.designName}`;
    })
    .join('; ');
  return (
    <section className={styles.tile}>
      <p>Winner now: {winner}</p>
      <p>Ranking: {ranking || 'not enough valid throws yet'}</p>
    </section>
  );
}

function inheritedRuleCopy(
  version: ToolVersion,
  sourceAuthorName: string | null,
  explanation: readonly AuthorshipExplanationEntry[],
): ReactNode {
  if (sourceAuthorName === null) {
    return null;
  }
  const taught = explanation.find((entry) => entry.attribution === 'child_taught');
  const rule = version.rules.find((candidate) =>
    taught !== undefined && taught.subject.kind === 'rule'
      ? candidate.ruleId === taught.subject.ruleId
      : false,
  );
  if (rule === undefined || taught === undefined || taught.subject.kind !== 'rule') {
    return null;
  }
  return (
    <p>
      {sourceAuthorName} taught {taught.subject.ruleId}. An obstructed throw is not counted.
    </p>
  );
}

function CaptureForm(props: {
  readonly onCapture: (fields: {
    readonly designName: string;
    readonly distanceM: number;
    readonly obstruction: boolean;
  }) => void;
}) {
  return (
    <form
      className={styles.stack}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        props.onCapture({
          designName: String(data.get('designName') ?? ''),
          distanceM: Number(data.get('distanceM')),
          obstruction: data.get('obstruction') === 'on',
        });
        event.currentTarget.reset();
      }}
    >
      <label className={styles.field}>
        Plane
        <select name="designName" required>
          {DESIGNS.map((design) => (
            <option key={design} value={design}>
              {design}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Distance in metres
        <input name="distanceM" type="number" min={0} step="0.1" required />
      </label>
      <label className={styles.field}>
        <span>Did it touch something?</span>
        <input name="obstruction" type="checkbox" />
      </label>
      <ChoiceButton type="submit">Record this throw</ChoiceButton>
    </form>
  );
}
