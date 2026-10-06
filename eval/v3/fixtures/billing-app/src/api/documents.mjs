import { notFound } from '../http/errors.mjs';
import { renderInvoice } from '../pdf/render.mjs';

export const routes = ({ store }) => [
  {
    method: 'GET',
    path: '/invoices/:id/pdf',
    handle: ({ params }) => {
      const invoice = store.get(params.id);
      if (!invoice) throw notFound('invoice not found');
      return { status: 200, body: renderInvoice(invoice) };
    },
  },
];
