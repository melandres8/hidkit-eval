import { requireSpeaker, visibleTalk } from '../talks/access.mjs';
import { checkObject, checkValue } from '../talks/values.mjs';

// The fields of a copy: the fields of the source talk, then the changes in the body.
function mergeChanges(source, body) {
  const { title, abstract, track, level } = source;
  const merged = { title, abstract, track, level, ...checkObject(body) };
  for (const field of ['title', 'abstract', 'track', 'level']) checkValue(field, merged[field]);
  return merged;
}

// A speaker can copy a talk, for example to send it to another track.
export const routes = ({ talks }) => [
  {
    method: 'POST', path: '/talks/:id/copy',
    handle: ({ params, body, caller }) => {
      const speaker = requireSpeaker(caller);
      const source = visibleTalk(talks, params.id, caller);
      return { status: 201, body: talks.add({ ...mergeChanges(source, body), speakerId: speaker.speakerId }) };
    },
  },
];
