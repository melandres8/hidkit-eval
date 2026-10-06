import { formatAmount } from '../money/format.mjs';
import { isSupported } from '../money/currencies.mjs';
import { badRequest } from '../http/errors.mjs';

export const routes = (ctx) => [
  {
    method: 'GET',
    path: '/ledger/balance',
    handle: ({ query }) => {
      if (!isSupported(query.currency)) throw badRequest('unsupported currency');
      return { status: 200, body: { currency: query.currency, balance: formatAmount(ctx.ledger.balance(query.currency), query.currency) } };
    },
  },
];
