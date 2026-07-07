import Delta from 'quill-delta';

export interface QuillDelta {
  ops: any[];
}

/**
 * Transforms clientOp against serverOp.
 * Returns clientOp adjusted for the fact that serverOp has already been applied.
 * 
 * @param serverOp - The operation already applied on the server.
 * @param clientOp - The stale operation from the client.
 * @param priority - If true, the clientOp loses priority (inserts after serverOp).
 *                   If false, the clientOp gets priority (inserts before serverOp).
 */
export function transform(serverOp: QuillDelta, clientOp: QuillDelta, priority: boolean): QuillDelta {
  const serverDelta = new Delta(serverOp.ops);
  const clientDelta = new Delta(clientOp.ops);
  const transformed = serverDelta.transform(clientDelta, priority);
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
