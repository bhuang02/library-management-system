const { api } = require('../helpers/api');
const { resetDb } = require('../helpers/db');
const {
  createBook,
  createMember
} = require('../helpers/fixtures');

async function borrowBookForMember(memberId, bookOverrides = {}) {
  const book = createBook({
    totalCopies: 1,
    availableCopies: 1,
    ...bookOverrides
  });

  const res = await api
    .post('/api/loans')
    .send({
      bookId: book.id,
      memberId
    });

  return {
    book,
    res,
    loan: res.body
  };
}

describe('Loan limit integration flows', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('INT-02 rejects a sixth active loan when a member already has 5 active loans', async () => {
    const member = createMember();

    for (let i = 0; i < 5; i++) {
      const { res } = await borrowBookForMember(member.id);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('active');
    }

    const sixthBook = createBook({
      totalCopies: 1,
      availableCopies: 1
    });

    const sixthBorrowRes = await api
      .post('/api/loans')
      .send({
        bookId: sixthBook.id,
        memberId: member.id
      });

    expect(sixthBorrowRes.status).toBe(409);
    expect(sixthBorrowRes.body.error).toBe(
      'Members may not have more than 5 active loans'
    );
  });

  it('INT-03 allows a member to borrow again after returning one of 5 active loans', async () => {
    const member = createMember();
    const activeLoans = [];

    for (let i = 0; i < 5; i++) {
      const { res, loan } = await borrowBookForMember(member.id);

      expect(res.status).toBe(201);
      activeLoans.push(loan);
    }

    const blockedBook = createBook({
      totalCopies: 1,
      availableCopies: 1
    });

    const blockedBorrowRes = await api
      .post('/api/loans')
      .send({
        bookId: blockedBook.id,
        memberId: member.id
      });

    expect(blockedBorrowRes.status).toBe(409);

    const returnRes = await api.post(`/api/loans/${activeLoans[0].id}/return`);

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.status).toBe('returned');

    const newBook = createBook({
      totalCopies: 1,
      availableCopies: 1
    });

    const allowedBorrowRes = await api
      .post('/api/loans')
      .send({
        bookId: newBook.id,
        memberId: member.id
      });

    expect(allowedBorrowRes.status).toBe(201);
    expect(allowedBorrowRes.body.status).toBe('active');
    expect(allowedBorrowRes.body.bookId).toBe(newBook.id);
    expect(allowedBorrowRes.body.memberId).toBe(member.id);
  });
});
