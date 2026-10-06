import { formatAmount } from '../money/format.mjs';

const HEADER = ['id', 'currency', 'amount', 'status', 'captured'];

export function buildPaymentsCsv(payments) {
  const rows = payments.map((p) => [p.id, p.currency, formatAmount(p.amount, p.currency), p.status, formatAmount(p.capturedAmount, p.currency)]);
  return `${[HEADER, ...rows].map((row) => row.join(',')).join('\n')}\n`;
}
