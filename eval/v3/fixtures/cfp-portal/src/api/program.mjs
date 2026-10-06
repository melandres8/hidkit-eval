// The public program: the accepted talks, by track and then by title.
export const routes = ({ talks }) => [
  {
    method: 'GET', path: '/program',
    handle: () => {
      const accepted = talks.all().filter((t) => t.status === 'accepted')
        .map(({ id, title, track, level, room }) => ({ id, title, track, level, room }))
        .sort((a, b) => a.track.localeCompare(b.track) || a.title.localeCompare(b.title));
      return { status: 200, body: accepted };
    },
  },
];
