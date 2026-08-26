import type { ReactNode } from 'react';

import { millimetresToMetres, type RuntimeResult } from '../../core/runtime';
import type { ExperimentTrial } from '../../core/schema/experimentTrial';
import type { ReadingBand } from '../../core/schema/vocabulary';
import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { ToolVersion } from '../../core/schema/toolVersion';
import { ChoiceButton } from '../components/ChoiceButton';
import { disclosureWhatIsReal, disclosuresForSurface } from '../copy/disclosures';
import { DELETED_SOURCE_COPY } from '../copy/parent';
import { WhyPanel } from './WhyPanel';

import styles from './screens.module.css';

const DESIGNS = ['Falcon', 'Dart', 'Glider'] as const;

export function RunnerScreen(props: {
  readonly status: 'loading' | 'empty' | 'ready' | 'integrity_error';
  readonly integrityMessage?: string;
  readonly title: string;
  readonly ownerName: string;
  readonly sourceAuthorName: string | null;
  readonly sourceDeleted: boolean;
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
      <section className={styles.modeCard}>
        <header className={styles.modeHeader}>
          <div>
            <p className={styles.eyebrow}>Use mode</p>
            <h2 className={styles.modeTitle}>{props.title}</h2>
          </div>
          <p className={styles.offlineBadge}>Saved rules — works without AI</p>
        </header>
        <p className={styles.modeCopy}>
          This screen works from saved rules, without AI. Record a throw and the saved rules
          decide what counts.
        </p>
      </section>
      {props.status === 'loading' ? <p className={styles.muted}>Opening the saved tool…</p> : null}
      {props.status === 'empty' ? (
        <p className={styles.muted}>This tool is not saved on this tablet yet.</p>
      ) : null}
      {props.status === 'integrity_error' ? (
        <p className={styles.refusal}>{props.integrityMessage}</p>
      ) : null}
      {props.status === 'ready' && props.version !== null ? (
        <>
          <section className={styles.modeCard}>
            <div className={styles.metaGrid}>
              <div
                className={styles.metaItem}
                role="group"
                aria-label={`Owner: ${props.ownerName}`}
              >
                <span>Owner</span>
                <strong>{props.ownerName}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Origin</span>
                <strong>
                  {props.sourceAuthorName !== null
                    ? `Inherited from ${props.sourceAuthorName}`
                    : props.sourceDeleted
                      ? DELETED_SOURCE_COPY
                      : 'Made here'}
                </strong>
              </div>
              <div className={styles.metaItem}>
                <span>Saved version</span>
                <strong>{props.version.versionId}</strong>
              </div>
            </div>
            <p className={styles.ruleCallout}>
              <strong>Active rule:</strong>{' '}
              {props.version.rules.map((rule) => rule.ruleId).join(', ') || 'none'}
            </p>
            <p className={styles.muted}>
              Compared by {props.version.metrics.join(', ') || 'no active comparison'}.
            </p>
          </section>
          {props.runtime !== null ? <RankingPanel runtime={props.runtime} /> : null}
          {props.lastTrial !== null ? (
            <p className={styles.latestTrial} role="status">
              <strong>Latest throw:</strong> {props.lastTrial.designName} —{' '}
              {props.lastTrial.validUnderCurrentVersion ? 'counted' : 'not counted'}
            </p>
          ) : null}
          {inheritedRuleCopy(props.version, props.sourceAuthorName, props.sourceDeleted, props.explanation)}
          {props.needsCopy ? (
            <ChoiceButton emphasis="primary" onClick={props.onMakeCopy}>Make my copy</ChoiceButton>
          ) : null}
          {props.canCapture && props.onCapture !== undefined ? (
            <CaptureForm onCapture={props.onCapture} />
          ) : null}
          <WhyPanel
            explanation={props.explanation}
            readingBand={props.readingBand}
            childName={props.creditName}
          />
          <RunnerDisclosures sourceDeleted={props.sourceDeleted} />
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
    <section className={styles.proofPanel}>
      <div className={styles.proofHeader}>
        <div>
          <p className={styles.eyebrow}>Live result</p>
          <h2>{winner === 'none yet' ? 'Keep testing.' : `${winner} leads.`}</h2>
        </div>
        <p>Calculated locally from saved observations.</p>
      </div>
      <p><strong>Winner now:</strong> {winner}</p>
      <p><strong>Ranking:</strong> {ranking || 'not enough valid throws yet'}</p>
    </section>
  );
}

function inheritedRuleCopy(
  version: ToolVersion,
  sourceAuthorName: string | null,
  sourceDeleted: boolean,
  explanation: readonly AuthorshipExplanationEntry[],
): ReactNode {
  const taught = explanation.find((entry) => entry.attribution === 'child_taught');
  const rule = version.rules.find((candidate) =>
    taught !== undefined && taught.subject.kind === 'rule'
      ? candidate.ruleId === taught.subject.ruleId
      : false,
  );
  if (rule === undefined || taught === undefined || taught.subject.kind !== 'rule') {
    return null;
  }
  if (sourceDeleted) {
    return (
      <p className={styles.ruleCallout}>
        A deleted profile taught {taught.subject.ruleId}. An obstructed throw is not counted.
      </p>
    );
  }
  if (sourceAuthorName === null) {
    return null;
  }
  return (
    <p className={styles.ruleCallout}>
      {sourceAuthorName} taught {taught.subject.ruleId}. An obstructed throw is not counted.
    </p>
  );
}

function RunnerDisclosures(props: { readonly sourceDeleted: boolean }) {
  const entries = disclosuresForSurface('in_product_runner_mode');
  return (
    <aside className={styles.disclosure}>
      {entries.map((entry) => (
        <dl key={entry.capability}>
          <dt>What is simulated</dt>
          <dd>{entry.whatIsSimulated}</dd>
          <dt>What is real</dt>
          <dd>{disclosureWhatIsReal(entry, { sourceDeleted: props.sourceDeleted })}</dd>
        </dl>
      ))}
    </aside>
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
      className={`${styles.stack} ${styles.formCard}`}
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
      <div className={styles.formHeading}>
        <div>
          <p className={styles.eyebrow}>New throw</p>
          <h2>Try the saved tool.</h2>
        </div>
        <p>Measure the throw yourself, then record it here.</p>
      </div>
      <div className={styles.fieldGrid}>
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
          <input name="distanceM" type="number" min={0} step="0.1" inputMode="decimal" required />
        </label>
      </div>
      <label className={`${styles.field} ${styles.hit}`}>
        <input name="obstruction" type="checkbox" />
        <span>Did it touch something?</span>
      </label>
      <ChoiceButton type="submit" emphasis="primary">Record this throw</ChoiceButton>
    </form>
  );
}
