import { ChoiceButton } from './ChoiceButton';
import type { SavedToolTileView } from '../flows/runner/savedTiles';

import styles from './SavedToolTile.module.css';

export function SavedToolTile(props: {
  readonly tile: SavedToolTileView;
  readonly onOpenRunner: () => void;
  readonly onDayTwo?: () => void;
}) {
  return (
    <article className={styles.tile}>
      <strong>{props.tile.displayName}</strong>
      <p>Created by {props.tile.creatorName}</p>
      <p>
        {props.tile.observationCount} observations · {props.tile.approvedCorrectionCount}{' '}
        corrections
      </p>
      <ChoiceButton onClick={props.onOpenRunner}>Open in Runner Mode</ChoiceButton>
      {props.onDayTwo !== undefined ? (
        <ChoiceButton onClick={props.onDayTwo}>Let Leo try this</ChoiceButton>
      ) : null}
    </article>
  );
}
