import { forbidden, notFound } from '../http/errors.mjs';

export function requireSpeaker(caller) {
  if (caller?.role !== 'speaker' || typeof caller.speakerId !== 'string') throw forbidden();
  return caller;
}

export function requireOrganizer(caller) {
  if (caller?.role !== 'organizer') throw forbidden();
  return caller;
}

// The talk, if the caller may see it. A talk of another speaker looks like a missing talk.
export function visibleTalk(talks, id, caller) {
  const talk = talks.get(id);
  if (caller?.role === 'organizer') return talk;
  if (caller?.role === 'speaker' && talk.speakerId === caller.speakerId) return talk;
  if (caller?.role === 'speaker') throw notFound();
  throw forbidden();
}
