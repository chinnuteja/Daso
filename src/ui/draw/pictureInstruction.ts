import type { DrawPatternProposal } from '../../core/capability';

/** A chosen template, not a fabricated transcript or model-generated claim. */
export function pictureInstruction(proposal: DrawPatternProposal): string {
  return `Chosen with picture buttons: Repeat this mark along this path with ${proposal.spacing} spacing, ${proposal.sizeProfile === 'constant' ? 'all the same size' : 'smaller toward the end'}.`;
}
