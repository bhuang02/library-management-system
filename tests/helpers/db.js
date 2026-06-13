const { initDb, clearAllTables, db } = require('../../src/db');

async function resetDb() {
  await initDb();
  clearAllTables();
}

function insert(table, obj) {
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const placeholders = keys.map(() => '?').join(',');

  const result = db
    .prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`)
    .run(...values);

  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
}

module.exports = {
  resetDb,
  insert,
  db
};
