import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const hash = (password, salt) => scryptSync(password, salt, 32);

// Demo accounts. A real deployment reads them from the account service.
function demoAccount(password, userId) {
  const salt = randomBytes(16);
  return { salt, hash: hash(password, salt), userId };
}

export const DEFAULT_ACCOUNTS = { ada: demoAccount('swordfish', 'u_ada') };

export function verify(accounts, username, password) {
  const account = Object.hasOwn(accounts, username) ? accounts[username] : null;
  if (!account || typeof password !== 'string') return null;
  return timingSafeEqual(hash(password, account.salt), account.hash) ? account.userId : null;
}
