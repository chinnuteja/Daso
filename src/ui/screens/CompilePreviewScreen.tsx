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
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.version !== null ? (
        <section className={styles.tile}>
          <p>Saved version: {props.version.versionId}</p>
          <p>Inputs: {props.version.inputs.join(', ')}</p>
          <p>Comparisons: {props.version.metrics.join(', ')}</p>
          <p>Rules: {props.version.rules.map((rule) => rule.ruleId).join(', ') || 'none yet'}</p>
        </section>
      ) : null}
      {props.runtime !== null ? <RankingPanel runtime={props.runtime} previous={props.previousRuntime} /> : null}
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
}) {
  const winner = props.runtime.winner ?? 'none yet';
  const ranking = props.runtime.ranking
    .map(
      (entry) =>
        `${entry.rank}. ${entry.designName} — ${String(millimetresToMetres(entry.medianDistanceMm))} m`,
    )
    .join('; ');
  const changed = props.previous === null ? [] : validityChanges(props.previous, props.runtime);
  const previousWinner = props.previous?.winner;

  return (
    <section className={styles.tile}>
      <p>Winner now: {winner}</p>
      <p>Ranking: {ranking || 'not enough valid throws yet'}</p>
      {changed.length > 0 ? (
        <p>
          After this correction, {changed.join(', ')} changed validity.
          {previousWinner !== undefined ? ` Before, ${previousWinner} was first.` : ''}
          {props.runtime.winner !== undefined ? ` Now ${props.runtime.winner} is first.` : ''}
        </p>
      ) : null}
    </section>
  );
}
