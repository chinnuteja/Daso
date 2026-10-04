import { withDrawSourceDigest, type DrawDocument } from '../../core/draw';
import type { DrawAssetRepository } from '../../core/ports/repositories';

/** One ordered local writer. CAS and owner generations are checked inside persistence. */
export class DrawWriteQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private revisions = new Map<string, number>();
  private generations = new Map<string, number>();
  private failure: unknown = null;
  constructor(private readonly repository: DrawAssetRepository) {}
  async track(document: DrawDocument | null, owner: string): Promise<void> {
    this.generations.set(owner, await this.repository.getOwnerGeneration(owner));
    if (document !== null) this.revisions.set(document.documentId, document.revision);
  }
  write(document: DrawDocument): Promise<DrawDocument> {
    const generation = this.generations.get(document.ownerChildId);
    const operation = this.tail.then(async () => {
      if (generation === undefined) throw new Error('Open the drawing before editing it.');
      const next = await withDrawSourceDigest(document);
      await this.repository.saveDocument(next, { revision: this.revisions.get(document.documentId) ?? null, ownerGeneration: generation });
      this.revisions.set(document.documentId, next.revision); this.failure = null;
      return next;
    });
    this.tail = operation.catch((error: unknown) => { this.failure = error; });
    return operation;
  }
  async flush(): Promise<void> { await this.tail; if (this.failure !== null) throw this.failure; }
}
