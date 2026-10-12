/** Pictures explain a bounded choice. These are UI diagrams, never the child's artwork. */
export function PatternChoice({ kind }: { kind: 'close' | 'even' | 'wide' | 'same' | 'smaller' }) {
  const positions = kind === 'close' ? [33, 51, 69, 87] : kind === 'wide' ? [12, 44, 76, 108] : [21, 47, 73, 99];
  return <svg viewBox="0 0 120 42" aria-hidden="true" focusable="false">
    {positions.map((x, i) => <path key={x} d="M 0 -10 L 9 0 L 0 10 L -9 0 Z" transform={`translate(${x} 21) scale(${kind === 'smaller' ? 1 - i * .21 : 1})`} fill="currentColor" />)}
  </svg>;
}
