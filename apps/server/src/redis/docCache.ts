import { redis } from './client';
import type { QuillDelta } from '../ot/transform';

const DOC_TTL = 3600; // 1 hour in seconds

// Metrics counters (for Prometheus in Phase 4 — just log for now)
let cacheHits = 0;
let cacheMisses = 0;

export function getCacheMetrics() {
  return { cacheHits, cacheMisses, hitRate: cacheHits / (cacheHits + cacheMisses) || 0 };
}

export async function getDocState(docId: string): Promise<{ content: QuillDelta; revision: number } | null> {
  const [stateRaw, revisionRaw] = await redis.mget(
    `doc:${docId}:state`,
    `doc:${docId}:revision`
  );

  if (!stateRaw || !revisionRaw) {
    cacheMisses++;
    return null;
  }

  cacheHits++;
  return {
    content: JSON.parse(stateRaw) as QuillDelta,
    revision: parseInt(revisionRaw, 10),
  };
}

export async function setDocState(docId: string, content: QuillDelta, revision: number): Promise<void> {
  // Use pipeline for atomic multi-key write
  const pipeline = redis.pipeline();
  pipeline.set(`doc:${docId}:state`, JSON.stringify(content), 'EX', DOC_TTL);
  pipeline.set(`doc:${docId}:revision`, revision.toString(), 'EX', DOC_TTL);
  await pipeline.exec();
}

export async function invalidateDocCache(docId: string): Promise<void> {
  await redis.del(`doc:${docId}:state`, `doc:${docId}:revision`);
}

