import { ToolDefinition } from '../schema/toolDefinition';

/**
 * Product-facing title for a fork whose source profile has been deleted.
 * The stored copied title can embed the source child's name; this label does not.
 */
export const ORPHANED_FORK_DISPLAY_NAME = 'A copied tool';

/** Teacher label for inherited decisions when the source profile is gone. */
export const DELETED_PROFILE_TEACHER = 'A deleted profile';

export function visibleToolTitle(displayName: string, sourceDeleted: boolean): string {
  return sourceDeleted ? ORPHANED_FORK_DISPLAY_NAME : displayName;
}

export function resolveForkAttribution(input: {
  readonly displayName: string;
  readonly ownerDisplayName: string;
  readonly isFork: boolean;
  readonly sourceAuthorDisplayName: string | null;
}): {
  readonly sourceDeleted: boolean;
  readonly teacherDisplayName: string;
  readonly visibleTitle: string;
} {
  const sourceDeleted = input.isFork && input.sourceAuthorDisplayName === null;
  return {
    sourceDeleted,
    teacherDisplayName: sourceDeleted
      ? DELETED_PROFILE_TEACHER
      : (input.sourceAuthorDisplayName ?? input.ownerDisplayName),
    visibleTitle: visibleToolTitle(input.displayName, sourceDeleted),
  };
}

export function redactOrphanedForkDefinition(definition: ToolDefinition): ToolDefinition {
  return ToolDefinition.parse({
    ...definition,
    displayName: ORPHANED_FORK_DISPLAY_NAME,
  });
}
