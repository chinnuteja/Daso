import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import { millimetresToMetres, validityChanges, type RuntimeResult } from '../../core/runtime';
import type { ToolVersion } from '../../core/schema/toolVersion';
import type { ReadingBand } from '../../core/schema/vocabulary';
import { ChoiceButton } from '../components/ChoiceButton';
import { WhyPanel } from './WhyPanel';

import styles from './screens.module.css';

export function CompilePreviewScreen(props: {
  readonly prompt: string;
  readonly version: ToolVersion | null;
  readonly runtime: RuntimeResult | null;
  readonly previousRuntime: RuntimeResult | null;
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly readingBand: ReadingBand;
  readonly childName: string;
  readonly onAcknowledge: () => void;
  readonly onOpenRunner: () => void;
}) {
  const changed =
    props.previousRuntime === null || props.runtime === null
      ? []
      : validityChanges(props.previousRuntime, props.runtime);
  const taughtRule = props.version?.rules[0];
  const wordsBecameRule =
    taughtRule !== undefined && props.previousRuntime !== null && changed.length > 0;

  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.version !== null ? (
        <section className={styles.proofPanel}>
          <header className={styles.proofHeader}>
            <div>
              <p className={styles.eyebrow}>Saved as a lasting tool</p>
              <h2>Your new version is ready.</h2>
            </div>
            <span className={styles.versionBadge}>Saved version: {props.version.versionId}</span>
          </header>
          <div className={styles.versionGrid}>
            <div className={styles.versionItem}>
              <span>Writes down</span>
              <strong>{props.version.inputs.join(', ')}</strong>
            </div>
            <div className={styles.versionItem}>
              <span>Compares</span>
              <strong>{props.version.metrics.join(', ') || 'none'}</strong>
            </div>
            <div className={styles.versionItem}>
              <span>New rule</span>
              <strong>{props.version.rules.map((rule) => rule.ruleId).join(', ') || 'none yet'}</strong>
            </div>
          </div>
        </section>
      ) : null}
      {props.runtime !== null ? (
        <RankingPanel runtime={props.runtime} previous={props.previousRuntime} changed={changed} />
      ) : null}
      {wordsBecameRule && taughtRule !== undefined ? (
        <p className={styles.ruleResult}>
          <strong>Your words became a rule.</strong>{' '}
          {taughtRule.ruleId} now excludes the unfair throw.
        </p>
      ) : null}
      <WhyPanel
        explanation={props.explanation}
        readingBand={props.readingBand}
        childName={props.childName}
      />
      <div className={styles.actionsInline}>
        <ChoiceButton quiet onClick={props.onAcknowledge}>I have seen what the tool does</ChoiceButton>
        <ChoiceButton emphasis="primary" onClick={props.onOpenRunner}>
          Open Maya’s Flight Lab
        </ChoiceButton>
      </div>
    </div>
  );
}

function RankingPanel(props: {
  readonly runtime: RuntimeResult;
  readonly previous: RuntimeResult | null;
  readonly changed: readonly string[];
}) {
  const winner = props.runtime.winner ?? 'none yet';
  const ranking = props.runtime.ranking.map((entry) => rankingCaption(entry)).join('; ');
  const previousWinner = props.previous?.winner;
  const showCompare = previousWinner !== undefined && props.runtime.winner !== undefined;

  return (
    <section className={styles.proofPanel}>
      <header className={styles.proofHeader}>
        <div>
          <p className={styles.eyebrow}>Same throws, new rule</p>
          <h2>See exactly what changed.</h2>
        </div>
        <p>Dart’s obstructed throw is replayed under the rule Maya approved.</p>
      </header>
      {showCompare ? (
        <div className={styles.compare}>
          <div className={styles.compareBlock}>
            <strong>Before: {previousWinner} leads</strong>
            <p>The same stored throws, before the approved rule.</p>
          </div>
          <div className={styles.compareBlock}>
            <strong>Now: {props.runtime.winner} leads</strong>
            <p>The same stored throws, after the approved rule.</p>
          </div>
        </div>
      ) : null}
      <p><strong>Winner now:</strong> {winner}</p>
      <p><strong>Ranking:</strong> {ranking || 'not enough valid throws yet'}</p>
      {props.changed.length > 0 ? (
        <p className={styles.changeReason}>
          <strong>Why the result moved:</strong> after this correction,{' '}
          {props.changed.join(', ')} changed validity.
          {previousWinner !== undefined ? ` Before, ${previousWinner} was first.` : ''}
          {props.runtime.winner !== undefined ? ` Now ${props.runtime.winner} is first.` : ''}
        </p>
      ) : null}
    </section>
  );
}

function rankingCaption(entry: RuntimeResult['ranking'][number]): string {
  if (entry.medianDistanceMm !== undefined) {
    return `${entry.rank}. ${entry.designName} — ${String(millimetresToMetres(entry.medianDistanceMm))} m`;
  }
  if (entry.consistencyMm !== undefined) {
    return `${entry.rank}. ${entry.designName} — spread ${String(entry.consistencyMm)} mm`;
  }
  return `${entry.rank}. ${entry.designName}`;
}
