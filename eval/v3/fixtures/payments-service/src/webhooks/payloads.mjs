// The data of a payment event. Amounts are integers in minor units (see docs/webhooks.md).
export function paymentPayload(payment) {
  return {
    id: payment.id,
    currency: payment.currency,
    amount: payment.amount,
    status: payment.status,
    capturedAmount: payment.capturedAmount,
  };
}
