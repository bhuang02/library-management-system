const { api } = require('../helpers/api');
const { resetDb } = require('../helpers/db');
const { DAILY_RATE } = require('../../src/fees');
const {
  createBook,
  createMember,
  createLoan,
  daysFromToday
} = require('../helpers/fixtures');

describe('Borrow → return integration flows', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('INT-01 completes a full borrow → return on-time flow', async () => {
    const book = createBook({
      totalCopies: 1,
      availableCopies: 1
    });

    const member = createMember();

    const borrowRes = await api
      .post('/api/loans')
      .send({
        bookId: book.id,
        memberId: member.id
      });

    expect(borrowRes.status).toBe(201);
    expect(borrowRes.body.bookId).toBe(book.id);
    expect(borrowRes.body.memberId).toBe(member.id);
    expect(borrowRes.body.status).toBe('active');
    expect(borrowRes.body.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const bookAfterBorrowRes = await api.get(`/api/books/${book.id}`);

    expect(bookAfterBorrowRes.status).toBe(200);
    expect(bookAfterBorrowRes.body.availableCopies).toBe(0);

    const returnRes = await api.post(`/api/loans/${borrowRes.body.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.id).toBe(borrowRes.body.id);
    expect(returnRes.body.status).toBe('returned');
    expect(returnRes.body.fee).toBe(0);

    const bookAfterReturnRes = await api.get(`/api/books/${book.id}`);

    expect(bookAfterReturnRes.status).toBe(200);
    expect(bookAfterReturnRes.body.availableCopies).toBe(1);
  });

  it('INT-08 removes a returned overdue loan from the overdue report', async () => {
    const daysOverdue = 6;
    const expectedFee = daysOverdue * DAILY_RATE;

    const book = createBook({
      totalCopies: 1,
      availableCopies: 0
    });

    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-(14 + daysOverdue)),
      dueDate: daysFromToday(-daysOverdue),
      status: 'active',
      fee: 0
    });

    const overdueBeforeRes = await api.get('/api/reports/loans/overdue');

    expect(overdueBeforeRes.status).toBe(200);

    const loanInReportBeforeReturn = overdueBeforeRes.body.find(
      (l) => l.id === loan.id
    );

    expect(loanInReportBeforeReturn).toBeDefined();
    expect(loanInReportBeforeReturn.status).toBe('active');
    expect(loanInReportBeforeReturn.accruedFee).toBe(expectedFee);

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');
    expect(returnRes.body.fee).toBe(expectedFee);

    const overdueAfterRes = await api.get('/api/reports/loans/overdue');

    expect(overdueAfterRes.status).toBe(200);
    expect(overdueAfterRes.body.some((l) => l.id === loan.id)).toBe(false);
  });
});
