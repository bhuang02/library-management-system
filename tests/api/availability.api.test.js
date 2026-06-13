const { api } = require('../helpers/api');
const { resetDb } = require('../helpers/db');
const {
  createBook,
  createMember,
  createLoan,
  createReservation,
  getReservation,
  daysFromToday
} = require('../helpers/fixtures');

describe('Book availability after returning loans', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('API-10 increases availableCopies after return when no pending reservation exists', async () => {
    const book = createBook({
      totalCopies: 1,
      availableCopies: 0
    });

    const member = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: member.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    const beforeBookRes = await api.get(`/api/books/${book.id}`);

    expect(beforeBookRes.status).toBe(200);
    expect(beforeBookRes.body.availableCopies).toBe(0);

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const afterBookRes = await api.get(`/api/books/${book.id}`);

    expect(afterBookRes.status).toBe(200);
    expect(afterBookRes.body.availableCopies).toBe(1);
  });

  it('API-11 does not increase availableCopies when a pending reservation exists', async () => {
    const book = createBook({
      totalCopies: 1,
      availableCopies: 0
    });

    const borrower = createMember();
    const reserver = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: borrower.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9)
    });

    const reservation = createReservation({
      bookId: book.id,
      memberId: reserver.id,
      status: 'pending',
      createdAt: daysFromToday(-1) + ' 10:00:00'
    });

    const beforeBookRes = await api.get(`/api/books/${book.id}`);

    expect(beforeBookRes.status).toBe(200);
    expect(beforeBookRes.body.availableCopies).toBe(0);

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const afterBookRes = await api.get(`/api/books/${book.id}`);

    expect(afterBookRes.status).toBe(200);
    expect(afterBookRes.body.availableCopies).toBe(0);

    const storedReservation = getReservation(reservation.id);
    expect(storedReservation.status).toBe('ready');
  });
});
