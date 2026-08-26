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
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Build from curiosity</p>
          <h2 className={styles.display}>Teach a tool from a real question.</h2>
          <p className={styles.heroLede}>Your observations become saved rules.</p>
          <p className={styles.heroThesis}>
            Notice what matters. Teach the computer why. Use what you made tomorrow.
          </p>
          <div className={styles.heroAction}>
            <ChoiceButton emphasis="primary" onClick={props.onStartTeaching}>
              Start with a question
            </ChoiceButton>
          </div>
        </div>
        <div className={styles.storyMap} aria-label="How a child-made tool grows">
          <div className={styles.storyStep}>
            <span className={styles.storyNumber}>01</span>
            <strong>Notice</strong>
            <span>Something does not look fair.</span>
          </div>
          <div className={styles.storyStep}>
            <span className={styles.storyNumber}>02</span>
            <strong>Teach</strong>
            <span>Your reason becomes a saved rule.</span>
          </div>
          <div className={styles.storyStep}>
            <span className={styles.storyNumber}>03</span>
            <strong>Use</strong>
            <span>The tool remembers without AI.</span>
          </div>
        </div>
      </section>
      {props.deletedToolId !== null ? (
        <p className={styles.notice} role="status">{TOOL_DELETED_COPY}</p>
      ) : null}
      {props.deletedProfileId !== null ? (
        <p className={styles.notice} role="status">{PROFILE_DELETED_COPY}</p>
      ) : null}
      {props.loading ? <p className={styles.muted}>Loading saved tools…</p> : null}
      {!props.loading && props.tiles.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.emptyMark} aria-hidden="true">✦</span>
          <div>
            <h2>Your workbench is ready.</h2>
            <p>No saved tools yet. Begin with a question; your first tool will live here.</p>
          </div>
        </section>
      ) : null}
      {!props.loading && props.tiles.length > 0 ? (
        <section className={styles.savedSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Made on this tablet</p>
              <h2>Your saved tools</h2>
            </div>
            <p>Every tool below carries its own rules and history.</p>
          </div>
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
          </div>
        </section>
      ) : null}
    </div>
  );
}
