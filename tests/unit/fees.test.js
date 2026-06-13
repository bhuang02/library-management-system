const {
  calculateFee,
  dueDate,
  DAILY_RATE,
  MAX_FEE
} = require('../../src/fees');

describe('fees.js unit tests', () => {
  describe('dueDate()', () => {
    it('UNIT-01 sets the due date to the borrow date plus 14 days', () => {
      const result = dueDate('2026-01-01');

      expect(result).toBe('2026-01-15');
    });

    it('UNIT-02 correctly handles month boundaries when adding 14 days', () => {
      const result = dueDate('2026-01-25');

      expect(result).toBe('2026-02-08');
    });
  });

  describe('calculateFee()', () => {
    it('UNIT-03 returns 0 when the book is returned before the due date', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-01-14'
      );

      expect(fee).toBe(0);
    });

    it('UNIT-04 returns 0 when the book is returned exactly on the due date', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-01-15'
      );

      expect(fee).toBe(0);
    });

    it('UNIT-05 charges the daily rate for one day overdue', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-01-16'
      );

      expect(fee).toBe(DAILY_RATE);
    });

    it('UNIT-06 charges one daily rate below the maximum fee for 39 days overdue', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-02-23'
      );

      expect(fee).toBe(MAX_FEE - DAILY_RATE);
    });

    it('UNIT-07 caps the fee at the maximum fee for 40 days overdue', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-02-24'
      );

      expect(fee).toBe(MAX_FEE);
    });

    it('UNIT-08 keeps the fee capped beyond 40 days overdue', () => {
      const fee = calculateFee(
        '2026-01-01',
        '2026-01-15',
        '2026-03-10'
      );

      expect(fee).toBe(MAX_FEE);
    });
  });
});
