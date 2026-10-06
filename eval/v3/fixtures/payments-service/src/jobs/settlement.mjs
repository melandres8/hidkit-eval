// Totals what the service pays out to merchants for each currency, in minor units.
export function runSettlement({ payments }) {
  const payouts = {};
  for (const payment of payments.list()) payouts[payment.currency] = (payouts[payment.currency] ?? 0) + payment.capturedAmount;
  return { payouts };
}
