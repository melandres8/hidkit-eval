import { badRequest } from '../http/errors.mjs';
import { requireOrganizer } from '../talks/access.mjs';
import { ROOMS } from '../talks/rooms.mjs';
import { checkValues } from '../talks/values.mjs';

// Organizers add the talks of invited speakers, such as a keynote. Such a talk is accepted from the start and has its room.
export const routes = ({ talks }) => [
  {
    method: 'POST', path: '/talks/invited',
    handle: ({ body, caller }) => {
      requireOrganizer(caller);
      const { title, abstract = '', track, level } = checkValues(body, { full: true });
      if (typeof body.speakerId !== 'string' || body.speakerId === '') throw badRequest('bad speakerId');
      if (!Object.values(ROOMS).includes(body.room)) throw badRequest('bad room');
      return { status: 201, body: talks.add({ title, abstract, track, level, speakerId: body.speakerId, status: 'accepted', room: body.room }) };
    },
  },
];
