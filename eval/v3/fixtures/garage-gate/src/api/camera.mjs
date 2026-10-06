import { checkEvent } from '../camera/read.mjs';
import { decide } from '../gate/decide.mjs';

export const routes = (context) => [
  {
    method: 'POST', path: '/camera',
    handle: ({ body }) => {
      const event = checkEvent(body);
      const decision = decide(context, event);
      context.log.record(event, decision);
      return { status: 200, body: decision };
    },
  },
];
