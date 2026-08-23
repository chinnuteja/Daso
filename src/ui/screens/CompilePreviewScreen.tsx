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
        <section className={styles.tile}>
          <p>Saved version: {props.version.versionId}</p>
          <p>Inputs: {props.version.inputs.join(', ')}</p>
          <p>Comparisons: {props.version.metrics.join(', ') || 'none'}</p>
          <p>Rules: {props.version.rules.map((rule) => rule.ruleId).join(', ') || 'none yet'}</p>
        </section>
      ) : null}
      {props.runtime !== null ? (
        <RankingPanel runtime={props.runtime} previous={props.previousRuntime} changed={changed} />
      ) : null}
      {wordsBecameRule && taughtRule !== undefined ? (
        <p className={styles.status}>
          Your words became a rule. {taughtRule.ruleId} now excludes the unfair throw.
        </p>
      ) : null}
      <WhyPanel
        explanation={props.explanation}
        readingBand={props.readingBand}
        childName={props.childName}
      />
      <ChoiceButton onClick={props.onAcknowledge}>I have seen what the tool does</ChoiceButton>
      <ChoiceButton onClick={props.onOpenRunner}>Open Maya’s Flight Lab</ChoiceButton>
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
    <section className={styles.tile}>
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
      <p>Winner now: {winner}</p>
      <p>Ranking: {ranking || 'not enough valid throws yet'}</p>
      {props.changed.length > 0 ? (
        <p>
          After this correction, {props.changed.join(', ')} changed validity.
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
