import Link from 'next/link';

import type { ToolDefinition } from '../../core/schema/toolDefinition';
import { ChoiceButton } from '../components/ChoiceButton';

import styles from './screens.module.css';

export function HomeScreen(props: {
  readonly tools: readonly ToolDefinition[];
  readonly onStartTeaching: () => void;
}) {
  return (
    <div className={styles.stack}>
      <p className={styles.prompt}>Your tools live on this tablet. Nothing here is a race or a streak.</p>
      <div className={styles.tiles}>
        {props.tools.map((tool) => (
          <Link key={tool.toolId} className={styles.tile} href={`/run?tool=${tool.toolId}`}>
            <strong>{tool.displayName}</strong>
            <span>Open in Runner Mode</span>
          </Link>
        ))}
        <div className={styles.tile}>
          <strong>Teach a new tool</strong>
          <ChoiceButton onClick={props.onStartTeaching}>Start with a question</ChoiceButton>
        </div>
      </div>
    </div>
  );
}
