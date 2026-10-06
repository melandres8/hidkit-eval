import { conflict } from '../http/errors.mjs';
import { paymentPayload } from '../webhooks/payloads.mjs';
import { getPayment } from './payments.mjs';

export function capturePayment(ctx, id) {
  const payment = getPayment(ctx, id);
  if (payment.status !== 'authorized') throw conflict('payment is not authorized');
  payment.status = 'captured';
  payment.capturedAmount = payment.amount;
  ctx.ledger.record({ type: 'capture', paymentId: payment.id, currency: payment.currency, amount: payment.amount });
  ctx.emitter.emit('payment.captured', paymentPayload(payment));
  return payment;
}
