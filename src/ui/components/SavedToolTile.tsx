import { ChoiceButton } from './ChoiceButton';
import type { SavedToolTileView } from '../flows/runner/savedTiles';

import styles from './SavedToolTile.module.css';

import { DELETED_SOURCE_COPY } from '../copy/parent';

export function SavedToolTile(props: {
  readonly tile: SavedToolTileView;
  readonly onOpenRunner: () => void;
  readonly onParentEvidence: () => void;
  readonly onDayTwo?: () => void;
}) {
  const isPreference = props.tile.kind === 'coaching_preference';
  return (
    <article className={styles.tile}>
      <div className={styles.topline}>
        <span className={styles.toolMark} aria-hidden="true">↗</span>
        <span className={styles.ready}>Ready to use</span>
      </div>
      <div className={styles.identity}>
        <h3>{props.tile.displayName}</h3>
        <p>Created by {props.tile.creatorName}</p>
        {props.tile.sourceDeleted ? <p className={styles.provenance}>{DELETED_SOURCE_COPY}</p> : null}
      </div>
      {isPreference ? (
        <p className={styles.counts}>Writing <span aria-hidden="true">·</span> Child-approved behavior</p>
      ) : (
        <p className={styles.counts}>
          <strong>{props.tile.observationCount}</strong> observations
          <span aria-hidden="true">·</span>
          <strong>{props.tile.approvedCorrectionCount}</strong> corrections
        </p>
      )}
      <ChoiceButton emphasis="primary" onClick={props.onOpenRunner}>
        {isPreference ? 'Open my preference' : 'Use this tool'}
      </ChoiceButton>
      {!isPreference ? <div className={styles.secondaryActions}>
        <ChoiceButton quiet onClick={props.onParentEvidence}>
          Parent evidence
        </ChoiceButton>
        {props.onDayTwo !== undefined ? (
          <ChoiceButton quiet onClick={props.onDayTwo}>
            Let Leo try this
          </ChoiceButton>
        ) : null}
      </div> : null}
    </article>
  );
}
