import { exportInvoicesCsv } from '../export/csv.mjs';

export const routes = ({ store }) => [
  { method: 'GET', path: '/exports/invoices.csv', handle: () => ({ status: 200, body: exportInvoicesCsv(store.list()) }) },
];
