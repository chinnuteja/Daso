import { ChoiceButton } from '../components/ChoiceButton';
import { SuggestionCard } from '../components/SuggestionCard';

import styles from './screens.module.css';

export function ProposeCorrectionScreen(props: {
  readonly prompt: string;
  readonly question: string | null;
  readonly explanation: string;
  readonly onOfferDistanceRule: () => void;
  readonly onOfferMetricRemoval: () => void;
  readonly onExplain: () => void;
  readonly onOfferCorrection: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      {props.question !== null && <p>{props.question}</p>}
      <SuggestionCard>
        <p>Should Flight Lab stop counting throws that measure 8.9 metres?</p>
        <ChoiceButton kind="suggest" onClick={props.onOfferDistanceRule}>
          Review this suggestion
        </ChoiceButton>
      </SuggestionCard>
      <SuggestionCard>
        <p>Or should Flight Lab stop comparing distance altogether?</p>
        <ChoiceButton kind="suggest" onClick={props.onOfferMetricRemoval}>
          Review this suggestion
        </ChoiceButton>
      </SuggestionCard>
      <ChoiceButton kind="child" onClick={props.onExplain}>
        {props.explanation}
      </ChoiceButton>
      <ChoiceButton onClick={props.onOfferCorrection}>Review the rule I taught</ChoiceButton>
    </div>
  );
}
