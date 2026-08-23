import { authorshipSummaryCounts } from '../../../core/inspection';
import type { Repositories } from '../../../core/ports/repositories';
import { visibleToolTitle } from '../../../core/reuse';
import type { ChildId } from '../../../core/schema/primitives';

export interface SavedToolTileView {
  readonly toolId: string;
  readonly displayName: string;
  readonly creatorName: string;
  readonly ownerChildId: string;
  readonly observationCount: number;
  readonly approvedCorrectionCount: number;
  readonly sourceDeleted: boolean;
}

export async function loadSavedTiles(
  repositories: Repositories,
  ownerChildIds: readonly ChildId[],
): Promise<readonly SavedToolTileView[]> {
  const tiles: SavedToolTileView[] = [];
  for (const ownerChildId of ownerChildIds) {
    const tools = await repositories.tools.listByOwner(ownerChildId);
    for (const tool of tools) {
      const owner = await repositories.profiles.get(tool.ownerChildId);
      const sourceAuthor =
        tool.forkedFrom === undefined
          ? null
          : await repositories.profiles.get(tool.forkedFrom.ownerChildId);
      const trials = await repositories.trials.listByTool(tool.toolId);
      const entries = await repositories.ledger.listByTool(tool.toolId);
      const counts = authorshipSummaryCounts(entries, trials);
      const sourceDeleted = tool.forkedFrom !== undefined && sourceAuthor === null;
      tiles.push({
        toolId: tool.toolId,
        displayName: visibleToolTitle(tool.displayName, sourceDeleted),
        creatorName: owner?.displayName ?? tool.ownerChildId,
        ownerChildId: tool.ownerChildId,
        observationCount: counts.observedExamples,
        approvedCorrectionCount: counts.childCorrections,
        sourceDeleted,
      });
    }
  }
  return tiles;
}
