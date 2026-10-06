import { DatabaseSync } from 'node:sqlite';

export function openDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  return db;
}

export function addOrder(db, { userId, status = 'paid', totalCents, createdAt }) {
  return Number(db.prepare('INSERT INTO orders (user_id, status, total_cents, created_at) VALUES (?, ?, ?, ?)')
    .run(userId, status, totalCents, createdAt).lastInsertRowid);
}
