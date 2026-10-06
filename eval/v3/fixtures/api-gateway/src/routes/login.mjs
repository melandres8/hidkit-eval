import { randomBytes } from 'node:crypto';
import { verify } from '../auth/accounts.mjs';

export const routes = ({ accounts, sessions }) => {
  return [
    {
      method: 'POST',
      path: '/login',
      limiter: 'login',
      handle: (request) => {
        const userId = verify(accounts, request.body?.username, request.body?.password);
        if (!userId) return { status: 401, body: { error: 'bad credentials' } };
        const token = `tok_${randomBytes(32).toString('base64url')}`;
        sessions.set(token, { userId });
        return { status: 200, body: { token } };
      },
    },
  ];
};
