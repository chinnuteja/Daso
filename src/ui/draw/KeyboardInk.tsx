'use client';
import { useState, type KeyboardEvent } from 'react';
import type { DrawPoint } from '../../core/draw';

/** Every point is placed by the child. No generated shape or model interpretation. */
export function KeyboardInk({ onDraw, disabled }: { onDraw: (points: readonly DrawPoint[]) => void; disabled: boolean }) {
  const [cursor, setCursor] = useState<DrawPoint>({ x: 320, y: 220 });
  const [points, setPoints] = useState<readonly DrawPoint[] | null>(null);
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === 'Escape') { event.preventDefault(); setPoints(null); return; }
    if (event.key === 'Enter') { event.preventDefault(); if (points === null) setPoints([cursor]); else { onDraw(points); setPoints(null); } return; }
    const delta: Record<string, readonly [number, number]> = { ArrowUp: [0, -8], ArrowDown: [0, 8], ArrowLeft: [-8, 0], ArrowRight: [8, 0] };
    const move = delta[event.key]; if (move === undefined) return;
    event.preventDefault(); const next = { x: Math.max(0, Math.min(800, cursor.x + move[0] * (event.shiftKey ? 4 : 1))), y: Math.max(0, Math.min(560, cursor.y + move[1] * (event.shiftKey ? 4 : 1))) };
    setCursor(next); if (points !== null && points.length < 2048) setPoints([...points, next]);
  }
  return <details><summary>Draw using a keyboard</summary><p id="keyboard-ink-help">Focus the drawing pad. Arrow keys move your pen; Enter starts or finishes a line. Shift moves farther. Escape cancels the unfinished line.</p><div role="group" aria-label="Keyboard drawing pad" aria-describedby="keyboard-ink-help" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onKeyDown={key} style={{ outlineOffset: 4 }}><svg viewBox="0 0 800 560" role="img" aria-label="Your keyboard line in progress" style={{ width: '100%', height: 120, background: '#fffdf7', border: '1px solid #8b9991' }}>{points !== null ? <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#172620" strokeWidth={7} /> : null}<circle cx={cursor.x} cy={cursor.y} r={12} fill="#0d6a54" /></svg><p role="status">{points === null ? 'Pen up' : 'Drawing'} · across {cursor.x}, down {cursor.y}</p></div></details>;
}
