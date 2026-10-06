import fs from 'node:fs';

// The users live in a JSON lines file. The store loads it once and writes it back after each change.
export function createUserStore({ file, clock = () => new Date() }) {
  const listeners = [];
  let users = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line))
    : [];

  function commit() {
    fs.writeFileSync(file, users.map((user) => `${JSON.stringify(user)}\n`).join(''));
    for (const listener of listeners) listener();
  }

  return {
    all: () => [...users],
    get: (id) => users.find((user) => user.id === id) ?? null,
    create({ name, email, handle }) {
      const next = users.reduce((max, user) => Math.max(max, Number(user.id.slice(2))), 1000) + 1;
      const user = { id: `u_${next}`, name, email, handle, createdAt: clock().toISOString(), status: 'active' };
      users.push(user);
      commit();
      return user;
    },
    update(id, fields) {
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      Object.assign(user, fields);
      commit();
      return user;
    },
    remove(id) {
      const before = users.length;
      users = users.filter((user) => user.id !== id);
      if (users.length === before) return false;
      commit();
      return true;
    },
    subscribe: (listener) => listeners.push(listener),
  };
}
