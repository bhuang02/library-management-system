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

describe('POST /api/loans/:id/return', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('API-01 returns a valid active loan and marks it as returned', async () => {
    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    expect(loan.status).toBe('active');

    const res = await api.post(`/api/loans/${loan.id}/return`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(loan.id);
    expect(res.body.status).toBe('returned');
    expect(res.body.returnDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const storedLoan = getLoan(loan.id);
    expect(storedLoan.status).toBe('returned');
    expect(storedLoan.returnDate).toBe(res.body.returnDate);
  });

  it('API-02 returns fee 0 when an active loan is returned before the due date', async () => {
    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    const res = await api.post(`/api/loans/${loan.id}/return`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('returned');
    expect(res.body.fee).toBe(0);

    const storedLoan = getLoan(loan.id);
    expect(storedLoan.fee).toBe(0);
  });

  it('API-03 calculates the late fee when an overdue active loan is returned', async () => {
    const daysOverdue = 3;

    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-(14 + daysOverdue)),
      dueDate: daysFromToday(-daysOverdue)
    });

    const res = await api.post(`/api/loans/${loan.id}/return`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('returned');
    expect(res.body.fee).toBe(daysOverdue * DAILY_RATE);

    const storedLoan = getLoan(loan.id);
    expect(storedLoan.fee).toBe(daysOverdue * DAILY_RATE);
  });

  it('API-04 returns 409 when trying to return the same loan twice', async () => {
    const book = createBook({ availableCopies: 0 });
    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    const firstReturn = await api.post(`/api/loans/${loan.id}/return`);
    expect(firstReturn.status).toBe(200);

    const secondReturn = await api.post(`/api/loans/${loan.id}/return`);

    expect(secondReturn.status).toBe(409);
    expect(secondReturn.body.error).toBe('Loan already returned');
  });

  it('API-05 returns 404 when trying to return a non-existent loan', async () => {
    const res = await api.post('/api/loans/999999/return');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Loan not found');
  });
});
