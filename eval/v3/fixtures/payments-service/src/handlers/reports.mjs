import { buildPaymentsCsv } from '../jobs/payments-csv.mjs';

export const routes = (ctx) => [
  { method: 'GET', path: '/reports/payments.csv', handle: () => ({ status: 200, body: buildPaymentsCsv(ctx.payments.list()) }) },
];
