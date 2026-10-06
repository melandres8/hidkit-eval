import { computeTotals } from '../billing/totals.mjs';
import { badRequest, conflict, notFound } from '../http/errors.mjs';

// An issued invoice has stored totals. A draft has none, so the API computes them.
const present = (invoice) => ({ ...invoice, totals: invoice.totals ?? computeTotals(invoice) });

function validLines(lines) {
  return Array.isArray(lines) && lines.length > 0
    && lines.every((l) => Number.isInteger(l.quantity) && l.quantity > 0 && Number.isInteger(l.unitPriceMinor) && l.unitPriceMinor >= 0);
}

export const routes = ({ store }) => [
  {
    method: 'POST',
    path: '/invoices',
    handle: ({ body }) => {
      if (!body.customer || !validLines(body.lines)) throw badRequest('customer and valid lines are required');
      if (body.taxRateBps !== undefined && !(Number.isInteger(body.taxRateBps) && body.taxRateBps >= 0)) throw badRequest('bad tax rate');
      return { status: 201, body: present(store.createDraft(body)) };
    },
  },
  {
    method: 'GET',
    path: '/invoices/:id',
    handle: ({ params }) => {
      const invoice = store.get(params.id);
      if (!invoice) throw notFound('invoice not found');
      return { status: 200, body: present(invoice) };
    },
  },
  {
    method: 'POST',
    path: '/invoices/:id/issue',
    handle: ({ params }) => {
      const invoice = store.get(params.id);
      if (!invoice) throw notFound('invoice not found');
      if (invoice.status !== 'draft') throw conflict('the invoice is already issued');
      return { status: 200, body: present(store.issue(params.id)) };
    },
  },
];
