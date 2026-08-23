import { ToolId } from '../schema/primitives';

/**
 * Deterministic slug for a second-child fork. Given source `mayas-flight-lab`, chooses
 * `mayas-flight-lab-copy`, then `-copy-2`, `-copy-3`. No clock, random, or new IdKind.
 */
export function allocateTargetToolId(
  sourceToolId: string,
  existingToolIds: readonly string[],
): string {
  const taken = new Set(existingToolIds);
  const first = `${sourceToolId}-copy`;
  if (!taken.has(first)) {
    return ToolId.parse(first);
  }
  let index = 2;
  while (taken.has(`${sourceToolId}-copy-${String(index)}`)) {
    index += 1;
  }
  return ToolId.parse(`${sourceToolId}-copy-${String(index)}`);
}
