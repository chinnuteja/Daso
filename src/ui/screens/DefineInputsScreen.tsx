import { ChoiceButton } from '../components/ChoiceButton';
import { SuggestionCard } from '../components/SuggestionCard';

import styles from './screens.module.css';

export function DefineInputsScreen(props: {
  readonly prompt: string;
  readonly onChooseDesign: () => void;
  readonly onChooseDistance: () => void;
  readonly onAcceptObstruction: () => void;
  readonly onDeclineNote: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>{props.prompt}</p>
      <div className={styles.actions}>
        <ChoiceButton kind="child" onClick={props.onChooseDesign}>
          The plane’s name
        </ChoiceButton>
        <ChoiceButton kind="child" onClick={props.onChooseDistance}>
          How many metres it went
        </ChoiceButton>
      </div>
      <SuggestionCard>
        <p>Should Flight Lab also write down whether the plane touched something on the way?</p>
        <ChoiceButton kind="suggest" onClick={props.onAcceptObstruction}>
          Yes — record obstruction
        </ChoiceButton>
      </SuggestionCard>
      <p>You can skip writing a free note. That is not part of this tool yet.</p>
      <ChoiceButton onClick={props.onDeclineNote}>Don’t add a note field</ChoiceButton>
      <ChoiceButton onClick={props.onConfirm}>These are the things we write down</ChoiceButton>
    </div>
  );
}
