const { test, expect } = require('@playwright/test');

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function uniqueIsbn() {
  return `978${String(Date.now()).slice(-10)}${Math.floor(Math.random() * 10)}`.slice(0, 13);
}

async function createBook(request, overrides = {}) {
  const suffix = uniqueSuffix();

  const res = await request.post('/api/books', {
    data: {
      isbn: uniqueIsbn(),
      title: `E2E Test Book ${suffix}`,
      author: 'E2E Author',
      genre: 'E2E',
      year: 2020,
      totalCopies: 1,
      ...overrides
    }
  });

  expect(res.status()).toBe(201);
  return await res.json();
}

async function createMember(request, overrides = {}) {
  const suffix = uniqueSuffix();

  const res = await request.post('/api/members', {
    data: {
      name: `E2E Member ${suffix}`,
      email: `e2e.member.${suffix}@example.com`,
      ...overrides
    }
  });

  expect(res.status()).toBe(201);
  return await res.json();
}

async function borrowBook(request, bookId, memberId) {
  const res = await request.post('/api/loans', {
    data: {
      bookId,
      memberId
    }
  });

  expect(res.status()).toBe(201);
  return await res.json();
}

async function createReservation(request, bookId, memberId) {
  const res = await request.post('/api/reservations', {
    data: {
      bookId,
      memberId
    }
  });

  expect(res.status()).toBe(201);
  return await res.json();
}

async function openLoanDetail(page, loanId) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.evaluate((id) => {
    window.navigate('loans', 'loan', id);
  }, loanId);

  await expect(page.getByRole('heading', { name: `Loan #${loanId}` })).toBeVisible();
}

async function openBookDetail(page, bookId, title) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.evaluate((id) => {
    window.navigate('books', 'book', id);
  }, bookId);

  await expect(page.getByRole('heading', { name: 'Book Details' })).toBeVisible();
  // await expect(page.getByDisplayValue(title)).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function seedOverdueLoan(request, bookId, memberId, daysOverdue) {
  const res = await request.post('/api/loans', {
    data: {
      bookId,
      memberId,
      borrowDate: daysFromToday(-(14 + daysOverdue)),
      dueDate: daysFromToday(-daysOverdue)
    }
  });

  expect(res.status()).toBe(201);
  return await res.json();
}

async function openReservationDetail(page, reservationId) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.evaluate((id) => {
    window.navigate('reservations', 'reservation', id);
  }, reservationId);

  await expect(page.getByRole('heading', { name: `Reservation #${reservationId}` })).toBeVisible();
}

test.describe('Returning and reservation promotion E2E tests', () => {
  test('E2E-01 returns a book through the UI and shows the loan as returned', async ({ page, request }) => {
    const book = await createBook(request);
    const member = await createMember(request);
    const loan = await borrowBook(request, book.id, member.id);

    await openLoanDetail(page, loan.id);

    await expect(page.locator('span.badge.active').first()).toBeVisible();
    // await expect(page.getByText('active')).toBeVisible();

    await page.getByRole('button', { name: 'Return Book' }).click();

    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();
    // await expect(page.getByText('returned')).toBeVisible();
    await expect(page.locator('span.badge.returned')).toBeVisible();
  });

  test('E2E-02 shows the frozen fee on the loan detail page after return', async ({ page, request }) => {
    const book = await createBook(request);
    const member = await createMember(request);
    const loan = await borrowBook(request, book.id, member.id);

    await openLoanDetail(page, loan.id);

    await page.getByRole('button', { name: 'Return Book' }).click();

    await expect(page.getByText('Returned. Fee charged: €0.00')).toBeVisible();
    // await expect(page.getByText('Fee')).toBeVisible();
    await expect(page.getByText('Fee', { exact: true }).first()).toBeVisible();
    // await expect(page.getByText('€0.00')).toBeVisible();
    await expect(page.locator('span.dl-value', { hasText: '€0.00' }).first()).toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.evaluate((id) => {
      window.navigate('loans', 'loan', id);
    }, loan.id);

    await expect(page.getByRole('heading', { name: `Loan #${loan.id}` })).toBeVisible();
    // await expect(page.getByText('returned')).toBeVisible();
    await expect(page.locator('span.badge.returned')).toBeVisible();
    await expect(page.getByText('€0.00')).toBeVisible();
  });

  test('E2E-03 promotes a reservation to ready after the borrowed book is returned through the UI', async ({ page, request }) => {
    const book = await createBook(request);
    const borrower = await createMember(request);
    const reserver = await createMember(request);

    const loan = await borrowBook(request, book.id, borrower.id);
    const reservation = await createReservation(request, book.id, reserver.id);

    await openReservationDetail(page, reservation.id);
    await expect(page.getByText('pending')).toBeVisible();

    await openLoanDetail(page, loan.id);
    await page.getByRole('button', { name: 'Return Book' }).click();

    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openReservationDetail(page, reservation.id);

    await expect(page.getByText('ready')).toBeVisible();
  });

  test('E2E-04 keeps available copies at 0 when a pending reservation exists during return', async ({ page, request }) => {
    const book = await createBook(request);
    const borrower = await createMember(request);
    const reserver = await createMember(request);

    const loan = await borrowBook(request, book.id, borrower.id);
    await createReservation(request, book.id, reserver.id);

    await openBookDetail(page, book.id, book.title);
    await expect(page.getByText('0 / 1')).toBeVisible();

    await openLoanDetail(page, loan.id);
    await page.getByRole('button', { name: 'Return Book' }).click();

    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openBookDetail(page, book.id, book.title);

    await expect(page.getByText('0 / 1')).toBeVisible();
  });

  test('E2E-05 verifies availableCopies on book detail decrements after borrow and restores after return via UI', async ({ page, request }) => {
    const book = await createBook(request, { totalCopies: 1 });
    const member = await createMember(request);

    await openBookDetail(page, book.id, book.title);
    await expect(page.getByText('1 / 1')).toBeVisible();

    const loan = await borrowBook(request, book.id, member.id);

    await openBookDetail(page, book.id, book.title);
    await expect(page.getByText('0 / 1')).toBeVisible();

    await openLoanDetail(page, loan.id);
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openBookDetail(page, book.id, book.title);
    await expect(page.getByText('1 / 1')).toBeVisible();
  });

  test('E2E-07 rejects a sixth borrow via the UI when a member already has 5 active loans', async ({ page, request }) => {
    const member = await createMember(request);

    for (let i = 0; i < 5; i++) {
      const book = await createBook(request);
      await borrowBook(request, book.id, member.id);
    }

    const sixthBook = await createBook(request);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => { window.navigate('loans'); });
    await expect(page.getByRole('heading', { name: 'Borrow a Book' })).toBeVisible();

    await page.getByPlaceholder('Book ID').fill(String(sixthBook.id));
    await page.getByPlaceholder('Member ID').fill(String(member.id));
    await page.getByRole('button', { name: 'Borrow' }).click();

    await expect(page.getByText('Members may not have more than 5 active loans')).toBeVisible();
  });

  test('E2E-08 allows a sixth borrow via the UI after returning one of 5 active loans', async ({ page, request }) => {
    const member = await createMember(request);
    const loans = [];

    for (let i = 0; i < 5; i++) {
      const book = await createBook(request);
      loans.push(await borrowBook(request, book.id, member.id));
    }

    const sixthBook = await createBook(request);

    // Confirm the 6th borrow is rejected via UI
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => { window.navigate('loans'); });
    await expect(page.getByRole('heading', { name: 'Borrow a Book' })).toBeVisible();

    await page.getByPlaceholder('Book ID').fill(String(sixthBook.id));
    await page.getByPlaceholder('Member ID').fill(String(member.id));
    await page.getByRole('button', { name: 'Borrow' }).click();
    await expect(page.getByText('Members may not have more than 5 active loans')).toBeVisible();

    // Return one loan via UI to free a slot
    await openLoanDetail(page, loans[0].id);
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    // The 6th borrow now succeeds
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => { window.navigate('loans'); });
    await expect(page.getByRole('heading', { name: 'Borrow a Book' })).toBeVisible();

    await page.getByPlaceholder('Book ID').fill(String(sixthBook.id));
    await page.getByPlaceholder('Member ID').fill(String(member.id));
    await page.getByRole('button', { name: 'Borrow' }).click();
    await expect(page.getByText(/Loan created/)).toBeVisible();
  });

  test('E2E-09 skips a cancelled reservation and promotes the next pending one when a loan is returned via UI', async ({ page, request }) => {
    const book = await createBook(request);
    const borrower = await createMember(request);
    const cancelledReserver = await createMember(request);
    const pendingReserver = await createMember(request);

    const loan = await borrowBook(request, book.id, borrower.id);
    const reservation1 = await createReservation(request, book.id, cancelledReserver.id);

    // Cancel the first reservation via UI
    await openReservationDetail(page, reservation1.id);
    await page.getByRole('button', { name: 'Cancel Reservation' }).click();
    await expect(page.getByText('Reservation cancelled.')).toBeVisible();
    await expect(page.locator('span.badge.cancelled')).toBeVisible();

    // Create the second reservation (API — book is still fully borrowed)
    const reservation2 = await createReservation(request, book.id, pendingReserver.id);

    await openReservationDetail(page, reservation2.id);
    await expect(page.locator('span.badge.pending')).toBeVisible();

    // Return the loan via UI — should promote reservation2, not reservation1
    await openLoanDetail(page, loan.id);
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openReservationDetail(page, reservation2.id);
    await expect(page.locator('span.badge.ready')).toBeVisible();

    await openReservationDetail(page, reservation1.id);
    await expect(page.locator('span.badge.cancelled')).toBeVisible();
  });

  test('E2E-10 promotes two reservations in FIFO order as two copies are returned via UI', async ({ page, request }) => {
    const book = await createBook(request, { totalCopies: 2 });
    const borrowerOne = await createMember(request);
    const borrowerTwo = await createMember(request);
    const reserverOne = await createMember(request);
    const reserverTwo = await createMember(request);

    const loanOne = await borrowBook(request, book.id, borrowerOne.id);
    const loanTwo = await borrowBook(request, book.id, borrowerTwo.id);

    // reserverOne reserves first (older createdAt) — should be promoted first
    const reservationOne = await createReservation(request, book.id, reserverOne.id);
    const reservationTwo = await createReservation(request, book.id, reserverTwo.id);

    // Return first copy via UI — only the first reservation should become ready
    await openLoanDetail(page, loanOne.id);
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openReservationDetail(page, reservationOne.id);
    await expect(page.locator('span.badge.ready')).toBeVisible();

    await openReservationDetail(page, reservationTwo.id);
    await expect(page.locator('span.badge.pending')).toBeVisible();

    // Return second copy via UI — second reservation should now become ready
    await openLoanDetail(page, loanTwo.id);
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(/Returned\. Fee charged:/)).toBeVisible();

    await openReservationDetail(page, reservationTwo.id);
    await expect(page.locator('span.badge.ready')).toBeVisible();
  });

  test('E2E-06 seeds an overdue loan, verifies accrued fee on detail page, freezes fee on return, and confirms removal from the overdue report', async ({ page, request }) => {
    const daysOverdue = 6;
    const expectedFee = `€${(daysOverdue * 0.50).toFixed(2)}`; // €3.00

    const book = await createBook(request);
    const member = await createMember(request);
    const loan = await seedOverdueLoan(request, book.id, member.id, daysOverdue);

    // Verify overdue state and live accrued fee on the loan detail page
    await openLoanDetail(page, loan.id);
    await expect(page.locator('span.badge.active').first()).toBeVisible();
    await expect(page.getByText('⚠ OVERDUE')).toBeVisible();
    await expect(page.getByText('Accrued fee (today)', { exact: true })).toBeVisible();
    await expect(page.locator('span.dl-value', { hasText: expectedFee })).toBeVisible();

    // Return via UI — fee is frozen at the moment of return
    await page.getByRole('button', { name: 'Return Book' }).click();
    await expect(page.getByText(`Returned. Fee charged: ${expectedFee}`)).toBeVisible();
    await expect(page.locator('span.badge.returned')).toBeVisible();

    // Loan no longer appears in the overdue report
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => { window.navigate('reports'); });
    await expect(page.getByRole('button', { name: 'Load Overdue' })).toBeVisible();
    await page.getByRole('button', { name: 'Load Overdue' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(String(loan.id), { exact: true })).not.toBeVisible();
  });
});
