const { api } = require('../helpers/api');
const { resetDb } = require('../helpers/db');
const {
  createBook,
  createMember,
  createLoan,
  createReservation,
  daysFromToday
} = require('../helpers/fixtures');

describe('Reservation promotion integration flows', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('INT-04 promotes a pending reservation to ready when a loan is returned', async () => {
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
      dueDate: daysFromToday(9),
      status: 'active'
    });

    const reservation = createReservation({
      bookId: book.id,
      memberId: reserver.id,
      status: 'pending',
      createdAt: '2026-01-01 10:00:00'
    });

    const reservationBeforeRes = await api.get(`/api/reservations/${reservation.id}`);

    expect(reservationBeforeRes.status).toBe(200);
    expect(reservationBeforeRes.body.status).toBe('pending');

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const reservationAfterRes = await api.get(`/api/reservations/${reservation.id}`);

    expect(reservationAfterRes.status).toBe(200);
    expect(reservationAfterRes.body.status).toBe('ready');
  });

  it('INT-05 does not increment availableCopies when a reservation is promoted', async () => {
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
      dueDate: daysFromToday(9),
      status: 'active'
    });

    createReservation({
      bookId: book.id,
      memberId: reserver.id,
      status: 'pending',
      createdAt: '2026-01-01 10:00:00'
    });

    const bookBeforeRes = await api.get(`/api/books/${book.id}`);

    expect(bookBeforeRes.status).toBe(200);
    expect(bookBeforeRes.body.availableCopies).toBe(0);

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const bookAfterRes = await api.get(`/api/books/${book.id}`);

    expect(bookAfterRes.status).toBe(200);
    expect(bookAfterRes.body.availableCopies).toBe(0);
  });

  it('INT-06 skips a cancelled reservation and promotes the next pending reservation', async () => {
    const book = createBook({
      totalCopies: 1,
      availableCopies: 0
    });

    const borrower = createMember();
    const cancelledReserver = createMember();
    const pendingReserver = createMember();

    const loan = createLoan({
      bookId: book.id,
      memberId: borrower.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9),
      status: 'active'
    });

    const cancelledReservation = createReservation({
      bookId: book.id,
      memberId: cancelledReserver.id,
      status: 'cancelled',
      createdAt: '2026-01-01 09:00:00'
    });

    const pendingReservation = createReservation({
      bookId: book.id,
      memberId: pendingReserver.id,
      status: 'pending',
      createdAt: '2026-01-01 10:00:00'
    });

    const returnRes = await api.post(`/api/loans/${loan.id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const cancelledAfterRes = await api.get(`/api/reservations/${cancelledReservation.id}`);
    const pendingAfterRes = await api.get(`/api/reservations/${pendingReservation.id}`);

    expect(cancelledAfterRes.status).toBe(200);
    expect(cancelledAfterRes.body.status).toBe('cancelled');

    expect(pendingAfterRes.status).toBe(200);
    expect(pendingAfterRes.body.status).toBe('ready');
  });

  it('INT-07 promotes two reservations in FIFO order when two copies are returned', async () => {
    const book = createBook({
      totalCopies: 2,
      availableCopies: 0
    });

    const borrowerOne = createMember();
    const borrowerTwo = createMember();
    const reserverOne = createMember();
    const reserverTwo = createMember();

    const loanOne = createLoan({
      bookId: book.id,
      memberId: borrowerOne.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9),
      status: 'active'
    });

    const loanTwo = createLoan({
      bookId: book.id,
      memberId: borrowerTwo.id,
      borrowDate: daysFromToday(-5),
      dueDate: daysFromToday(9),
      status: 'active'
    });

    const firstReservation = createReservation({
      bookId: book.id,
      memberId: reserverOne.id,
      status: 'pending',
      createdAt: '2026-01-01 09:00:00'
    });

    const secondReservation = createReservation({
      bookId: book.id,
      memberId: reserverTwo.id,
      status: 'pending',
      createdAt: '2026-01-01 10:00:00'
    });

    const firstReturnRes = await api.post(`/api/loans/${loanOne.id}/return`);

    expect(firstReturnRes.status).toBe(200);

    const firstReservationAfterFirstReturnRes = await api.get(
      `/api/reservations/${firstReservation.id}`
    );

    const secondReservationAfterFirstReturnRes = await api.get(
      `/api/reservations/${secondReservation.id}`
    );

    expect(firstReservationAfterFirstReturnRes.status).toBe(200);
    expect(firstReservationAfterFirstReturnRes.body.status).toBe('ready');

    expect(secondReservationAfterFirstReturnRes.status).toBe(200);
    expect(secondReservationAfterFirstReturnRes.body.status).toBe('pending');

    const secondReturnRes = await api.post(`/api/loans/${loanTwo.id}/return`);

    expect(secondReturnRes.status).toBe(200);

    const firstReservationAfterSecondReturnRes = await api.get(
      `/api/reservations/${firstReservation.id}`
    );

    const secondReservationAfterSecondReturnRes = await api.get(
      `/api/reservations/${secondReservation.id}`
    );

    expect(firstReservationAfterSecondReturnRes.status).toBe(200);
    expect(firstReservationAfterSecondReturnRes.body.status).toBe('ready');

    expect(secondReservationAfterSecondReturnRes.status).toBe(200);
    expect(secondReservationAfterSecondReturnRes.body.status).toBe('ready');

    const bookAfterRes = await api.get(`/api/books/${book.id}`);

    expect(bookAfterRes.status).toBe(200);
    expect(bookAfterRes.body.availableCopies).toBe(0);
  });
});
