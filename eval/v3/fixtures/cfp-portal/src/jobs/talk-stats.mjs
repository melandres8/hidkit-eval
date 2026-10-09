export function talkStats({ talks }) {
  const byStatus = {};
  const byTrack = {};
  for (const talk of talks.all()) {
    byStatus[talk.status] = (byStatus[talk.status] ?? 0) + 1;
    byTrack[talk.track] = (byTrack[talk.track] ?? 0) + 1;
  }
  return { byStatus, byTrack };
}
