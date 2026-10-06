import { forbidden } from '../http/errors.mjs';
import { requireSpeaker, visibleTalk } from '../talks/access.mjs';
import { checkValues } from '../talks/values.mjs';

export const routes = ({ talks }) => [
  {
    method: 'GET', path: '/talks',
    handle: ({ caller }) => {
      if (caller?.role === 'organizer') return { status: 200, body: talks.all() };
      const speaker = requireSpeaker(caller);
      return { status: 200, body: talks.all().filter((t) => t.speakerId === speaker.speakerId) };
    },
  },
  {
    method: 'GET', path: '/talks/:id',
    handle: ({ params, caller }) => {
      if (!caller) throw forbidden();
      return { status: 200, body: visibleTalk(talks, params.id, caller) };
    },
  },
  {
    method: 'POST', path: '/talks',
    handle: ({ body, caller }) => {
      const speaker = requireSpeaker(caller);
      const input = checkValues(body, { full: true });
      return { status: 201, body: talks.add({ ...input, speakerId: speaker.speakerId }) };
    },
  },
  {
    method: 'PATCH', path: '/talks/:id',
    handle: ({ params, body, caller }) => {
      requireSpeaker(caller);
      const talk = visibleTalk(talks, params.id, caller);
      return { status: 200, body: talks.update(talk.id, checkValues(body)) };
    },
  },
];
