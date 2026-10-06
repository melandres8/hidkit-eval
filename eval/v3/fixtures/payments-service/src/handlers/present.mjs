import { formatAmount } from '../money/format.mjs';

// The API shows amounts as decimal strings in major units.
export function presentPayment(payment) {
  return {
    id: payment.id,
    currency: payment.currency,
    amount: formatAmount(payment.amount, payment.currency),
    status: payment.status,
    capturedAmount: formatAmount(payment.capturedAmount, payment.currency),
  };
}
