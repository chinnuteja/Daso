import { ChoiceButton } from '../components/ChoiceButton';
import { SuggestionCard } from '../components/SuggestionCard';

import styles from './screens.module.css';

export function DefineInputsScreen(props: {
  readonly prompt: string;
  readonly canConfirm: boolean;
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
      <p className={styles.muted}>A free note is optional and is not part of this tool yet.</p>
      <ChoiceButton quiet onClick={props.onDeclineNote}>Don’t add a note field</ChoiceButton>
      {!props.canConfirm ? (
        <p className={styles.muted}>Choose the plane name and distance before moving on.</p>
      ) : null}
      <ChoiceButton emphasis="primary" onClick={props.onConfirm} disabled={!props.canConfirm}>
        These are the things we write down
      </ChoiceButton>
    </div>
  );
}
