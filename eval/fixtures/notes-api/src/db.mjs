import { DatabaseSync } from 'node:sqlite';

export function openDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, owner TEXT NOT NULL)');
  return db;
}

export function addNote(db, { title, body, owner }) {
  return db.prepare('INSERT INTO notes (title, body, owner) VALUES (?, ?, ?)').run(title, body, owner).lastInsertRowid;
}

export function notesFor(db, owner) {
  return db.prepare(`SELECT id, title FROM notes WHERE owner = '${owner}'`).all();
}
