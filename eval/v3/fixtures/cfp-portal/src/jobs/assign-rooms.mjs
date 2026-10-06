import { ROOMS } from '../talks/rooms.mjs';

export function assignRooms({ talks }) {
  const assigned = [];
  for (const talk of talks.all()) {
    if (talk.status !== 'accepted' || talk.room !== null) continue;
    talks.update(talk.id, { room: ROOMS[talk.track] });
    assigned.push(talk.id);
  }
  return { assigned };
}
