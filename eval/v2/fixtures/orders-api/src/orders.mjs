// Values from a request go in as ? parameters, never into the SQL text.
export function listOrders(db, { userId, status }) {
  const where = ['user_id = ?'];
  const params = [userId];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const sql = `SELECT id, status, total_cents AS totalCents, created_at AS createdAt
    FROM orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC`;
  return db.prepare(sql).all(...params);
}
