const { api } = require('../helpers/api');
const { resetDb } = require('../helpers/db');
const { DAILY_RATE } = require('../../src/fees');
const {
  createBook,
  createMember,
  createLoan,
  getLoan,
  daysFromToday
} = require('../helpers/fixtures');

describe('GET /api/loans/:id/fee', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('API-06 returns fee 0 for an active loan that is not overdue', async () => {
    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    const res = await api.get(`/api/loans/${loan.id}/fee`);

    expect(res.status).toBe(200);
    expect(res.body.loanId).toBe(loan.id);
    expect(res.body.status).toBe('active');
    expect(res.body.dueDate).toBe(loan.dueDate);
    expect(res.body.fee).toBe(0);
  });

  it('API-07 returns the accrued fee for an active overdue loan', async () => {
    const daysOverdue = 4;

    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-(14 + daysOverdue)),
      dueDate: daysFromToday(-daysOverdue)
    });

    const res = await api.get(`/api/loans/${loan.id}/fee`);

    expect(res.status).toBe(200);
    expect(res.body.loanId).toBe(loan.id);
    expect(res.body.status).toBe('active');
    expect(res.body.fee).toBe(daysOverdue * DAILY_RATE);
  });

  it('API-08 returns the frozen stored fee for a returned loan', async () => {
    const daysOverdue = 6;

    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-(14 + daysOverdue)),
      dueDate: daysFromToday(-daysOverdue)
    });

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');
    expect(returnRes.body.fee).toBe(daysOverdue * DAILY_RATE);

    const feeRes = await api.get(`/api/loans/${loan.id}/fee`);

    expect(feeRes.status).toBe(200);
    expect(feeRes.body.loanId).toBe(loan.id);
    expect(feeRes.body.status).toBe('returned');
    expect(feeRes.body.fee).toBe(daysOverdue * DAILY_RATE);

    const storedLoan = getLoan(loan.id);
    expect(storedLoan.status).toBe('returned');
    expect(storedLoan.fee).toBe(daysOverdue * DAILY_RATE);
  });

  it('API-09 returns 404 for fee lookup on a non-existent loan', async () => {
    const res = await api.get('/api/loans/999999/fee');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Loan not found');
  });
});
