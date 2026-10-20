'use client';

import { useState } from 'react';
import type { DrawPoint } from '../../core/draw';

/** Child-chosen endpoints, not AI-discovered geometry. Also works with a keyboard. */
export function KeyboardPath({ onChoose, disabled = false }: { onChoose: (points: readonly DrawPoint[]) => void; disabled?: boolean }) {
  const [startX, setStartX] = useState(160), [startY, setStartY] = useState(220);
  const [endX, setEndX] = useState(620), [endY, setEndY] = useState(390);
  return <details>
    <summary>Choose a straight path with a keyboard</summary>
    <p>Choose both ends. The dot is the start; the arrow is the end.</p>
    {([
      ['Start across', startX, setStartX, 720], ['Start down', startY, setStartY, 480],
      ['End across', endX, setEndX, 720], ['End down', endY, setEndY, 480],
    ] as const).map(([label, value, setValue, max]) => <label key={label}>{label} · {value}<input aria-label={label} type="range" min="80" max={max} step="10" value={value} disabled={disabled} onChange={(event) => setValue(Number(event.target.value))} /></label>)}
    <button type="button" disabled={disabled || Math.hypot(endX - startX, endY - startY) < 20} onClick={() => onChoose([{ x: startX, y: startY }, { x: endX, y: endY }])}>Use this path</button>
  </details>;
}
