import { SavedToolTile } from '../components/SavedToolTile';
import { ChoiceButton } from '../components/ChoiceButton';
import { PROFILE_DELETED_COPY, TOOL_DELETED_COPY } from '../copy/parent';
import { MAYA_CHILD_ID, type SavedToolTileView } from '../flows/runner';

import styles from './screens.module.css';

export function HomeScreen(props: {
  readonly tiles: readonly SavedToolTileView[];
  readonly loading: boolean;
  readonly deletedToolId: string | null;
  readonly deletedProfileId: string | null;
  readonly onStartTeaching: () => void;
  readonly onOpenRunner: (toolId: string, viewerChildId: string) => void;
  readonly onParentEvidence: (toolId: string) => void;
  readonly onDayTwo: (toolId: string) => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>Your tools live on this tablet. Nothing here is a race or a streak.</p>
      {props.deletedToolId !== null ? <p>{TOOL_DELETED_COPY}</p> : null}
      {props.deletedProfileId !== null ? <p>{PROFILE_DELETED_COPY}</p> : null}
      {props.loading ? <p className={styles.muted}>Loading saved tools…</p> : null}
      {!props.loading && props.tiles.length === 0 ? (
        <p className={styles.muted}>No saved tools yet. Teach one to keep it here.</p>
      ) : null}
      <div className={styles.tiles}>
        {props.tiles.map((tile) => (
          <SavedToolTile
            key={tile.toolId}
            tile={tile}
            onOpenRunner={() => {
              props.onOpenRunner(tile.toolId, tile.ownerChildId);
            }}
            onParentEvidence={() => {
              props.onParentEvidence(tile.toolId);
            }}
            onDayTwo={
              tile.ownerChildId === MAYA_CHILD_ID
                ? () => {
                    props.onDayTwo(tile.toolId);
                  }
                : undefined
            }
          />
        ))}
        <div className={styles.tile}>
          <strong>Teach a new tool</strong>
          <ChoiceButton onClick={props.onStartTeaching}>Start with a question</ChoiceButton>
        </div>
      </div>
    </div>
  );
}
