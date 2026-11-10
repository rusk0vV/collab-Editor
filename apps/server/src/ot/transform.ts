import Delta from 'quill-delta';

export interface QuillDelta {
  ops: any[];
}

/**
 * Transform incoming against already-applied op.
 * Returns a new version of incoming adjusted for the fact that applied
 * has already been applied to the document.
 * 
 * In quill-delta, a.transform(b, priority) transforms b against a.
 * Therefore: new Delta(applied.ops).transform(new Delta(incoming.ops), priority)
 * 
 * Priority=true means the applied op keeps its position and incoming shifts right.
 * When priority is omitted, a deterministic tie-breaker (JSON comparison) is used
 * to guarantee mathematical convergence:
 *   apply(apply(doc, opA), transform(opB, opA)) === apply(apply(doc, opB), transform(opA, opB))
 */
export function transform(incoming: QuillDelta, applied: QuillDelta, priority?: boolean): QuillDelta {
  const p = priority !== undefined
    ? priority
    : JSON.stringify(applied.ops) <= JSON.stringify(incoming.ops);
  const appliedDelta = new Delta(applied.ops);
  const incomingDelta = new Delta(incoming.ops);
  const transformed = appliedDelta.transform(incomingDelta, p);
  return { ops: transformed.ops };
}

/**
 * Applies an operation to a document state to produce a new document state.
 * 
 * @param doc - The current document state.
 * @param op - The operation to apply.
 */
export function apply(doc: QuillDelta, op: QuillDelta): QuillDelta {
  const docDelta = new Delta(doc.ops);
  const opDelta = new Delta(op.ops);
  const result = docDelta.compose(opDelta);
  return { ops: result.ops };
}

/**
 * Transform op forward from baseRevision to targetRevision.
 * Used when a client sends an op based on a stale revision.
 * 
 * @param op - The stale incoming client operation.
 * @param baseRevision - Revision the client's op was based on.
 * @param targetRevision - Current server revision.
 * @param fetchOps - Function to fetch historical ops from op_log.
 */
export async function transformForward(
  op: QuillDelta,
  baseRevision: number,
  targetRevision: number,
  fetchOps: (from: number, to: number) => Promise<QuillDelta[]>
): Promise<QuillDelta> {
  if (baseRevision === targetRevision) return op;

  // Fetch the ops that happened between client's revision and current revision
  const missedOps = await fetchOps(baseRevision, targetRevision);

  // Transform our incoming op against each missed op in sequence
  let result = op;
  for (const missedOp of missedOps) {
    result = transform(result, missedOp, true);
  }

  return result;
}
