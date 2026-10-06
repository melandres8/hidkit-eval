import { computeTotals } from '../billing/totals.mjs';
import { taxOn } from '../billing/tax.mjs';
import { formatMinor } from '../money/format.mjs';

const HEADER = ['number', 'customer', 'currency', 'subtotal', 'tax', 'total'];

// Names with a comma or a quote are wrapped in quotes.
const cell = (text) => (/[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);

export function exportInvoicesCsv(invoices) {
  const rows = invoices.map((invoice) => {
    const { subtotal } = computeTotals(invoice);
    const tax = taxOn(subtotal, invoice.taxRateBps);
    return [invoice.number, cell(invoice.customer), invoice.currency, formatMinor(subtotal), formatMinor(tax), formatMinor(subtotal + tax)];
  });
  return `${[HEADER, ...rows].map((row) => row.join(',')).join('\n')}\n`;
}
