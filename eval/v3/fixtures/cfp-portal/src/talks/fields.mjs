// The fields of a talk that a speaker sets. See docs/fields.md.
export const SPEAKER_FIELDS = ['title', 'abstract', 'track', 'level'];

export function pickSpeakerFields(source) {
  const out = {};
  for (const field of SPEAKER_FIELDS) {
    if (Object.hasOwn(source, field)) out[field] = source[field];
  }
  return out;
}
