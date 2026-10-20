import type { CapabilityDefinition } from '../../core/capability/types';

/** Respect an explicit choice; otherwise open the just-saved or newest verified tool. */
export function chooseSavedDrawTool(tools: readonly CapabilityDefinition[], current: string | null, preferred: string | null): string | null {
  if (current !== null && tools.some(tool => tool.toolId === current)) return current;
  if (preferred !== null && tools.some(tool => tool.toolId === preferred)) return preferred;
  return [...tools].sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.toolId.localeCompare(b.toolId)).at(-1)?.toolId ?? null;
}
