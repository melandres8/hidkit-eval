import { lineAmount } from './lines.mjs';
import { taxOn } from './tax.mjs';

export function computeTotals(invoice) {
  const amounts = invoice.lines.map(lineAmount);
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const tax = amounts.reduce((sum, amount) => sum + taxOn(amount, invoice.taxRateBps), 0);
  return { subtotal, tax, total: subtotal + tax };
}
