import type { AuthorshipExplanationEntry } from '../../core/inspection/authorshipView';
import type { ToolVersionBody } from '../../core/schema/toolVersion';
import type { ReadingBand } from '../../core/schema/vocabulary';
import { ChoiceButton } from '../components/ChoiceButton';
import { WhyPanel } from './WhyPanel';

import styles from './screens.module.css';

export function CompilePreviewScreen(props: {
  readonly prompt: string;
  readonly body: ToolVersionBody | null;
  readonly explanation: readonly AuthorshipExplanationEntry[];
  readonly readingBand: ReadingBand;
  readonly childName: string;
  readonly onAcknowledge: () => void;
  readonly onOpenRunner: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.body !== null && (
        <section className={styles.tile}>
          <p>Inputs: {props.body.inputs.join(', ')}</p>
          <p>Comparisons: {props.body.metrics.join(', ')}</p>
          <p>Rules: {props.body.rules.map((rule) => rule.ruleId).join(', ') || 'none yet'}</p>
        </section>
      )}
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
