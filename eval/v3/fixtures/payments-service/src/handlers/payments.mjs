import { capturePayment } from '../services/captures.mjs';
import { createPayment, getPayment } from '../services/payments.mjs';
import { presentPayment } from './present.mjs';

export const routes = (ctx) => [
  { method: 'POST', path: '/payments', handle: ({ body }) => ({ status: 201, body: presentPayment(createPayment(ctx, body)) }) },
  { method: 'GET', path: '/payments/:id', handle: ({ params }) => ({ status: 200, body: presentPayment(getPayment(ctx, params.id)) }) },
  { method: 'POST', path: '/payments/:id/captures', handle: ({ params }) => ({ status: 201, body: presentPayment(capturePayment(ctx, params.id)) }) },
];
