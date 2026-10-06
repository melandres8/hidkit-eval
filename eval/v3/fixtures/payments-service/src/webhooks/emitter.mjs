import { createIds } from '../store/ids.mjs';

export function createEmitter({ transport, clock = () => new Date() }) {
  const nextId = createIds('evt');
  return {
    emit(type, data) {
      const event = { id: nextId(), type, createdAt: clock().toISOString(), data };
      transport.send(event);
      return event;
    },
  };
}
