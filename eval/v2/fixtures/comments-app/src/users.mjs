// Comment pages show hundreds of comments from few authors. Keep this cache.
// One cache per database: db -> Map(user id -> user).
const cache = new WeakMap();

export function userById(db, id) {
  let byId = cache.get(db);
  if (!byId) {
    byId = new Map();
    cache.set(db, byId);
  }
  if (!byId.has(id)) byId.set(id, db.getUser(id));
  return byId.get(id);
}
