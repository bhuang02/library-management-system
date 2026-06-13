const { insert, db } = require('./db');

let unique = 1;

function uniqueIsbn() {
  return `978${String(Date.now()).slice(-10)}${unique++}`.slice(0, 13);
}

function createBook(overrides = {}) {
  return insert('books', {
    isbn: uniqueIsbn(),
    title: 'Test Book',
    author: 'Test Author',
    genre: 'Test Genre',
    year: 2020,
    totalCopies: 1,
    availableCopies: 1,
    ...overrides
  });
}

function createMember(overrides = {}) {
  const n = unique++;
  return insert('members', {
    name: `Test Member ${n}`,
    email: `test.member.${Date.now()}.${n}@example.com`,
    memberNumber: `T${String(Date.now()).slice(-5)}${n}`,
    status: 'active',
    ...overrides
  });
}

function createLoan({ bookId, memberId, borrowDate, dueDate, returnDate = null, status = 'active', fee = 0 }) {
  return insert('loans', {
    bookId,
    memberId,
    borrowDate,
    dueDate,
    returnDate,
    status,
    fee
  });
}

function createReservation({ bookId, memberId, status = 'pending', createdAt = undefined }) {
  const data = { bookId, memberId, status };
  if (createdAt) data.createdAt = createdAt;
  return insert('reservations', data);
}

function getBook(id) {
  return db.prepare('SELECT * FROM books WHERE id = ?').get(id);
}

function getLoan(id) {
  return db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
}

function getReservation(id) {
  return db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
  
function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
} 

module.exports = {
  createBook,
  createMember,
  createLoan,
  createReservation,
  getBook,
  getLoan,
  getReservation,
  todayISO,
  daysFromToday

};

