// In-memory document store. A document is { id, ownerId, title, body }.
export function createDocs() {
  const docs = new Map();
  let nextId = 1;
  return {
    create({ ownerId, title, body = '' }) {
      const doc = { id: nextId++, ownerId, title, body };
      docs.set(doc.id, doc);
      return { ...doc };
    },
    get: (id) => (docs.has(id) ? { ...docs.get(id) } : null),
    update(id, fields) {
      const doc = docs.get(id);
      if (!doc) return null;
      for (const key of ['title', 'body']) if (typeof fields[key] === 'string') doc[key] = fields[key];
      return { ...doc };
    },
    remove: (id) => docs.delete(id),
  };
}
