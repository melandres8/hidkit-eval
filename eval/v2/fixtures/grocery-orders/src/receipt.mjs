import { lineTotal } from './lines.mjs';
import { formatCents } from './money.mjs';
import { orderTotal, validateLine } from './order.mjs';

// order is { lines: [{ name, priceCents, quantity }] }.
export function receipt(order) {
  return {
    lines: order.lines.map((line) => ({ name: line.name, amount: formatCents(lineTotal(validateLine(line))) })),
    total: formatCents(orderTotal(order.lines)),
  };
}
