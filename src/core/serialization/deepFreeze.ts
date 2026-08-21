/**
 * Freezes a value and everything reachable from it, then returns the same reference.
 *
 * Applied to every tool version the domain hands out. Section 12's "another child alters
 * Maya's original tool" threat is then a runtime TypeError at the moment of the write rather
 * than a corrupted version discovered later.
 *
 * The return type is intentionally unchanged: callers keep the domain type, and an attempted
 * write is caught by the frozen object at runtime rather than being made unexpressible.
 */
export function deepFreeze<T>(value: T): T {
  freeze(value, new WeakSet<object>());
  return value;
}

function freeze(value: unknown, visited: WeakSet<object>): void {
  if (value === null || typeof value !== 'object') {
    return;
  }

  // A shallow-frozen object can still hold mutable members, so recursion continues past
  // Object.isFrozen. The visited set, not the frozen flag, is what terminates on cycles.
  if (visited.has(value)) {
    return;
  }
  visited.add(value);

  Object.freeze(value);

  for (const member of Object.values(value)) {
    freeze(member, visited);
  }
}
