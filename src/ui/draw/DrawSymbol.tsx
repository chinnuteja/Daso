/** Decorative vector icons pair with visible button words. No emoji-only actions. */
export function DrawSymbol({ kind }: { kind: 'pencil' | 'diamond' | 'check' | 'plus' }) {
  const paths = { pencil: 'M4 17 L3 21 L7 20 L20 7 L16 3 Z M13 6 L17 10', diamond:'M12 3 L21 12 L12 21 L3 12 Z', check:'M4 12 L9 17 L20 6', plus:'M12 4 V20 M4 12 H20' };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22"><path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
