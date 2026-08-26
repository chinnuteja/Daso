import { disclosuresForSurface } from '../copy/disclosures';
import { EXPORT_COPY, ORPHANED_EXPORT_COPY } from '../copy/parent';
import type { ParentEvidenceView } from '../flows/parentEvidence';
import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function ParentEvidenceScreen(props: {
  readonly status: 'loading' | 'empty' | 'integrity_error' | 'ready';
  readonly message?: string;
  readonly view: ParentEvidenceView | null;
  readonly showingStored: boolean;
  readonly pendingDelete: 'tool' | 'profile' | null;
  readonly confirmDelete: 'tool' | 'profile' | null;
  readonly deleteError: string | null;
  readonly onToggleStored: () => void;
  readonly onExport: () => void;
  readonly onAskDeleteTool: () => void;
  readonly onAskDeleteProfile: () => void;
  readonly onConfirmDelete: () => void;
  readonly onCancelDelete: () => void;
}) {
  const disclosures = disclosuresForSurface('in_product_parent_view');
  const ownerName = props.view?.owner.displayName ?? 'this child';
  const toolName = props.view?.visibleTitle ?? props.view?.tool.displayName ?? 'this tool';

  return (
    <div className={styles.stack}>
      {props.status === 'loading' ? <p className={styles.muted}>Opening the parent view…</p> : null}
      {props.status === 'empty' ? <p className={styles.muted}>{props.message}</p> : null}
      {props.status === 'integrity_error' ? <p className={styles.refusal}>{props.message}</p> : null}
      {props.status === 'ready' && props.view !== null ? (
        <>
          <header className={styles.parentIntro}>
            <div>
              <p className={styles.eyebrow}>A grounded learning story</p>
              <h2>{props.view.clauses.heading}</h2>
            </div>
            <p>Every sentence below is tied to something stored on this tablet.</p>
          </header>
          <section className={styles.storyCard}>
            <p className={styles.eyebrow}>What was noticed and taught</p>
            <div className={styles.storyTimeline}>
              <div className={styles.storyItem}>
                <span className={styles.storyDot} aria-hidden="true">1</span>
                <p><strong>Question</strong>{props.view.clauses.question}</p>
              </div>
              <div className={styles.storyItem}>
                <span className={styles.storyDot} aria-hidden="true">2</span>
                <p><strong>Notice</strong>{props.view.clauses.observation}</p>
              </div>
              <div className={styles.storyItem}>
                <span className={styles.storyDot} aria-hidden="true">3</span>
                <p><strong>Teach</strong>{props.view.clauses.rule}</p>
              </div>
              <div className={styles.storyItem}>
                <span className={styles.storyDot} aria-hidden="true">4</span>
                <p><strong>Change</strong>{props.view.clauses.result}</p>
              </div>
            </div>
          </section>
          <section className={styles.conversationCard}>
            <p className={styles.eyebrow}>A question worth asking</p>
            <blockquote>{props.view.clauses.conversation}</blockquote>
          </section>
          <section className={styles.supportCard}>
            <p className={styles.eyebrow}>Traceable to local records</p>
            <h3>Why this is supported</h3>
            <ul className={styles.supportGrid}>
              {props.view.clauses.supporting.map((row) => (
                <li className={styles.supportItem} key={row.referenceId}>
                  <span>{row.label}</span>
                  <strong>{row.referenceId}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.disclosure}>
            <p>Stored on this tablet.</p>
            {disclosures.map((entry) => (
              <dl key={entry.capability}>
                <dt>What is simulated</dt>
                <dd>{entry.whatIsSimulated}</dd>
                <dt>What is real</dt>
                <dd>{entry.whatIsReal}</dd>
              </dl>
            ))}
          </section>
          {props.showingStored ? (
            <section className={styles.supportCard}>
              <p className={styles.eyebrow}>Local graph</p>
              <h3>Stored data for {toolName}</h3>
              <p>Versions: {props.view.stored.versionIds.join(', ') || 'none'}</p>
              <p>History: {props.view.stored.eventIds.length} events</p>
              <p>Observations: {props.view.stored.trialIds.join(', ') || 'none'}</p>
              <p>Grants: {props.view.stored.grantIds.length}</p>
              <p>Parent summaries: {props.view.stored.summaryIds.join(', ') || 'none'}</p>
            </section>
          ) : null}
          <section className={styles.dataRightsCard}>
            <p className={styles.eyebrow}>Private by design</p>
            <h3>Data rights</h3>
            <p className={styles.muted}>
              {props.view.sourceDeleted ? ORPHANED_EXPORT_COPY : EXPORT_COPY}
            </p>
            <div className={styles.actionsInline}>
              <ChoiceButton onClick={props.onToggleStored} disabled={props.pendingDelete !== null}>
                {props.showingStored ? 'Hide stored data' : 'View stored data'}
              </ChoiceButton>
              <ChoiceButton onClick={props.onExport} disabled={props.pendingDelete !== null}>
                Export this tool
              </ChoiceButton>
            </div>
            <div className={styles.dangerZone}>
              <h3>Delete from this tablet</h3>
              <p className={styles.muted}>Deletion removes the complete local graph, not just the card.</p>
              <div className={styles.actionsInline}>
                <ChoiceButton emphasis="danger" onClick={props.onAskDeleteTool} disabled={props.pendingDelete !== null}>
                  Delete this tool
                </ChoiceButton>
                <ChoiceButton emphasis="danger" onClick={props.onAskDeleteProfile} disabled={props.pendingDelete !== null}>
                  Delete {ownerName}’s local profile
                </ChoiceButton>
              </div>
            </div>
          </section>
          {props.deleteError !== null ? <p className={styles.refusal}>{props.deleteError}</p> : null}
          {props.confirmDelete === 'tool' ? (
            <section className={styles.confirmCard} role="alert">
              <p>
                Delete {toolName} from this tablet? This removes its rules, observations, history,
                versions, grants, and parent summaries. Another child’s independently made copy
                stays.
              </p>
              <ChoiceButton emphasis="danger" onClick={props.onConfirmDelete} disabled={props.pendingDelete !== null}>
                Confirm delete {toolName}
              </ChoiceButton>
              <ChoiceButton quiet onClick={props.onCancelDelete} disabled={props.pendingDelete !== null}>
                Keep this tool
              </ChoiceButton>
            </section>
          ) : null}
          {props.confirmDelete === 'profile' ? (
            <section className={styles.confirmCard} role="alert">
              <p>
                Delete {ownerName}’s local profile? This removes {ownerName} and every tool{' '}
                {ownerName} owns. Another child’s independently made copy stays, and will say it
                was inherited from a profile that was deleted.
              </p>
              <ChoiceButton emphasis="danger" onClick={props.onConfirmDelete} disabled={props.pendingDelete !== null}>
                Confirm delete {ownerName}’s local profile
              </ChoiceButton>
              <ChoiceButton quiet onClick={props.onCancelDelete} disabled={props.pendingDelete !== null}>
                Keep this profile
              </ChoiceButton>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
