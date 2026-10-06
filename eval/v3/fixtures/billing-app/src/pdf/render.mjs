import { lineAmount } from '../billing/lines.mjs';
import { formatMinor } from '../money/format.mjs';

// The text of the invoice document. The PDF writer turns it into pages.
export function renderInvoice(invoice) {
  const subtotal = invoice.lines.reduce((sum, line) => sum + (line.quantity * line.unitPriceMinor) / 100, 0);
  const tax = Math.round(subtotal * (invoice.taxRateBps / 10000) * 100) / 100;
  const total = subtotal + tax;
  return [
    `Invoice ${invoice.number}`,
    `Customer: ${invoice.customer}`,
    ...(invoice.issuedAt ? [`Date: ${invoice.issuedAt.slice(0, 10)}`] : ['Draft']),
    'Items:',
    ...invoice.lines.map((line) => `  ${line.quantity} x ${line.description} @ ${formatMinor(line.unitPriceMinor)} = ${formatMinor(lineAmount(line))}`),
    `Subtotal: ${subtotal.toFixed(2)}`,
    `Tax (${(invoice.taxRateBps / 100).toFixed(2)}%): ${tax.toFixed(2)}`,
    `Total: ${total.toFixed(2)}`,
  ].join('\n');
}
