# Library Management System — Test Automation Suite

This repository contains the Library Management System and the automated test suite for the **Returning, Availability and Reservation Interaction** domain.

The tested domain focuses on what happens when a borrowed book is returned:

* an active loan is closed;
* a return date is stored;
* late fees are calculated and frozen;
* book availability is restored if no reservation exists;
* pending reservations are promoted when a returned copy is held for a reserver.

The test suite covers unit tests, API tests, integration tests and E2E/UI tests.

---

# 1. Prerequisites

The following software must be installed:

| Tool                | Required For                                |
| ------------------- | ------------------------------------------- |
| Node.js 18 or newer | Running the application and tests           |
| npm                 | Installing dependencies and running scripts |
| Git                 | Cloning the repository                      |
| Playwright browsers | Running E2E tests                           |

Check your Node.js and npm versions:

```bash
node --version
npm --version
```

Recommended Node.js version:

```text
Node.js 18+
```

---

# 2. Install Dependencies

After cloning the repository, install the project dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

For CI environments or Linux runners, use:

```bash
npx playwright install --with-deps
```

---

# 3. Start the SUT

The SUT means **System Under Test**. In this project, the SUT is the Library Management System application.

First seed the database:

```bash
npm run seed
```

Then start the application:

```bash
npm start
```

The application runs at:

```text
http://localhost:3000
```

Swagger API documentation is available at:

```text
http://localhost:3000/api-docs
```

The OpenAPI JSON is available at:

```text
http://localhost:3000/api-docs.json
```

---

# 4. Test Structure

The test suite is organized by test level:

```text
tests/
  unit/
    fees.test.js

  api/
    return.api.test.js
    fee.api.test.js
    availability.api.test.js

  integration/
    borrow-return.integration.test.js
    loan-limit.integration.test.js
    reservation-promotion.integration.test.js

  e2e/
    return-and-reservation.spec.js

  helpers/
    api.js
    db.js
    fixtures.js
    vitest.setup.js
```

## Test Levels

| Level             | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| Unit tests        | Test pure functions such as fee and due-date calculation     |
| API tests         | Test individual HTTP endpoints and responses                 |
| Integration tests | Test workflows across loans, books, reservations and reports |
| E2E/UI tests      | Test important user-visible behavior through the browser UI  |

---

# 5. Run the Full Test Suite

Run all tests:

```bash
npm test
```

This runs:

```text
unit tests
API tests
integration tests
E2E/UI tests
```

The E2E test command automatically:

1. runs the seed script;
2. starts the application;
3. waits for `http://localhost:3000`;
4. runs Playwright tests;
5. stops the server afterwards.

Important: do not manually run `npm start` on port `3000` before running E2E tests. The E2E script starts the server itself.

If port `3000` is already in use, stop the old server first:

```bash
lsof -ti:3000 | xargs kill -9
```

Then rerun:

```bash
npm run test:e2e
```

---

# 6. Run a Single Test Group

## Run Unit Tests

```bash
npm run test:unit
```

Unit tests cover:

* `dueDate()`;
* `calculateFee()`;
* late fee boundary values;
* maximum fee cap behavior.

---

## Run API Tests

```bash
npm run test:api
```

API tests cover:

* `POST /api/loans/:id/return`;
* `GET /api/loans/:id/fee`;
* `GET /api/books/:id`.

---

## Run Integration Tests

```bash
npm run test:integration
```

Integration tests cover workflows such as:

* borrow → return;
* return → availability restored;
* return → reservation promoted;
* cancelled reservation skipped;
* two returns → two reservations promoted in FIFO order;
* returned overdue loan removed from overdue report.

---

## Run E2E/UI Tests

```bash
npm run test:e2e
```

E2E tests use Playwright and verify the relevant UI behavior:

* returning a book through the UI;
* returned status badge;
* fee display;
* reservation badge changing to `ready`;
* availability staying unchanged when a reservation exists.

---

# 7. Run Individual Test Files

You can run a single Vitest test file with:

```bash
NODE_ENV=test npx vitest run tests/api/return.api.test.js
```

Examples:

```bash
NODE_ENV=test npx vitest run tests/unit/fees.test.js
NODE_ENV=test npx vitest run tests/api/fee.api.test.js
NODE_ENV=test npx vitest run tests/integration/reservation-promotion.integration.test.js
```

Run a single Playwright file:

```bash
npx playwright test tests/e2e/return-and-reservation.spec.js
```

Run one Playwright test by name:

```bash
npx playwright test tests/e2e/return-and-reservation.spec.js -g "E2E-01"
```

Run Playwright in headed mode for debugging:

```bash
npx playwright test tests/e2e --headed
```

---

# 8. Test Reports

## Vitest Reports

By default, Vitest prints the test result summary directly in the terminal.

Example output:

```text
✓ tests/unit/fees.test.js
✓ tests/api/return.api.test.js
✓ tests/integration/reservation-promotion.integration.test.js
```

This output shows:

* which test files ran;
* how many tests passed or failed;
* error messages and stack traces for failed tests.

If JUnit XML reporting is configured, Vitest can also produce a machine-readable test report such as:

```text
test-results/vitest-results.xml
```

This is useful for CI/CD pipelines because GitHub Actions or other systems can publish it as a test artifact.

---

## Playwright Reports

Playwright creates richer reports for E2E tests.

The main HTML report is located at:

```text
playwright-report/
```

Open the latest Playwright HTML report with:

```bash
npx playwright show-report
```

Playwright may also create test artifacts in:

```text
test-results/
```

Depending on the Playwright configuration, this folder can contain:

* screenshots of failed tests;
* traces;
* error context files;
* JUnit XML report.

If JUnit reporting is enabled, the report file is usually:

```text
test-results/playwright-results.xml
```

---

# 9. Test Data and Isolation

The test suite avoids relying on hardcoded IDs from the seeded database.

Instead, tests create their own records using helper functions:

```text
createBook()
createMember()
createLoan()
createReservation()
```

These helpers are located in:

```text
tests/helpers/fixtures.js
```

For unit, API and integration tests, the database is reset before each test. This keeps tests independent from each other.

For E2E tests, the real application is started and seeded before the tests run. The E2E tests still create their own books, members, loans and reservations through API calls so that they do not depend on specific seed data.

---

# 10. Helper Files

## `tests/helpers/api.js`

Creates a Supertest client for the Express app.

Used by:

```text
API tests
Integration tests
```

This allows endpoint testing without starting the server on port `3000`.

---

## `tests/helpers/db.js`

Handles database setup and direct insert operations for tests.

Used for:

* resetting the test database;
* inserting precise fixture data;
* creating states that the public API cannot create directly.

This is needed because some test cases require custom due dates or custom reservation timestamps.

---

## `tests/helpers/fixtures.js`

Provides reusable fixture functions for domain objects:

```text
Book
Member
Loan
Reservation
```

Also provides date helpers such as:

```text
daysFromToday()
todayISO()
```

---

# 11. CI/CD

The project is designed to run in GitHub Actions.

A typical CI workflow performs the following steps:

```text
1. Check out repository
2. Install Node.js
3. Run npm ci
4. Install Playwright browsers
5. Run unit tests
6. Run API tests
7. Run integration tests
8. Seed and start the application
9. Run E2E tests
10. Upload test reports as artifacts
```

The pipeline should fail if any test fails.

GitHub Actions workflow files should be stored in:

```text
.github/workflows/
```

Do not place workflow files inside the `.git` folder. The `.git` folder is Git’s internal storage and should not be edited manually.

---

# 12. Useful Commands Summary

| Task                        | Command                          |
| --------------------------- | -------------------------------- |
| Install dependencies        | `npm install`                    |
| Install Playwright browsers | `npx playwright install`         |
| Seed database               | `npm run seed`                   |
| Start application           | `npm start`                      |
| Run all tests               | `npm test`                       |
| Run unit tests              | `npm run test:unit`              |
| Run API tests               | `npm run test:api`               |
| Run integration tests       | `npm run test:integration`       |
| Run E2E tests               | `npm run test:e2e`               |
| Show Playwright report      | `npx playwright show-report`     |
| Kill process on port 3000   | `lsof -ti:3000 \| xargs kill -9` |

---

# 13. Notes for Future Contributors

When adding new tests:

1. Put the test in the correct folder according to its level.
2. Do not rely on hardcoded seed IDs.
3. Create test data through fixtures or API helpers.
4. Keep E2E tests focused on user-visible behavior.
5. Prefer API or integration tests for detailed business-rule checks.
6. Reset the database before tests that modify state.
7. Use specific assertions, not only “response is not empty”.
8. Use stable selectors in Playwright tests, such as status badge classes or clear visible text.

The goal is to keep the test suite independent, readable and reliable in CI.


-------------------------------

# Library Management System

System under test for the **FHB MCCE Test Automation** course.

---

## What the app does

The system models the operations of a public lending library:

- Members borrow and return books
- Late fees accrue at €0.50/day, capped at €20.00
- Books that are fully borrowed out can be reserved; the first reservation in the queue is automatically promoted when a copy is returned
- A documented REST API covers all operations
- A web UI provides access to all features

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| [Node.js](https://nodejs.org/) | 18 or newer |
| npm | included with Node.js |

No database server, no Docker, no Python required.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/horvathkevin/FHB-MCCE-Library-Management-System-Student.git
cd FHB-MCCE-Library-Management-System-Student

# 2. Install dependencies
npm install

# 3. Seed the database with example data
npm run seed

# 4. Start the server
npm start
```

The server starts on **http://localhost:3000**.

---

## URLs

| URL | What's there |
|-----|-------------|
| `http://localhost:3000` | Web UI |
| `http://localhost:3000/api-docs` | Swagger UI — interactive API documentation |
| `http://localhost:3000/api-docs.json` | Raw OpenAPI spec (importable into Postman etc.) |

---

## Available scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run seed` | Wipe the database and re-seed with example data |

> Run `npm run seed` before each testing session to reset the database to a known, clean state.

---

## Seed data

The seed script populates the database with realistic example data:

| Entity | Count |
|--------|-------|
| Books | 61 |
| Members | 55 (50 active, 5 inactive) |
| Loans | 55 (active, returned on time, returned late, overdue) |
| Reservations | 55 (pending, ready, cancelled) |

---

## API overview

| Base path | Domain |
|-----------|--------|
| `GET/POST /api/books` | Book catalog |
| `GET/PUT/DELETE /api/books/:id` | Single book |
| `GET/POST /api/members` | Members |
| `GET/PUT/DELETE /api/members/:id` | Single member |
| `POST /api/members/:id/activate` | Reactivate a member |
| `POST /api/members/:id/deactivate` | Deactivate a member |
| `GET/POST /api/loans` | Loans (borrow) |
| `GET /api/loans/:id` | Single loan |
| `POST /api/loans/:id/return` | Return a book |
| `GET /api/loans/:id/fee` | Calculate current fee |
| `GET/POST /api/reservations` | Reservations |
| `POST /api/reservations/:id/cancel` | Cancel a reservation |
| `GET /api/search/books` | Search books by title, author, ISBN, genre |
| `GET /api/search/members` | Search members by name or email |
| `GET /api/reports/members/:id/history` | Loan history for a member |
| `GET /api/reports/members/:id/stats` | Loan statistics for a member |
| `GET /api/reports/books/top` | Most borrowed books |
| `GET /api/reports/loans/overdue` | All currently overdue loans |

Full request/response documentation is available in the Swagger UI.

---

## Business rules

### Books
- ISBN must be a valid 10- or 13-digit number and is unique
- Publication year cannot be in the future
- A book with active loans cannot be deleted

### Members
- Email address is unique per member
- Members can be deactivated — inactive members cannot borrow or reserve
- A member with active loans cannot be deleted

### Borrowing
- A book can only be borrowed if at least one copy is available
- A member may not borrow the same book twice simultaneously
- A member may hold at most **5 active loans**
- Loans are due **14 days** after the borrow date

### Late fees
- Fee: **€0.50 per day** overdue
- Maximum fee: **€20.00** per loan
- Fee is calculated and frozen at the moment of return

### Reservations
- A book can only be reserved when all copies are currently on loan
- A member may hold at most **3 active reservations**
- Reservations are fulfilled in **FIFO order**
- When a book is returned, the oldest pending reservation is automatically promoted to "ready"

---

## Assignment

The group assignment document is available in [`docs/FHB-MCCE-Group-Assignment.docx`](docs/FHB-MCCE-Group-Assignment.docx).

It describes your group's assigned domain, the business rules you must cover, and all submission requirements.

---

## Project structure

```
├── src/
│   ├── server.js           # Entry point
│   ├── app.js              # Express app + Swagger setup
│   ├── db.js               # SQLite database wrapper
│   ├── fees.js             # Late fee calculation logic
│   └── routes/
│       ├── books.js
│       ├── members.js
│       ├── loans.js
│       ├── reservations.js
│       ├── search.js
│       └── reports.js
├── public/
│   ├── index.html          # Single-page web UI
│   └── app.js              # Frontend JavaScript
├── docs/
│   └── FHB-MCCE-Group-Assignment.docx
├── seed.js                 # Database seeding script
└── package.json
```
