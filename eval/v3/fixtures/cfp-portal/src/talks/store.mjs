import { notFound } from '../http/errors.mjs';

// The talks in memory, in the order they were sent.
export function createTalkStore({ clock }) {
  const talks = [];
  let next = 1;
  const copy = (talk) => ({ ...talk });
  return {
    add(fields) {
      const now = clock().toISOString();
      const talk = { status: 'submitted', score: null, room: null, abstract: '', ...fields, id: `t${next++}`, createdAt: now, updatedAt: now };
      talks.push(talk);
      return copy(talk);
    },
    get(id) {
      const talk = talks.find((t) => t.id === id);
      if (!talk) throw notFound();
      return copy(talk);
    },
    update(id, fields) {
      const talk = talks.find((t) => t.id === id);
      if (!talk) throw notFound();
      Object.assign(talk, fields, { updatedAt: clock().toISOString() });
      return copy(talk);
    },
    all: () => talks.map(copy),
  };
}
