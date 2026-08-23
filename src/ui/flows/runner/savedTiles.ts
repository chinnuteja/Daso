import { authorshipSummaryCounts } from '../../../core/inspection';
import type { Repositories } from '../../../core/ports/repositories';
import type { ChildId } from '../../../core/schema/primitives';

export interface SavedToolTileView {
  readonly toolId: string;
  readonly displayName: string;
  readonly creatorName: string;
  readonly ownerChildId: string;
  readonly observationCount: number;
  readonly approvedCorrectionCount: number;
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
      const trials = await repositories.trials.listByTool(tool.toolId);
      const entries = await repositories.ledger.listByTool(tool.toolId);
      const counts = authorshipSummaryCounts(entries, trials);
      tiles.push({
        toolId: tool.toolId,
        displayName: tool.displayName,
        creatorName: owner?.displayName ?? tool.ownerChildId,
        ownerChildId: tool.ownerChildId,
        observationCount: counts.observedExamples,
        approvedCorrectionCount: counts.childCorrections,
      });
    }
  }
  return tiles;
}
