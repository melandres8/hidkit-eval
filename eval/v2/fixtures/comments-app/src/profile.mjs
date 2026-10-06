export function renameUser(db, id, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new RangeError('name must not be empty');
  db.setUserName(id, trimmed);
}
