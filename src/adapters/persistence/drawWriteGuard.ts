import type { DrawDocument } from '../../core/draw/schema';
import { canonicalJson } from '../../core/serialization/canonicalJson';
import { PersistenceError } from './database';

export const drawOwnerGenerationKey = (owner: string) => `draw-owner-generation:${owner}`;
export function parseDrawGenerationRecord(raw: unknown): number {
  if (raw === undefined) return 0;
  if (raw === null || typeof raw !== 'object' || !('value' in raw)) throw new PersistenceError('Drawing reset state is damaged. No work was changed.');
  return parseDrawGeneration(raw.value);
}
export function parseDrawGeneration(raw: unknown): number {
  if (raw === undefined) return 0;
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) throw new PersistenceError('Drawing reset state is damaged. No work was changed.');
  return raw;
}
export type DrawWriteExpectation = Readonly<{ revision: number | null; ownerGeneration: number }>;
export function assertDrawWrite(next: DrawDocument, prior: DrawDocument | null, generation: number, expected?: DrawWriteExpectation): void {
  if (expected !== undefined && (expected.ownerGeneration !== generation || expected.revision !== (prior?.revision ?? null))) throw new PersistenceError('This drawing changed or was removed in another tab. Your unsaved work is still here; download it before reloading.');
  if (prior !== null && (prior.ownerChildId !== next.ownerChildId || prior.createdAt !== next.createdAt || next.revision < prior.revision || (next.revision === prior.revision && canonicalJson(next) !== canonicalJson(prior)))) throw new PersistenceError('A newer drawing is already saved. Your other tab was not overwritten.');
}
