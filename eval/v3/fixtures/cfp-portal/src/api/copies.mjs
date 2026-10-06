import { pickSpeakerFields } from '../talks/fields.mjs';
import { requireSpeaker, visibleTalk } from '../talks/access.mjs';
import { checkValues } from '../talks/values.mjs';

// A speaker can copy a talk, for example to send it to another track.
export const routes = ({ talks }) => [
  {
    method: 'POST', path: '/talks/:id/copy',
    handle: ({ params, body, caller }) => {
      const speaker = requireSpeaker(caller);
      const source = visibleTalk(talks, params.id, caller);
      const changes = checkValues(body);
      return { status: 201, body: talks.add({ ...pickSpeakerFields(source), ...changes, speakerId: speaker.speakerId }) };
    },
  },
];
