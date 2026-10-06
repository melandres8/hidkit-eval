import { isSupported } from '../money/currencies.mjs';
import { parseAmount } from '../money/format.mjs';
import { badRequest, notFound } from '../http/errors.mjs';

export function createPayment(ctx, { amount, currency }) {
  if (!isSupported(currency)) throw badRequest('unsupported currency');
  let minor;
  try {
    minor = parseAmount(amount, currency);
  } catch {
    throw badRequest('invalid amount');
  }
  if (minor <= 0) throw badRequest('amount must be positive');
  return ctx.payments.create({ amount: minor, currency });
}

export function getPayment(ctx, id) {
  const payment = ctx.payments.get(id);
  if (!payment) throw notFound('payment not found');
  return payment;
}
