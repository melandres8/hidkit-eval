import { requireReading } from '../lib/validate.mjs';

export const routes = ({ store }) => [
  {
    method: 'POST', path: '/readings',
    handle: ({ body }) => {
      const saved = store.add(requireReading(body));
      return { status: 201, body: { id: saved.id, sensor: saved.sensor, at: new Date(saved.at).toISOString(), hundredths: saved.hundredths } };
    },
  },
];
