import { apply, transform, QuillDelta } from '../transform';

describe('Operational Transformation Engine', () => {
  describe('apply()', () => {
    it('should apply an insert operation to an empty document', () => {
      const initialDoc: QuillDelta = { ops: [] };
      const op: QuillDelta = { ops: [{ insert: 'Hello' }] };
      const result = apply(initialDoc, op);
      expect(result.ops).toEqual([{ insert: 'Hello' }]);
    });

    it('should compose multiple operations correctly', () => {
      const initialDoc: QuillDelta = { ops: [{ insert: 'Hello\n' }] };
      const op: QuillDelta = { ops: [{ retain: 5 }, { insert: ' World' }] };
      const result = apply(initialDoc, op);
      expect(result.ops).toEqual([{ insert: 'Hello World\n' }]);
    });
  });

  describe('transform()', () => {
    it('should handle concurrent inserts at the same index with priority=true (client loses priority)', () => {
      // User A (serverOp) inserts 'A' at index 0.
      // User B (clientOp) inserts 'B' at index 0.
      const serverOp: QuillDelta = { ops: [{ insert: 'A' }] };
      const clientOp: QuillDelta = { ops: [{ insert: 'B' }] };

      // clientOp loses priority (gets placed after serverOp)
      const transformed = transform(serverOp, clientOp, true);
      expect(transformed.ops).toEqual([{ retain: 1 }, { insert: 'B' }]);
    });

    it('should handle concurrent inserts at the same index with priority=false (client gets priority)', () => {
      // User A (serverOp) inserts 'A' at index 0.
      // User B (clientOp) inserts 'B' at index 0.
      const serverOp: QuillDelta = { ops: [{ insert: 'A' }] };
      const clientOp: QuillDelta = { ops: [{ insert: 'B' }] };

      // clientOp gets priority (gets placed before serverOp)
      const transformed = transform(serverOp, clientOp, false);
      expect(transformed.ops).toEqual([{ insert: 'B' }]);
    });

    it('should handle concurrent insert vs delete', () => {
      // Document is Initially 'Hello'
      // User A (serverOp) deletes 5 characters starting at index 0 (deletes 'Hello')
      // User B (clientOp) retains 5, inserts ' World' (concurrently inserts ' World' after 'Hello')
      const serverOp: QuillDelta = { ops: [{ delete: 5 }] };
      const clientOp: QuillDelta = { ops: [{ retain: 5 }, { insert: ' World' }] };

      // Since serverOp deleted 5 characters, clientOp's retain 5 is reduced/removed.
      // The result should just insert ' World' at position 0.
      const transformed = transform(serverOp, clientOp, false);
      expect(transformed.ops).toEqual([{ insert: ' World' }]);
    });

    it('should handle sequential transformation of a stale client op against multiple historical server ops', () => {
      // Initially empty document.
      // Client is at rev 0, clientOp wants to insert 'B' at index 0.
      // Server has already applied:
      //   - rev 0: User A inserts 'A' at index 0. (new state: 'A')
      //   - rev 1: User C retains 1 ('A') and inserts 'C' at index 1. (new state: 'AC')
      
      const serverOp1: QuillDelta = { ops: [{ insert: 'A' }] };
      const serverOp2: QuillDelta = { ops: [{ retain: 1 }, { insert: 'C' }] };
      const clientOp: QuillDelta = { ops: [{ insert: 'B' }] };

      // User B (clientOp) userId is greater than User A, so priority = true (loses priority) against User A
      let transformed = transform(serverOp1, clientOp, true);
      expect(transformed.ops).toEqual([{ retain: 1 }, { insert: 'B' }]); // transformed to insert after A

      // User B (transformed clientOp) userId is smaller than User C, so priority = false (gets priority) against User C
      transformed = transform(serverOp2, transformed, false);
      expect(transformed.ops).toEqual([{ retain: 1 }, { insert: 'B' }]); // retains A, inserts B before C
    });
  });
});
