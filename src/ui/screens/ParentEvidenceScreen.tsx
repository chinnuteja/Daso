import { disclosuresForSurface } from '../copy/disclosures';
import { EXPORT_COPY } from '../copy/parent';
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
  const toolName = props.view?.tool.displayName ?? 'this tool';

  return (
    <div className={styles.stack}>
      {props.status === 'loading' ? <p className={styles.muted}>Opening the parent view…</p> : null}
      {props.status === 'empty' ? <p className={styles.muted}>{props.message}</p> : null}
      {props.status === 'integrity_error' ? <p className={styles.refusal}>{props.message}</p> : null}
      {props.status === 'ready' && props.view !== null ? (
        <>
          <p className={styles.prompt}>{props.view.clauses.heading}</p>
          <section className={styles.tile}>
            <p>{props.view.clauses.question}</p>
            <p>{props.view.clauses.observation}</p>
            <p>{props.view.clauses.rule}</p>
            <p>{props.view.clauses.result}</p>
          </section>
          <section className={styles.tile}>
            <p>
              <strong>Suggested conversation</strong>
            </p>
            <p>{props.view.clauses.conversation}</p>
          </section>
          <section className={styles.tile}>
            <p>
              <strong>Why this is supported</strong>
            </p>
            <ul className={styles.list}>
              {props.view.clauses.supporting.map((row) => (
                <li key={row.referenceId}>
                  {row.label}: {row.referenceId}
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
            <section className={styles.tile}>
              <p>
                <strong>Stored data for {toolName}</strong>
              </p>
              <p>Versions: {props.view.stored.versionIds.join(', ') || 'none'}</p>
              <p>History: {props.view.stored.eventIds.length} events</p>
              <p>Observations: {props.view.stored.trialIds.join(', ') || 'none'}</p>
              <p>Grants: {props.view.stored.grantIds.length}</p>
              <p>Parent summaries: {props.view.stored.summaryIds.join(', ') || 'none'}</p>
            </section>
          ) : null}
          <p className={styles.muted}>{EXPORT_COPY}</p>
          {props.deleteError !== null ? <p className={styles.refusal}>{props.deleteError}</p> : null}
          {props.confirmDelete === 'tool' ? (
            <section className={styles.tile}>
              <p>
                Delete {toolName} from this tablet? This removes its rules, observations, history,
                versions, grants, and parent summaries. Another child’s independently made copy
                stays.
              </p>
              <ChoiceButton onClick={props.onConfirmDelete} disabled={props.pendingDelete !== null}>
                Confirm delete {toolName}
              </ChoiceButton>
              <ChoiceButton onClick={props.onCancelDelete} disabled={props.pendingDelete !== null}>
                Keep this tool
              </ChoiceButton>
            </section>
          ) : null}
          {props.confirmDelete === 'profile' ? (
            <section className={styles.tile}>
              <p>
                Delete {ownerName}’s local profile? This removes {ownerName} and every tool{' '}
                {ownerName} owns. Another child’s independently made copy stays, and will say it
                was inherited from a profile that was deleted.
              </p>
              <ChoiceButton onClick={props.onConfirmDelete} disabled={props.pendingDelete !== null}>
                Confirm delete {ownerName}’s local profile
              </ChoiceButton>
              <ChoiceButton onClick={props.onCancelDelete} disabled={props.pendingDelete !== null}>
                Keep this profile
              </ChoiceButton>
            </section>
          ) : null}
          <div className={styles.actions}>
            <ChoiceButton onClick={props.onToggleStored} disabled={props.pendingDelete !== null}>
              {props.showingStored ? 'Hide stored data' : 'View stored data'}
            </ChoiceButton>
            <ChoiceButton onClick={props.onExport} disabled={props.pendingDelete !== null}>
              Export this tool
            </ChoiceButton>
            <ChoiceButton onClick={props.onAskDeleteTool} disabled={props.pendingDelete !== null}>
              Delete this tool
            </ChoiceButton>
            <ChoiceButton onClick={props.onAskDeleteProfile} disabled={props.pendingDelete !== null}>
              Delete {ownerName}’s local profile
            </ChoiceButton>
          </div>
        </>
      ) : null}
    </div>
  );
}
