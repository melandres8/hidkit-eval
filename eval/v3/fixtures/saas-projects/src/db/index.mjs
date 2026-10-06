import { matches } from './query.mjs';

const TABLES = ['projects', 'tasks', 'comments'];

// A query is { where }. find and update return copies of the rows.
export function createDb() {
  const rows = Object.fromEntries(TABLES.map((name) => [name, []]));
  return {
    insert(table, row) {
      rows[table].push(row);
      return { ...row };
    },
    find: (table, query = {}) => rows[table].filter((row) => matches(row, query.where)).map((row) => ({ ...row })),
    update(table, query, changes) {
      const hit = rows[table].filter((row) => matches(row, query.where));
      for (const row of hit) Object.assign(row, changes);
      return hit.map((row) => ({ ...row }));
    },
  };
}
