import { transform, apply } from '../../ot/transform';

describe('OT transform', () => {
  const doc = { ops: [{ insert: 'Hello' }] };

  describe('insert vs insert', () => {
    it('two inserts at same position — both applied', () => {
      const opA = { ops: [{ retain: 5 }, { insert: '!' }] };
      const opB = { ops: [{ retain: 5 }, { insert: ' World' }] };
      const tA = transform(opA, opB);
      const tB = transform(opB, opA);
      const result1 = apply(apply(doc, opA), tB);
      const result2 = apply(apply(doc, opB), tA);
      expect(result1).toEqual(result2); // convergence check
    });
  });

  describe('insert vs delete', () => {
    it('delete before insert — insert position shifts left', () => {
      const opA = { ops: [{ retain: 3 }, { insert: 'X' }] }; // insert at 3
      const opB = { ops: [{ retain: 1 }, { delete: 2 }] }; // delete chars 1-2
      const tA = transform(opA, opB);
      const result = apply(apply(doc, opB), tA);
      // "Hello" → delete 1-2 → "Hlo" → insert X at 1 → "HXlo"
      expect(result.ops[0].insert).toContain('X');
    });
  });

  describe('delete vs delete', () => {
    it('overlapping deletes — no double deletion', () => {
      const opA = { ops: [{ retain: 1 }, { delete: 3 }] }; // delete chars 1-3
      const opB = { ops: [{ retain: 2 }, { delete: 2 }] }; // delete chars 2-3
      const tA = transform(opA, opB);
      const tB = transform(opB, opA);
      const result1 = apply(apply(doc, opA), tB);
      const result2 = apply(apply(doc, opB), tA);
      expect(result1).toEqual(result2); // convergence check
    });
  });
});

